import { randomUUID } from "node:crypto";
import { GetObjectCommand, NoSuchKey, PutObjectCommand } from "@aws-sdk/client-s3";
import { getModelDefById } from "@/lib/catalog";
import { getStoreContext, resolvePromptForProduct } from "@/lib/store";
import { getS3Bucket, getS3Client } from "@/lib/s3";
import { getDefaultShopDomain, slugifyProductType } from "@/lib/utils";
import { decryptSecret, encryptSecret } from "@/lib/config-center/crypto";
import type {
  ConnectionRecord,
  EffectivePrompt,
  EffectiveRoute,
  PromptBindingRecord,
  PromptTemplateRecord,
  PromptVersionRecord,
  RoutePolicyRecord,
  SystemSetting,
} from "@/lib/config-center/types";

type ConfigCenterState = {
  version: 1;
  settings: SystemSetting;
  connections: ConnectionRecord[];
  routes: RoutePolicyRecord[];
  templates: PromptTemplateRecord[];
  versions: PromptVersionRecord[];
  bindings: PromptBindingRecord[];
};

function nowIso() {
  return new Date().toISOString();
}

function getConfigStateKey() {
  return process.env.CONFIG_CENTER_STATE_KEY || "system/config-center-state.json";
}

async function streamToString(stream: AsyncIterable<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function inferProviderKind(baseUrl: string | null, providerId: string) {
  if (providerId === "openai" && (!baseUrl || baseUrl === "https://api.openai.com/v1")) {
    return "openai_official" as const;
  }
  if (baseUrl) {
    return "openai_compatible" as const;
  }
  return "vendor_native" as const;
}

function toConnectionId(providerId: string, modelCode: string) {
  return `${providerId}:${modelCode}`;
}

function routeId(scene: RoutePolicyRecord["scene"], productType: string) {
  return `${scene}:${productType}`;
}

function normalizeProductType(productType: string | undefined | null) {
  const normalized = slugifyProductType(productType || "*");
  return normalized || "*";
}

function makeBinding(routePolicyId: string, templateId: string, version: number, createdAt?: string): PromptBindingRecord {
  const timestamp = createdAt || nowIso();
  return {
    id: `binding:${routePolicyId}:${templateId}`,
    routePolicyId,
    templateId,
    publishedVersion: version,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function legacyMetadataHasSecret(connection: ConnectionRecord) {
  return Boolean(connection.metadata && connection.metadata.hasLegacySecret === true);
}

async function bootstrapFromLegacy(): Promise<ConfigCenterState> {
  const shopDomain = getDefaultShopDomain();
  const { setting, prompts, providers } = await getStoreContext(shopDomain);
  const timestamp = nowIso();

  const connections: ConnectionRecord[] = providers.flatMap((provider) =>
    provider.models.map((model) => ({
      id: toConnectionId(provider.id, model.id),
      name: `${provider.label} / ${model.id}`,
      providerKind: inferProviderKind(provider.baseUrl, provider.providerDefId),
      legacyProviderId: provider.providerDefId,
      enabled: provider.isEnabled && model.isEnabled,
      priority: model.priority,
      authScheme: "bearer",
      encryptedSecret: null,
      baseUrl: provider.baseUrl,
      submitUrl: null,
      statusUrlTemplate: null,
      modelCode: model.id,
      modelDisplayName: model.modelName,
      adapter: model.adapter,
      operationMode: "sync",
      endpointPath: model.endpoint,
      customHeaders: null,
      metadata: { hasLegacySecret: provider.hasApiKey },
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  );

  const defaultConnection =
    connections.find((item) => item.modelCode === setting.activeModel) ||
    connections.find((item) => item.enabled) ||
    connections[0] ||
    null;

  const routes: RoutePolicyRecord[] = [
    {
      id: routeId("generate", "*"),
      name: "Default Generate Route",
      scene: "generate",
      productType: "*",
      enabled: true,
      primaryConnectionId: defaultConnection?.id || setting.activeModel || "gpt-image-1",
      fallbackConnectionIds: [],
      promptBindingId: null,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    },
    {
      id: routeId("process", "*"),
      name: "Default Process Route",
      scene: "process",
      productType: "*",
      enabled: true,
      primaryConnectionId: defaultConnection?.id || setting.activeModel || "gpt-image-1",
      fallbackConnectionIds: [],
      promptBindingId: null,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    },
    {
      id: routeId("admin_test", "*"),
      name: "Default Admin Test Route",
      scene: "admin_test",
      productType: "*",
      enabled: true,
      primaryConnectionId: defaultConnection?.id || setting.activeModel || "gpt-image-1",
      fallbackConnectionIds: [],
      promptBindingId: null,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    },
  ];

  const templates: PromptTemplateRecord[] = [];
  const versions: PromptVersionRecord[] = [];
  const bindings: PromptBindingRecord[] = [];

  for (const prompt of prompts) {
    const productType = normalizeProductType(prompt.productType);
    const template: PromptTemplateRecord = {
      id: prompt.id,
      name: prompt.displayName,
      productType,
      scene: "generate",
      status: prompt.isActive ? "published" : "draft",
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };
    templates.push(template);

    versions.push({
      id: `${prompt.id}:1`,
      templateId: prompt.id,
      version: 1,
      displayName: prompt.displayName,
      promptTemplate: prompt.promptTemplate,
      negativePrompt: prompt.negativePrompt,
      aspectRatio: prompt.aspectRatio,
      isActive: prompt.isActive,
      createdAt: prompt.updatedAt,
    });

    const perProductRouteId = routeId("generate", productType);
    if (!routes.some((item) => item.id === perProductRouteId)) {
      routes.push({
        id: perProductRouteId,
        name: `Generate Route / ${productType}`,
        scene: "generate",
        productType,
        enabled: true,
        primaryConnectionId: defaultConnection?.id || setting.activeModel || "gpt-image-1",
        fallbackConnectionIds: [],
        promptBindingId: null,
        createdAt: prompt.createdAt,
        updatedAt: prompt.updatedAt,
      });
    }

    if (prompt.isActive) {
      const binding = makeBinding(perProductRouteId, prompt.id, 1, prompt.updatedAt);
      bindings.push(binding);
      routes.forEach((route) => {
        if (route.id === perProductRouteId) {
          route.promptBindingId = binding.id;
        }
      });
    }
  }

  return {
    version: 1,
    settings: {
      id: "system",
      appDomain: process.env.NEXT_PUBLIC_APP_URL || "",
      shopifyStoreDomain: shopDomain,
      apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL || "",
      widgetAccentColor: setting.widgetAccentColor,
      widgetButtonText: setting.widgetButtonText,
      requireGenerationBeforeAddToCart: setting.requireGeneration,
      defaultRouteId: routeId("generate", "*"),
      maxSourceImageSizeMB: 10,
      defaultExecutionMode: "sync",
      updatedAt: setting.updatedAt,
      updatedBy: null,
    },
    connections,
    routes,
    templates,
    versions,
    bindings,
  };
}

async function readConfigState(): Promise<ConfigCenterState> {
  const client = getS3Client();
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: getConfigStateKey(),
      }),
    );

    const body = response.Body;
    if (!body) return bootstrapFromLegacy();
    const content = await streamToString(body as AsyncIterable<Uint8Array>);
    if (!content.trim()) return bootstrapFromLegacy();
    return JSON.parse(content) as ConfigCenterState;
  } catch (error) {
    if (
      error instanceof NoSuchKey ||
      (error instanceof Error && "name" in error && error.name === "NoSuchKey")
    ) {
      const state = await bootstrapFromLegacy();
      await writeConfigState(state);
      return state;
    }
    throw error;
  }
}

async function writeConfigState(state: ConfigCenterState) {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: getConfigStateKey(),
      Body: JSON.stringify(state, null, 2),
      ContentType: "application/json; charset=utf-8",
    }),
  );
}

