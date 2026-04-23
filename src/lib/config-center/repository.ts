import { randomUUID } from "node:crypto";
import { getModelDefById } from "@/lib/catalog";
import {
  getStoreContext,
  resolvePromptForProduct,
  saveProviderRecord,
  saveStoreSettingRecord,
} from "@/lib/store";
import { getDefaultShopDomain, slugifyProductType } from "@/lib/utils";
import { encryptSecret } from "@/lib/config-center/crypto";
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

function nowIso() {
  return new Date().toISOString();
}

function getRouteId(productType = "*") {
  return productType === "*" ? "legacy-default-route" : `legacy-route-${productType}`;
}

function makeSyntheticBinding(routePolicyId: string, templateId: string): PromptBindingRecord {
  const now = nowIso();
  return {
    id: `binding-${routePolicyId}-${templateId}`,
    routePolicyId,
    templateId,
    publishedVersion: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getEffectiveSystemSetting(): Promise<SystemSetting> {
  const { setting } = await getStoreContext(getDefaultShopDomain());
  return {
    id: "system",
    appDomain: process.env.NEXT_PUBLIC_APP_URL || "",
    shopifyStoreDomain: getDefaultShopDomain(),
    apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    widgetAccentColor: setting.widgetAccentColor,
    widgetButtonText: setting.widgetButtonText,
    requireGenerationBeforeAddToCart: setting.requireGeneration,
    defaultRouteId: getRouteId(),
    maxSourceImageSizeMB: 10,
    defaultExecutionMode: "sync",
    updatedAt: setting.updatedAt,
    updatedBy: null,
  };
}

export async function upsertSystemSetting(input: Partial<SystemSetting> & { updatedBy?: string | null }) {
  const current = await getEffectiveSystemSetting();
  const { setting } = await getStoreContext(current.shopifyStoreDomain);
  const next: SystemSetting = {
    ...current,
    ...input,
    id: "system",
    updatedAt: nowIso(),
    updatedBy: input.updatedBy ?? current.updatedBy ?? null,
  };

  await saveStoreSettingRecord({
    shopDomain: next.shopifyStoreDomain,
    activeModel: setting.activeModel,
    requireGeneration: next.requireGenerationBeforeAddToCart,
    widgetAccentColor: next.widgetAccentColor,
    widgetButtonText: next.widgetButtonText,
  });

  return next;
}

function toConnectionId(providerId: string, modelCode: string) {
  return `${providerId}:${modelCode}`;
}

export async function listConnections(): Promise<ConnectionRecord[]> {
  const { providers } = await getStoreContext(getDefaultShopDomain());
  return providers.flatMap((provider) =>
    provider.models.map((model) => ({
      id: toConnectionId(provider.id, model.id),
      name: `${provider.label} / ${model.id}`,
      providerKind: provider.baseUrl ? "openai_compatible" : "vendor_native",
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
      metadata: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })),
  );
}

export async function getConnectionById(id: string) {
  const list = await listConnections();
  return list.find((item) => item.id === id || item.modelCode === id) ?? null;
}

export async function upsertConnection(input: Partial<ConnectionRecord> & { secret?: string | null }) {
  const current = input.id ? await getConnectionById(input.id) : null;
  const modelCode = input.modelCode || current?.modelCode || "gpt-image-1";
  const providerMeta = getModelDefById(modelCode);
  const providerId = input.legacyProviderId || current?.legacyProviderId || providerMeta?.provider.id || "custom";
  const now = nowIso();

  const next: ConnectionRecord = {
    id: input.id || current?.id || toConnectionId(providerId, modelCode),
    name: input.name || current?.name || `${providerId} / ${modelCode}`,
    providerKind: input.providerKind || current?.providerKind || "openai_compatible",
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
    metadata: input.metadata !== undefined ? input.metadata : current?.metadata ?? null,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };

  await saveProviderRecord({
    providerId,
    apiKey: input.secret === undefined ? undefined : input.secret || undefined,
    keepExistingApiKey: input.secret === undefined,
    baseUrl: next.baseUrl,
    models: [
      {
        id: next.modelCode,
        modelName: next.modelDisplayName,
        endpoint: next.endpointPath || next.submitUrl,
        isEnabled: next.enabled,
        priority: next.priority,
      },
    ],
  });

  return next;
}

export async function listRoutePolicies(): Promise<RoutePolicyRecord[]> {
  const { setting } = await getStoreContext(getDefaultShopDomain());
  return [
    {
      id: getRouteId(),
      name: "Legacy Default Route",
      scene: "generate",
      productType: "*",
      enabled: true,
      primaryConnectionId: setting.activeModel,
      fallbackConnectionIds: [],
      promptBindingId: null,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    },
  ];
}

export async function getRouteById(id: string) {
  const routes = await listRoutePolicies();
  return routes.find((item) => item.id === id) ?? null;
}

export async function getEffectiveRoute(scene: RoutePolicyRecord["scene"], productType: string): Promise<EffectiveRoute | null> {
  const routes = await listRoutePolicies();
  const connections = await listConnections();
  const normalized = slugifyProductType(productType || "*");
  const route =
    routes.find((item) => item.enabled && item.scene === scene && item.productType === normalized) ||
    routes.find((item) => item.enabled && item.scene === scene && item.productType === "*") ||
    routes[0] ||
    null;

  if (!route) return null;

  const primary = connections.find((item) => item.id === route.primaryConnectionId || item.modelCode === route.primaryConnectionId);
  if (!primary) return null;

  return {
    route,
    primary,
    fallbacks: [],
  };
}

export async function upsertRoutePolicy(input: Partial<RoutePolicyRecord>) {
  const current = (await listRoutePolicies())[0];
  const next: RoutePolicyRecord = {
    id: input.id || current?.id || getRouteId(input.productType || "*"),
    name: input.name || current?.name || "Legacy Default Route",
    scene: input.scene || current?.scene || "generate",
    productType: input.productType || current?.productType || "*",
    enabled: input.enabled ?? current?.enabled ?? true,
    primaryConnectionId: input.primaryConnectionId || current?.primaryConnectionId || "gpt-image-1",
    fallbackConnectionIds: [],
    promptBindingId: input.promptBindingId ?? current?.promptBindingId ?? null,
    createdAt: current?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  const settings = await getEffectiveSystemSetting();
  await saveStoreSettingRecord({
    shopDomain: settings.shopifyStoreDomain,
    activeModel: next.primaryConnectionId,
    requireGeneration: settings.requireGenerationBeforeAddToCart,
    widgetAccentColor: settings.widgetAccentColor,
    widgetButtonText: settings.widgetButtonText,
  });

  return next;
}

export async function listPromptTemplates(): Promise<PromptTemplateRecord[]> {
  const { prompts } = await getStoreContext(getDefaultShopDomain());
  return prompts.map((item) => ({
    id: item.id,
    name: item.displayName,
    productType: item.productType,
    scene: "generate",
    status: item.isActive ? "published" : "draft",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

export async function listPromptVersions(templateId: string): Promise<PromptVersionRecord[]> {
  const { prompts } = await getStoreContext(getDefaultShopDomain());
  const prompt = prompts.find((item) => item.id === templateId);
  if (!prompt) return [];

  return [
    {
      id: `${prompt.id}:1`,
      templateId: prompt.id,
      version: 1,
      displayName: prompt.displayName,
      promptTemplate: prompt.promptTemplate,
      negativePrompt: prompt.negativePrompt,
      aspectRatio: prompt.aspectRatio,
      isActive: prompt.isActive,
      createdAt: prompt.updatedAt,
    },
  ];
}

export async function listPromptBindings(): Promise<PromptBindingRecord[]> {
  const templates = await listPromptTemplates();
  return templates
    .filter((item) => item.status === "published")
    .map((item) => makeSyntheticBinding(getRouteId(item.productType), item.id));
}

export async function upsertPromptTemplate(input: Partial<PromptTemplateRecord>) {
  const templates = await listPromptTemplates();
  const current = input.id ? templates.find((item) => item.id === input.id) : null;
  const now = nowIso();

  return {
    id: input.id || current?.id || randomUUID(),
    name: input.name || current?.name || "Untitled Prompt",
    productType: input.productType || current?.productType || "*",
    scene: input.scene || current?.scene || "generate",
    status: input.status || current?.status || "draft",
    createdAt: current?.createdAt || now,
    updatedAt: now,
  } satisfies PromptTemplateRecord;
}

export async function createPromptVersion(input: {
  templateId: string;
  displayName: string;
  promptTemplate: string;
  negativePrompt?: string | null;
  aspectRatio?: string | null;
  isActive?: boolean;
}) {
  return {
    id: `${input.templateId}:1`,
    templateId: input.templateId,
    version: 1,
    displayName: input.displayName,
    promptTemplate: input.promptTemplate,
    negativePrompt: input.negativePrompt ?? null,
    aspectRatio: input.aspectRatio ?? null,
    isActive: input.isActive ?? true,
    createdAt: nowIso(),
  } satisfies PromptVersionRecord;
}

export async function publishPromptVersion(input: { templateId: string; routePolicyId: string; version: number }) {
  return makeSyntheticBinding(input.routePolicyId, input.templateId);
}

export async function resolveEffectivePrompt(input: {
  scene: PromptTemplateRecord["scene"];
  productType: string;
  routePolicyId?: string | null;
}): Promise<EffectivePrompt | null> {
  const prompt = await resolvePromptForProduct({
    shopDomain: getDefaultShopDomain(),
    productType: input.productType,
  });
  if (!prompt) return null;

  return {
    template: {
      id: prompt.id,
      name: prompt.displayName,
      productType: prompt.productType,
      scene: input.scene,
      status: prompt.isActive ? "published" : "draft",
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    },
    version: {
      id: `${prompt.id}:1`,
      templateId: prompt.id,
      version: 1,
      displayName: prompt.displayName,
      promptTemplate: prompt.promptTemplate,
      negativePrompt: prompt.negativePrompt,
      aspectRatio: prompt.aspectRatio,
      isActive: prompt.isActive,
      createdAt: prompt.updatedAt,
    },
    binding: input.routePolicyId ? makeSyntheticBinding(input.routePolicyId, prompt.id) : null,
  };
}

export function exposeSecret(record: ConnectionRecord) {
  return {
    ...record,
    secret: null as string | null,
  };
}