async function mutateConfigState(mutator: (state: ConfigCenterState) => ConfigCenterState | Promise<ConfigCenterState>) {
  const current = await readConfigState();
  const next = await mutator(current);
  await writeConfigState(next);
  return next;
}

function latestVersionForTemplate(state: ConfigCenterState, templateId: string) {
  return state.versions
    .filter((item) => item.templateId === templateId)
    .sort((a, b) => b.version - a.version)[0] ?? null;
}

function findConnectionState(state: ConfigCenterState, idOrModelCode: string | null | undefined) {
  if (!idOrModelCode) return null;
  return state.connections.find((item) => item.id === idOrModelCode || item.modelCode === idOrModelCode) ?? null;
}

function normalizeRouteConnectionRefs(state: ConfigCenterState, route: RoutePolicyRecord): RoutePolicyRecord {
  const primary = findConnectionState(state, route.primaryConnectionId);
  return {
    ...route,
    primaryConnectionId: primary?.id || route.primaryConnectionId,
    fallbackConnectionIds: route.fallbackConnectionIds
      .map((id) => findConnectionState(state, id)?.id)
      .filter((value): value is string => Boolean(value)),
  };
}

export async function getEffectiveSystemSetting(): Promise<SystemSetting> {
  const state = await readConfigState();
  return state.settings;
}

export async function upsertSystemSetting(input: Partial<SystemSetting> & { updatedBy?: string | null }) {
  const nextState = await mutateConfigState((state) => ({
    ...state,
    settings: {
      ...state.settings,
      ...input,
      id: "system",
      updatedAt: nowIso(),
      updatedBy: input.updatedBy ?? state.settings.updatedBy ?? null,
    },
  }));
  return nextState.settings;
}

export async function listConnections(): Promise<ConnectionRecord[]> {
  const state = await readConfigState();
  return [...state.connections].sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
}

export async function getConnectionById(id: string) {
  const state = await readConfigState();
  return findConnectionState(state, id);
}

export async function upsertConnection(input: Partial<ConnectionRecord> & { secret?: string | null }) {
  const state = await readConfigState();
  const current = input.id ? findConnectionState(state, input.id) : null;
  const modelCode = input.modelCode || current?.modelCode || "gpt-image-1";
  const providerMeta = getModelDefById(modelCode);
  const providerId = input.legacyProviderId || current?.legacyProviderId || providerMeta?.provider.id || "custom";
  const now = nowIso();

  const next: ConnectionRecord = {
    id: current?.id || input.id || toConnectionId(providerId, modelCode),
    name: input.name || current?.name || `${providerId} / ${modelCode}`,
    providerKind: input.providerKind || current?.providerKind || inferProviderKind(input.baseUrl ?? current?.baseUrl ?? providerMeta?.provider.defaultBaseUrl ?? null, providerId),
    legacyProviderId: providerId,
    enabled: input.enabled ?? current?.enabled ?? true,
    priority: input.priority ?? current?.priority ?? 1,
    authScheme: input.authScheme || current?.authScheme || "bearer",
    encryptedSecret:
      input.secret !== undefined
        ? encryptSecret(input.secret)
        : input.encryptedSecret !== undefined
          ? input.encryptedSecret
          : current?.encryptedSecret ?? null,
    baseUrl: input.baseUrl !== undefined ? input.baseUrl : current?.baseUrl ?? providerMeta?.provider.defaultBaseUrl ?? null,
    submitUrl: input.submitUrl !== undefined ? input.submitUrl : current?.submitUrl ?? null,
    statusUrlTemplate:
      input.statusUrlTemplate !== undefined ? input.statusUrlTemplate : current?.statusUrlTemplate ?? null,
    modelCode,
    modelDisplayName: input.modelDisplayName || current?.modelDisplayName || providerMeta?.model.modelName || modelCode,
    adapter: input.adapter || current?.adapter || providerMeta?.model.adapter || "custom",
    operationMode: input.operationMode || current?.operationMode || "sync",
    endpointPath:
      input.endpointPath !== undefined ? input.endpointPath : current?.endpointPath ?? providerMeta?.model.defaultEndpoint ?? null,
    customHeaders: input.customHeaders !== undefined ? input.customHeaders : current?.customHeaders ?? null,
    metadata: {
      ...(current?.metadata ?? {}),
      ...(input.metadata ?? {}),
      hasLegacySecret:
        input.secret !== undefined
          ? Boolean(input.secret)
          : current?.metadata?.hasLegacySecret === true,
    },
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };

  await mutateConfigState((draft) => ({
    ...draft,
    connections: [
      ...draft.connections.filter((item) => item.id !== next.id),
      next,
    ].sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt)),
    routes: draft.routes.map((route) => normalizeRouteConnectionRefs({ ...draft, connections: [...draft.connections.filter((item) => item.id !== next.id), next] }, route)),
  }));

  return next;
}

export async function deleteConnection(id: string) {
  const state = await mutateConfigState((draft) => {
    const target = findConnectionState(draft, id);
    if (!target) return draft;
    const remaining = draft.connections.filter((item) => item.id !== target.id);
    const fallbackConnection = remaining.find((item) => item.enabled) || remaining[0] || null;
    return {
      ...draft,
      connections: remaining,
      routes: draft.routes.map((route) => ({
        ...route,
        primaryConnectionId:
          route.primaryConnectionId === target.id || route.primaryConnectionId === target.modelCode
            ? fallbackConnection?.id || route.primaryConnectionId
            : route.primaryConnectionId,
        fallbackConnectionIds: route.fallbackConnectionIds.filter((item) => item !== target.id && item !== target.modelCode),
      })),
    };
  });

  return findConnectionState(state, id);
}

export async function listRoutePolicies(): Promise<RoutePolicyRecord[]> {
  const state = await readConfigState();
  return [...state.routes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getRouteById(id: string) {
  const state = await readConfigState();
  return state.routes.find((item) => item.id === id) ?? null;
}

export async function getEffectiveRoute(scene: RoutePolicyRecord["scene"], productType: string): Promise<EffectiveRoute | null> {
  const state = await readConfigState();
  const normalized = normalizeProductType(productType);
  const route =
    state.routes.find((item) => item.enabled && item.scene === scene && item.productType === normalized) ||
    state.routes.find((item) => item.enabled && item.scene === scene && item.productType === "*") ||
    null;

  if (!route) return null;

  const primary = findConnectionState(state, route.primaryConnectionId);
  if (!primary) return null;

  return {
    route,
    primary,
    fallbacks: route.fallbackConnectionIds
      .map((id) => findConnectionState(state, id))
      .filter((item): item is ConnectionRecord => Boolean(item)),
  };
}

export async function upsertRoutePolicy(input: Partial<RoutePolicyRecord>) {
  const state = await readConfigState();
  const current = input.id ? state.routes.find((item) => item.id === input.id) : undefined;
  const now = nowIso();
  const normalizedProductType = normalizeProductType(input.productType || current?.productType || "*");
  const primary = findConnectionState(state, input.primaryConnectionId || current?.primaryConnectionId || state.settings.defaultRouteId || "gpt-image-1");

  const next: RoutePolicyRecord = {
    id: input.id || current?.id || routeId(input.scene || current?.scene || "generate", normalizedProductType),
    name: input.name || current?.name || `Route / ${input.scene || current?.scene || "generate"} / ${normalizedProductType}`,
    scene: input.scene || current?.scene || "generate",
    productType: normalizedProductType,
    enabled: input.enabled ?? current?.enabled ?? true,
    primaryConnectionId: primary?.id || input.primaryConnectionId || current?.primaryConnectionId || "gpt-image-1",
    fallbackConnectionIds:
      (input.fallbackConnectionIds || current?.fallbackConnectionIds || [])
        .map((id) => findConnectionState(state, id)?.id)
        .filter((value): value is string => Boolean(value)),
    promptBindingId: input.promptBindingId ?? current?.promptBindingId ?? null,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };

  await mutateConfigState((draft) => ({
    ...draft,
    routes: [...draft.routes.filter((item) => item.id !== next.id), next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    settings: {
      ...draft.settings,
      defaultRouteId:
        next.scene === "generate" && next.productType === "*" ? next.id : draft.settings.defaultRouteId,
      updatedAt: now,
    },
  }));

  return next;
}

export async function listPromptTemplates(): Promise<PromptTemplateRecord[]> {
  const state = await readConfigState();
  return [...state.templates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listPromptVersions(templateId: string): Promise<PromptVersionRecord[]> {
  const state = await readConfigState();
  return state.versions
    .filter((item) => item.templateId === templateId)
    .sort((a, b) => b.version - a.version);
}

export async function listPromptBindings(): Promise<PromptBindingRecord[]> {
  const state = await readConfigState();
  return [...state.bindings].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertPromptTemplate(input: Partial<PromptTemplateRecord>) {
  const state = await readConfigState();
  const current = input.id ? state.templates.find((item) => item.id === input.id) : undefined;
  const now = nowIso();
  const next: PromptTemplateRecord = {
    id: input.id || current?.id || randomUUID(),
    name: input.name || current?.name || "Untitled Prompt",
    productType: normalizeProductType(input.productType || current?.productType || "*"),
    scene: input.scene || current?.scene || "generate",
    status: input.status || current?.status || "draft",
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };

  await mutateConfigState((draft) => ({
    ...draft,
    templates: [...draft.templates.filter((item) => item.id !== next.id), next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  }));

  return next;
}

export async function createPromptVersion(input: {
  templateId: string;
  displayName: string;
  promptTemplate: string;
  negativePrompt?: string | null;
  aspectRatio?: string | null;
  isActive?: boolean;
}) {
  const state = await readConfigState();
  const nextVersion = (latestVersionForTemplate(state, input.templateId)?.version || 0) + 1;
  const next: PromptVersionRecord = {
    id: `${input.templateId}:${nextVersion}`,
    templateId: input.templateId,
    version: nextVersion,
    displayName: input.displayName,
    promptTemplate: input.promptTemplate,
    negativePrompt: input.negativePrompt ?? null,
    aspectRatio: input.aspectRatio ?? null,
    isActive: input.isActive ?? true,
    createdAt: nowIso(),
  };

  await mutateConfigState((draft) => ({
    ...draft,
    versions: [...draft.versions.filter((item) => item.id !== next.id), next].sort((a, b) => b.version - a.version),
  }));

  return next;
}

export async function publishPromptVersion(input: { templateId: string; routePolicyId: string; version: number }) {
  const now = nowIso();
  const nextState = await mutateConfigState((draft) => {
    const current = draft.bindings.find((item) => item.routePolicyId === input.routePolicyId);
    const nextBinding: PromptBindingRecord = {
      id: current?.id || `binding:${input.routePolicyId}:${input.templateId}`,
      routePolicyId: input.routePolicyId,
      templateId: input.templateId,
      publishedVersion: input.version,
      createdAt: current?.createdAt || now,
      updatedAt: now,
    };

    return {
      ...draft,
      templates: draft.templates.map((template) =>
        template.id === input.templateId
          ? { ...template, status: "published", updatedAt: now }
          : template,
      ),
      bindings: [...draft.bindings.filter((item) => item.routePolicyId !== input.routePolicyId), nextBinding],
      routes: draft.routes.map((route) =>
        route.id === input.routePolicyId
          ? { ...route, promptBindingId: nextBinding.id, updatedAt: now }
          : route,
      ),
    };
  });

  return nextState.bindings.find((item) => item.routePolicyId === input.routePolicyId) ?? null;
}

export async function deletePromptTemplate(templateId: string) {
  await mutateConfigState((draft) => ({
    ...draft,
    templates: draft.templates.filter((item) => item.id !== templateId),
    versions: draft.versions.filter((item) => item.templateId !== templateId),
    bindings: draft.bindings.filter((item) => item.templateId !== templateId),
    routes: draft.routes.map((route) =>
      route.promptBindingId && draft.bindings.some((binding) => binding.id === route.promptBindingId && binding.templateId === templateId)
        ? { ...route, promptBindingId: null, updatedAt: nowIso() }
        : route,
    ),
  }));
}

export async function resolveEffectivePrompt(input: {
  scene: PromptTemplateRecord["scene"];
  productType: string;
  routePolicyId?: string | null;
}): Promise<EffectivePrompt | null> {
  const state = await readConfigState();
  const normalized = normalizeProductType(input.productType);

  const route =
    (input.routePolicyId ? state.routes.find((item) => item.id === input.routePolicyId) : undefined) ||
    state.routes.find((item) => item.enabled && item.scene === input.scene && item.productType === normalized) ||
    state.routes.find((item) => item.enabled && item.scene === input.scene && item.productType === "*") ||
    null;

  const binding =
    (route?.promptBindingId ? state.bindings.find((item) => item.id === route.promptBindingId) : undefined) ||
    (route ? state.bindings.find((item) => item.routePolicyId === route.id) : undefined) ||
    null;

  if (binding) {
    const template = state.templates.find((item) => item.id === binding.templateId);
    const version = state.versions.find(
      (item) => item.templateId === binding.templateId && item.version === binding.publishedVersion,
    );
    if (template && version) {
      return { template, version, binding };
    }
  }

  const template =
    state.templates.find((item) => item.scene === input.scene && item.productType === normalized && item.status === "published") ||
    state.templates.find((item) => item.scene === input.scene && item.productType === "*" && item.status === "published") ||
    null;

  if (template) {
    const version = latestVersionForTemplate(state, template.id);
    if (version) {
      return { template, version, binding: null };
    }
  }

  const legacyPrompt = await resolvePromptForProduct({
    shopDomain: getDefaultShopDomain(),
    productType: normalized,
  });

  if (!legacyPrompt) return null;
  return {
    template: {
      id: legacyPrompt.id,
      name: legacyPrompt.displayName,
      productType: legacyPrompt.productType,
      scene: input.scene,
      status: legacyPrompt.isActive ? "published" : "draft",
      createdAt: legacyPrompt.createdAt,
      updatedAt: legacyPrompt.updatedAt,
    },
    version: {
      id: `${legacyPrompt.id}:1`,
      templateId: legacyPrompt.id,
      version: 1,
      displayName: legacyPrompt.displayName,
      promptTemplate: legacyPrompt.promptTemplate,
      negativePrompt: legacyPrompt.negativePrompt,
      aspectRatio: legacyPrompt.aspectRatio,
      isActive: legacyPrompt.isActive,
      createdAt: legacyPrompt.updatedAt,
    },
    binding: null,
  };
}

export function exposeSecret(record: ConnectionRecord) {
  let secret: string | null = null;
  try {
    secret = decryptSecret(record.encryptedSecret);
  } catch {
    secret = null;
  }

  return {
    ...record,
    secret,
    metadata: {
      ...(record.metadata ?? {}),
      hasLegacySecret: legacyMetadataHasSecret(record),
    },
  };
}
