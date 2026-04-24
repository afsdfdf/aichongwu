import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { DEFAULT_PROMPTS, getModelOption, getModelDefById, getProviderById, PROVIDERS, type ModelOption } from "@/lib/catalog";
import {
  buildObjectUrl,
  getS3Bucket,
  getS3Client,
  getS3PublicBaseUrl,
  uploadBufferToS3,
} from "@/lib/s3";
import { getDefaultShopDomain, slugifyProductType } from "@/lib/utils";
import {
  getRedisCache,
  setRedisCache,
  invalidateRedisCache,
} from "@/lib/redis-cache";
import type {
  AppState,
  PromptRecord,
  StoreSettingRecord,
  ProviderSecretRecord,
  ProviderRecord,
  ModelInstanceRecord,
  GenerationRecord,
  ImportedAssetRecord,
} from "@/lib/types";

// Re-export types for backward compatibility with consumers
export type {
  AppState,
  PromptRecord,
  StoreSettingRecord,
  ProviderSecretRecord,
  ProviderRecord,
  ModelInstanceRecord,
  GenerationRecord,
  ImportedAssetRecord,
};

type S3ObjectLite = {
  key: string;
  size: number;
  lastModified: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function getStateKey() {
  return process.env.S3_STATE_KEY || "system/app-state.json";
}

function createEmptyState(): AppState {
  return {
    version: 3,
    prompts: [],
    settings: [],
    providers: [],
    generations: [],
    importedAssets: [],
    updatedAt: nowIso(),
  };
}

function parseTimestampFromKey(key: string) {
  const match = key.match(/\/(\d+)-/);
  return match ? Number(match[1]) : null;
}

async function streamToString(stream: AsyncIterable<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// 鈹€鈹€ Encryption helpers 鈹€鈹€

function getCipherKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET. This is required to encrypt provider API keys.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCipherKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptSecret(value: string | null) {
  if (!value) return null;
  const [ivText, tagText, cipherText] = value.split(".");
  if (!ivText || !tagText || !cipherText) return null;

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getCipherKey(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherText, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// 鈹€鈹€ v2 鈫?v3 Migration 鈹€鈹€

function migrateV2ToV3(state: AppState): AppState {
  if (state.version === 3) return state;

  const v2Providers = state.providers as ProviderSecretRecord[];
  const providerMap = new Map<string, ProviderRecord>();

  for (const v2 of v2Providers) {
    const modelDef = getModelDefById(v2.key);
    const providerDefId = modelDef?.provider.id || "custom";
    const existing = providerMap.get(providerDefId);

    const modelRecord: ModelInstanceRecord = {
      id: v2.key,
      modelName: v2.modelName || modelDef?.model.modelName || v2.key,
      adapter: modelDef?.model.adapter || "custom",
      endpoint: v2.webhookUrl || (modelDef ? modelDef.model.defaultEndpoint : null),
      isEnabled: v2.isEnabled,
      priority: v2.priority,
      createdAt: v2.createdAt,
      updatedAt: v2.updatedAt,
    };

    if (existing) {
      existing.models.push(modelRecord);
      if (v2.apiKeyEncrypted) {
        existing.apiKeyEncrypted = v2.apiKeyEncrypted;
      }
      if (v2.baseUrl) {
        existing.baseUrl = v2.baseUrl;
      }
    } else {
      const providerDef = getProviderById(providerDefId);
      providerMap.set(providerDefId, {
        id: providerDefId,
        providerDefId,
        label: providerDef?.label || v2.label,
        apiKeyEncrypted: v2.apiKeyEncrypted,
        baseUrl: v2.baseUrl || providerDef?.defaultBaseUrl || null,
        isEnabled: true,
        createdAt: v2.createdAt,
        updatedAt: v2.updatedAt,
        models: [modelRecord],
      });
    }
  }

  return {
    ...state,
    version: 3,
    providers: [...providerMap.values()],
  };
}

// 鈹€鈹€ S3 Read / Write 鈹€鈹€

async function readStateFromS3(): Promise<AppState> {
  const cached = await getRedisCache();
  if (cached) return migrateV2ToV3(cached);

  const client = getS3Client();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: getStateKey(),
      }),
    );

    const body = response.Body;
    if (!body) return createEmptyState();
    const content = await streamToString(body as AsyncIterable<Uint8Array>);
    if (!content.trim()) return createEmptyState();
    const parsed = JSON.parse(content) as AppState;
    const state = migrateV2ToV3({
      ...createEmptyState(),
      ...parsed,
    });
    await setRedisCache(state);
    return state;
  } catch (error) {
    if (
      error instanceof NoSuchKey ||
      (error instanceof Error && "name" in error && error.name === "NoSuchKey")
    ) {
      return createEmptyState();
    }
    throw error;
  }
}

async function writeStateToS3(state: AppState) {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: getStateKey(),
      Body: JSON.stringify({ ...state, updatedAt: nowIso() }, null, 2),
      ContentType: "application/json; charset=utf-8",
    }),
  );
  await setRedisCache(state);
}

// 鈹€鈹€ Write mutex 鈹€鈹€
let writeQueue: Promise<AppState> | null = null;

async function mutateState(mutator: (state: AppState) => AppState | Promise<AppState>) {
  const run = async (): Promise<AppState> => {
    const state = await readStateFromS3();
    const nextState = await mutator(state);
    await writeStateToS3(nextState);
    return nextState;
  };

  writeQueue = writeQueue ? writeQueue.then(run, run) : run();
  return writeQueue;
}

async function listAllObjects(prefix: string) {
  const client = getS3Client();
  const items: S3ObjectLite[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: getS3Bucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    items.push(
      ...(response.Contents ?? []).map((item) => ({
        key: item.Key!,
        size: item.Size ?? 0,
        lastModified: item.LastModified?.toISOString() ?? null,
      })),
    );
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return items;
}

// 鈹€鈹€ Ensure defaults 鈹€鈹€

function ensureDefaultProviders(existing: ProviderRecord[]): ProviderRecord[] {
  const now = nowIso();
  const allowedProviderIds = new Set(["google", "custom"]);
  const defaults = PROVIDERS
    .filter((def) => allowedProviderIds.has(def.id))
    .map<ProviderRecord>((def) => ({
      id: def.id,
      providerDefId: def.id,
      label: def.label,
      apiKeyEncrypted: null,
    baseUrl: def.defaultBaseUrl || null,
    isEnabled: true,
    createdAt: now,
    updatedAt: now,
      models: def.models.map((m, idx) => ({
        id: m.id,
        modelName: m.modelName,
        adapter: m.adapter as string,
        endpoint: m.defaultEndpoint,
      isEnabled: true,
      priority: idx + 1,
      createdAt: now,
        updatedAt: now,
      })),
    }));

  for (const defDefault of defaults) {
    const existingProvider = existing.find((p) => p.providerDefId === defDefault.providerDefId);
    if (!existingProvider) {
      existing.push(defDefault);
    } else {
      for (const defModel of defDefault.models) {
        if (!existingProvider.models.some((m) => m.id === defModel.id)) {
          existingProvider.models.push(defModel);
        }
      }
    }
  }

  return existing.filter((provider) => allowedProviderIds.has(provider.providerDefId || provider.id));
}

function ensureDefaultSetting(shopDomain: string, existing?: StoreSettingRecord): StoreSettingRecord {
  const now = nowIso();
  return {
    shopDomain,
    activeModel: "gemini-3.1-flash-image",
    modelProvider: "google",
    modelApiKeyEncrypted: null,
    modelBaseUrl: "https://generativelanguage.googleapis.com",
    modelEndpoint: "/v1beta/models/gemini-3.1-flash-image-preview:generateContent",
    modelName: "gemini-3.1-flash-image-preview",
    modelAdapter: "gemini",
    requireGeneration: true,
    widgetAccentColor: "#2B473F",
    widgetButtonText: "Upload Your Pet Photo",
    createdAt: now,
    updatedAt: now,
    ...existing,
  };
}

export async function ensureStoreDefaults(shopDomain = getDefaultShopDomain()) {
  const state = await readStateFromS3();
  const v3State = migrateV2ToV3(state);
  const hasPrompts = v3State.prompts.some((item) => item.shopDomain === shopDomain);
  const hasSetting = v3State.settings.some((item) => item.shopDomain === shopDomain);
  const hasProviders = (v3State.providers as ProviderRecord[]).length >= PROVIDERS.length;

  if (hasPrompts && hasSetting && hasProviders && v3State.version === 3) return v3State;

  const updated = await mutateState((current) => {
    const v3 = migrateV2ToV3(current);
    const next = { ...v3, version: 3 as const };

    next.providers = ensureDefaultProviders([...(v3.providers as ProviderRecord[])]);

    if (!v3.prompts.some((item) => item.shopDomain === shopDomain)) {
      const now = nowIso();
      next.prompts = [
        ...v3.prompts,
        ...DEFAULT_PROMPTS.map((item) => ({
          id: randomUUID(),
          shopDomain,
          productType: item.productType,
          displayName: item.displayName,
          promptTemplate: item.promptTemplate,
          negativePrompt: null,
          aspectRatio: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })),
      ];
    }

    if (!v3.settings.some((item) => item.shopDomain === shopDomain)) {
      next.settings = [...v3.settings, ensureDefaultSetting(shopDomain)];
    }

    return next;
  });

  return updated;
}

// 鈹€鈹€ Public: get store context for UI 鈹€鈹€

export type ProviderSummary = {
  id: string;
  providerDefId: string;
  label: string;
  hasApiKey: boolean;
  baseUrl: string | null;
  isEnabled: boolean;
  models: Array<{
    id: string;
    modelName: string;
    adapter: string;
    endpoint: string | null;
    isEnabled: boolean;
    priority: number;
    option: ModelOption | null;
  }>;
};

export async function getStoreContext(shopDomain = getDefaultShopDomain()) {
  const state = await ensureStoreDefaults(shopDomain);

  const prompts = state.prompts
    .filter((item) => item.shopDomain === shopDomain)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const setting = ensureDefaultSetting(
    shopDomain,
    state.settings.find((item) => item.shopDomain === shopDomain),
  );

  const providers: ProviderSummary[] = ensureDefaultProviders(
    [...(state.providers as ProviderRecord[])],
  ).filter((p) => p.providerDefId === "google" || p.providerDefId === "custom" || p.id === "google" || p.id === "custom").map((p) => ({
    id: p.id,
    providerDefId: p.providerDefId,
    label: p.label,
    hasApiKey: Boolean(p.apiKeyEncrypted),
    baseUrl: p.baseUrl,
    isEnabled: p.isEnabled,
    models: p.models.map((m) => ({
      id: m.id,
      modelName: m.modelName,
      adapter: m.adapter,
      endpoint: m.endpoint,
      isEnabled: m.isEnabled,
      priority: m.priority,
      option: getModelOption(m.id),
    })),
  }));

  const importedAssets = state.importedAssets.sort((a, b) => b.importedAt.localeCompare(a.importedAt));

  return { prompts, setting, providers, importedAssets };
}

// 鈹€鈹€ Prompt CRUD 鈹€鈹€

export async function resolvePromptForProduct(input: { shopDomain: string; productType: string }) {
  const { prompts } = await getStoreContext(input.shopDomain);
  const normalized = slugifyProductType(input.productType || "frame");

  return (
    prompts.find((item) => item.productType === normalized && item.isActive) ||
    prompts.find(
      (item) =>
        item.isActive && (normalized.includes(item.productType) || item.productType.includes(normalized)),
    ) ||
    prompts.find((item) => item.isActive) ||
    null
  );
}

export async function savePromptRecord(input: {
  id?: string;
  shopDomain: string;
  productType: string;
  displayName: string;
  promptTemplate: string;
  negativePrompt: string | null;
  aspectRatio: string | null;
  isActive: boolean;
}) {
  await ensureStoreDefaults(input.shopDomain);
  await mutateState((state) => {
    const now = nowIso();
    const existing = state.prompts.find(
      (item) =>
        (input.id && item.id === input.id) ||
        (item.shopDomain === input.shopDomain && item.productType === input.productType),
    );

    const record: PromptRecord = {
      id: existing?.id ?? randomUUID(),
      shopDomain: input.shopDomain,
      productType: input.productType,
      displayName: input.displayName,
      promptTemplate: input.promptTemplate,
      negativePrompt: input.negativePrompt,
      aspectRatio: input.aspectRatio,
      isActive: input.isActive,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    return {
      ...state,
      prompts: [
        ...state.prompts.filter((item) => item.id !== existing?.id),
        record,
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  });
}

export async function deletePromptRecord(id: string) {
  await mutateState((state) => ({
    ...state,
    prompts: state.prompts.filter((item) => item.id !== id),
  }));
}

// 鈹€鈹€ Store settings 鈹€鈹€

export async function saveStoreSettingRecord(input: {
  shopDomain: string;
  activeModel: string;
  modelProvider?: "google" | "custom";
  modelApiKey?: string;
  keepExistingModelApiKey?: boolean;
  modelBaseUrl?: string | null;
  modelEndpoint?: string | null;
  modelName?: string | null;
  modelAdapter?: string | null;
  requireGeneration: boolean;
  widgetAccentColor: string;
  widgetButtonText: string;
}) {
  await ensureStoreDefaults(input.shopDomain);
  await mutateState((state) => {
    const current = state.settings.find((item) => item.shopDomain === input.shopDomain);
    const next: StoreSettingRecord = {
      shopDomain: input.shopDomain,
      activeModel: input.activeModel,
      modelProvider: input.modelProvider ?? current?.modelProvider ?? "google",
      modelApiKeyEncrypted:
        typeof input.modelApiKey === "string" && input.modelApiKey.trim()
          ? encryptSecret(input.modelApiKey.trim())
          : input.keepExistingModelApiKey
            ? current?.modelApiKeyEncrypted ?? null
            : current?.modelApiKeyEncrypted ?? null,
      modelBaseUrl:
        input.modelBaseUrl !== undefined ? input.modelBaseUrl : current?.modelBaseUrl ?? "https://generativelanguage.googleapis.com",
      modelEndpoint:
        input.modelEndpoint !== undefined
          ? input.modelEndpoint
          : current?.modelEndpoint ?? "/v1beta/models/gemini-3.1-flash-image-preview:generateContent",
      modelName:
        input.modelName !== undefined ? input.modelName : current?.modelName ?? "gemini-3.1-flash-image-preview",
      modelAdapter:
        input.modelAdapter !== undefined ? input.modelAdapter : current?.modelAdapter ?? "gemini",
      requireGeneration: input.requireGeneration,
      widgetAccentColor: input.widgetAccentColor,
      widgetButtonText: input.widgetButtonText,
      createdAt: current?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    return {
      ...state,
      settings: [
        ...state.settings.filter((item) => item.shopDomain !== input.shopDomain),
        next,
      ],
    };
  });
}

// 鈹€鈹€ Provider config save (v3) 鈹€鈹€

export async function saveProviderRecord(input: {
  providerId: string;
  apiKey?: string;
  keepExistingApiKey?: boolean;
  baseUrl?: string | null;
  models?: Array<{
    id: string;
    modelName: string;
    endpoint?: string | null;
    isEnabled?: boolean;
    priority?: number;
  }>;
}) {
  await mutateState((state) => {
    const v3 = migrateV2ToV3(state);
    const now = nowIso();
    const providers = ensureDefaultProviders([...(v3.providers as ProviderRecord[])]);
    let target = providers.find((p) => p.id === input.providerId);

    if (!target) {
      const def = getProviderById(input.providerId);
      target = {
        id: input.providerId,
        providerDefId: input.providerId,
        label: def?.label || input.providerId,
        apiKeyEncrypted: null,
        baseUrl: input.baseUrl || def?.defaultBaseUrl || null,
        isEnabled: true,
        createdAt: now,
        updatedAt: now,
        models: def?.models.map((m, idx) => ({
          id: m.id,
          modelName: m.modelName,
          adapter: m.adapter as string,
          endpoint: m.defaultEndpoint,
          isEnabled: true,
          priority: idx + 1,
          createdAt: now,
          updatedAt: now,
        })) || [],
      };
      providers.push(target);
    }

    const nextApiKey =
      typeof input.apiKey === "string" && input.apiKey.trim()
        ? encryptSecret(input.apiKey.trim())
        : input.keepExistingApiKey
          ? target.apiKeyEncrypted
          : null;

    target.apiKeyEncrypted = nextApiKey;
    target.baseUrl = input.baseUrl === undefined ? target.baseUrl : input.baseUrl;
    target.updatedAt = now;

    if (input.models) {
      for (const modelUpdate of input.models) {
        const existing = target.models.find((m) => m.id === modelUpdate.id);
        if (existing) {
          existing.modelName = modelUpdate.modelName || existing.modelName;
          existing.endpoint = modelUpdate.endpoint === undefined ? existing.endpoint : modelUpdate.endpoint;
          existing.isEnabled = modelUpdate.isEnabled ?? existing.isEnabled;
          existing.priority = modelUpdate.priority ?? existing.priority;
          existing.updatedAt = now;
        } else {
          const modelDef = getModelDefById(modelUpdate.id);
          target.models.push({
            id: modelUpdate.id,
            modelName: modelUpdate.modelName || modelDef?.model.modelName || modelUpdate.id,
            adapter: modelDef?.model.adapter as string || "custom",
            endpoint: modelUpdate.endpoint || modelDef?.model.defaultEndpoint || null,
            isEnabled: modelUpdate.isEnabled ?? true,
            priority: modelUpdate.priority ?? target.models.length + 1,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return { ...v3, version: 3 as const, providers };
  });
}

// 鈹€鈹€ Backward-compatible: saveProviderConfigs (v2 style) 鈹€鈹€

export async function saveProviderConfigs(
  updates: Array<{
    key: string;
    label: string;
    apiKey?: string;
    keepExistingApiKey?: boolean;
    webhookUrl?: string | null;
    baseUrl?: string | null;
    modelName?: string | null;
    isEnabled?: boolean;
    priority?: number;
  }>,
) {
  const byProvider = new Map<string, typeof updates>();

  for (const update of updates) {
    const modelDef = getModelDefById(update.key);
    const providerId = modelDef?.provider.id || "custom";
    if (!byProvider.has(providerId)) byProvider.set(providerId, []);
    byProvider.get(providerId)!.push(update);
  }

  for (const [providerId, providerUpdates] of byProvider) {
    const first = providerUpdates[0];
    await saveProviderRecord({
      providerId,
      apiKey: first.apiKey,
      keepExistingApiKey: first.keepExistingApiKey,
      baseUrl: first.baseUrl,
      models: providerUpdates.map((u) => ({
        id: u.key,
        modelName: u.modelName || u.key,
        endpoint: u.webhookUrl,
        isEnabled: u.isEnabled,
        priority: u.priority,
      })),
    });
  }
}

// 鈹€鈹€ Get provider configs (for AI backend) 鈹€鈹€

export async function getProviderConfigs() {
  const { setting } = await getStoreContext();
  return [
    {
      key: setting.activeModel,
      label: `${setting.modelProvider} / ${setting.activeModel}`,
      apiKeyEncrypted: setting.modelApiKeyEncrypted,
      webhookUrl: setting.modelEndpoint,
      baseUrl: setting.modelBaseUrl,
      modelName: setting.modelName || setting.activeModel,
      isEnabled: true,
      priority: 1,
      option: getModelOption(setting.activeModel),
      hasApiKey: Boolean(setting.modelApiKeyEncrypted),
      providerId: setting.modelProvider,
      adapter: setting.modelAdapter || "custom",
    },
  ];
}

// Internal-only: returns decrypted API key for backend AI calls
export async function getProviderConfigWithKey(key: string) {
  const { setting } = await getStoreContext();
  if (key !== setting.activeModel) return null;
  const baseUrl = setting.modelBaseUrl || "";
  const endpoint = setting.modelEndpoint || "";
  const fullEndpoint = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
  return {
    key: setting.activeModel,
    label: `${setting.modelProvider} / ${setting.activeModel}`,
    apiKeyEncrypted: setting.modelApiKeyEncrypted,
    apiKey: decryptSecret(setting.modelApiKeyEncrypted),
    webhookUrl: setting.modelEndpoint,
    baseUrl: setting.modelBaseUrl,
    modelName: setting.modelName || setting.activeModel,
    isEnabled: true,
    priority: 1,
    option: getModelOption(setting.activeModel),
    hasApiKey: Boolean(setting.modelApiKeyEncrypted),
    providerId: setting.modelProvider,
    providerDefId: setting.modelProvider,
    adapter: setting.modelAdapter || "custom",
    fullEndpoint,
  };
}

export async function getProviderConfigByKey(key: string) {
  return getProviderConfigWithKey(key);
}

// 鈹€鈹€ Generation records 鈹€鈹€

export async function createGenerationRecord(input: Omit<GenerationRecord, "id" | "createdAt" | "updatedAt">) {
  const record: GenerationRecord = {
    id: randomUUID(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...input,
  };

  await mutateState((state) => ({
    ...state,
    generations: [record, ...state.generations].slice(0, 2500),
  }));

  return record;
}

export async function listGenerationRecords(shopDomain: string) {
  const state = await readStateFromS3();
  return state.generations
    .filter((item) => item.shopDomain === shopDomain)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getGenerationRecordById(generationId: string, shopDomain?: string) {
  const state = await readStateFromS3();
  return (
    state.generations.find(
      (item) => item.id === generationId && (!shopDomain || item.shopDomain === shopDomain),
    ) ?? null
  );
}

export async function updateGenerationResultData(input: {
  generationId: string;
  shopDomain: string;
  sourceImageUrl?: string;
  outputImageUrl?: string;
  promptUsed?: string;
  modelUsed?: string;
  status: string;
  metadata?: Record<string, unknown> | null;
}) {
  let updated = false;

  await mutateState((state) => ({
    ...state,
    generations: state.generations.map((item) =>
      item.id === input.generationId && item.shopDomain === input.shopDomain
        ? ((updated = true), {
            ...item,
            sourceImageUrl: input.sourceImageUrl ?? item.sourceImageUrl,
            outputImageUrl: input.outputImageUrl ?? item.outputImageUrl,
            promptUsed: input.promptUsed ?? item.promptUsed,
            modelUsed: input.modelUsed ?? item.modelUsed,
            status: input.status,
            metadata: input.metadata === undefined ? item.metadata : input.metadata,
            updatedAt: nowIso(),
          })
        : item,
    ),
  }));

  return updated;
}

export async function updateGenerationStatus(input: {
  generationId: string;
  shopDomain: string;
  status: string;
  designConfirmedAt?: string | null;
}) {
  let updated = false;

  await mutateState((state) => ({
    ...state,
    generations: state.generations.map((item) =>
      item.id === input.generationId && item.shopDomain === input.shopDomain
        ? ((updated = true), {
            ...item,
            status: input.status,
            designConfirmedAt:
              input.designConfirmedAt === undefined ? item.designConfirmedAt : input.designConfirmedAt,
            updatedAt: nowIso(),
          })
        : item,
    ),
  }));

  return updated;
}

export async function updateGenerationOrderData(input: {
  generationId: string;
  shopDomain: string;
  orderId: string | null;
  orderNumber: string | null;
  orderName: string | null;
  customerEmail: string | null;
  customerId: string | null;
  status: string;
}) {
  let updated = false;

  await mutateState((state) => ({
    ...state,
    generations: state.generations.map((item) =>
      item.id === input.generationId && item.shopDomain === input.shopDomain
        ? ((updated = true), {
            ...item,
            orderId: input.orderId,
            orderNumber: input.orderNumber,
            orderName: input.orderName,
            customerEmail: input.customerEmail,
            customerId: input.customerId,
            status: input.status,
            updatedAt: nowIso(),
          })
        : item,
    ),
  }));

  return updated;
}

export async function listImportedAssets() {
  const state = await readStateFromS3();
  return state.importedAssets.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export async function importExistingBucketAssets(input: { prefix?: string; maxKeys?: number }) {
  const client = getS3Client();
  const prefix = input.prefix?.trim() || "";
  const maxKeys = Math.min(Math.max(input.maxKeys ?? 50, 1), 500);
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: getS3Bucket(),
      Prefix: prefix || undefined,
      MaxKeys: maxKeys,
    }),
  );

  const objects =
    response.Contents?.filter((item) => item.Key && !item.Key.startsWith("system/")).map((item) => ({
      key: item.Key!,
      url: buildObjectUrl(item.Key!),
      size: item.Size ?? 0,
      lastModified: item.LastModified?.toISOString() ?? null,
      importedAt: nowIso(),
    })) ?? [];

  await mutateState((state) => {
    const merged = new Map<string, ImportedAssetRecord>();
    for (const item of state.importedAssets) merged.set(item.key, item);
    for (const item of objects) merged.set(item.key, item);

    return {
      ...state,
      importedAssets: [...merged.values()].sort((a, b) => b.importedAt.localeCompare(a.importedAt)),
    };
  });

  return objects;
}

export async function syncHistoricalGenerationsFromBucket(shopDomain = getDefaultShopDomain()) {
  const [originals, results] = await Promise.all([listAllObjects("originals/"), listAllObjects("results/")]);

  const sortedOriginals = originals
    .map((item) => ({ ...item, ts: parseTimestampFromKey(item.key) }))
    .filter((item): item is S3ObjectLite & { ts: number } => item.ts !== null)
    .sort((a, b) => a.ts - b.ts);

  const sortedResults = results
    .map((item) => ({ ...item, ts: parseTimestampFromKey(item.key) }))
    .filter((item): item is S3ObjectLite & { ts: number } => item.ts !== null)
    .sort((a, b) => a.ts - b.ts);

  const matchedRecords: GenerationRecord[] = [];
  let originalIndex = 0;
  const dayMs = 1000 * 60 * 60 * 24;

  for (const result of sortedResults) {
    while (
      originalIndex + 1 < sortedOriginals.length &&
      sortedOriginals[originalIndex + 1].ts <= result.ts
    ) {
      originalIndex += 1;
    }

    const original = sortedOriginals[originalIndex];
    if (!original) continue;
    if (result.ts - original.ts > dayMs || result.ts < original.ts) continue;

    const createdAt = new Date(result.ts).toISOString();
    matchedRecords.push({
      id: `legacy-${result.ts}-${result.key.split("/").pop()?.split(".")[0] ?? randomUUID()}`,
      shopDomain,
      productType: "legacy-import",
      productTitle: "鍘嗗彶瀵煎叆璁板綍",
      shopifyProductId: null,
      shopifyVariantId: null,
      customerEmail: null,
      customerId: null,
      sourceImageUrl: buildObjectUrl(original.key),
      outputImageUrl: buildObjectUrl(result.key),
      promptUsed: "Imported from existing S3 originals/results history",
      modelUsed: "legacy-s3-import",
      orderId: null,
      orderName: null,
      orderNumber: null,
      status: "imported",
      designConfirmedAt: null,
      metadata: {
        imported: true,
        originalKey: original.key,
        resultKey: result.key,
        originalSize: original.size,
        resultSize: result.size,
        matchedBy: "timestamp-nearest-previous-original",
        diffMs: result.ts - original.ts,
      },
      createdAt,
      updatedAt: createdAt,
    });

    originalIndex += 1;
  }

  const state = await mutateState((current) => {
    const existingByOutputUrl = new Map(current.generations.map((item) => [item.outputImageUrl, item]));
    for (const record of matchedRecords) {
      if (!existingByOutputUrl.has(record.outputImageUrl)) {
        existingByOutputUrl.set(record.outputImageUrl, record);
      }
    }

    return {
      ...current,
      generations: [...existingByOutputUrl.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  });

  return {
    imported: matchedRecords.filter(
      (record) => state.generations.find((item) => item.outputImageUrl === record.outputImageUrl)?.id === record.id,
    ).length,
    totalHistoricalPairs: matchedRecords.length,
    totalGenerations: state.generations.length,
  };
}

export async function uploadJsonToS3StateFolder(fileName: string, data: unknown) {
  const payload = Buffer.from(JSON.stringify(data, null, 2), "utf8");
  return uploadBufferToS3({
    buffer: payload,
    folder: "system",
    fileName,
    contentType: "application/json; charset=utf-8",
  });
}

export function getS3Summary() {
  return {
    bucket: getS3Bucket(),
    publicBaseUrl: getS3PublicBaseUrl(),
    stateKey: getStateKey(),
  };
}

/** Force-refresh: clear Redis, pull fresh from S3, update Redis. Called by Vercel Cron. */
export async function forceRefreshCache() {
  await invalidateRedisCache();
  const fresh = await readStateFromS3();
  return fresh;
}

export async function pruneProvidersToGoogleAndCustom() {
  await mutateState((state) => {
    const v3 = migrateV2ToV3(state);
    const allowed = new Set(["google", "custom"]);
    const providers = ensureDefaultProviders([...(v3.providers as ProviderRecord[])]).filter(
      (provider) => allowed.has(provider.providerDefId || provider.id),
    );

    const shopDomain = getDefaultShopDomain();
    const currentSetting = ensureDefaultSetting(
      shopDomain,
      v3.settings.find((item) => item.shopDomain === shopDomain),
    );

    const activeModelStillExists = providers.some((provider) =>
      provider.models.some((model) => model.id === currentSetting.activeModel),
    );

    const nextSettings = v3.settings.map((item) =>
      item.shopDomain === shopDomain
        ? {
            ...item,
            activeModel: activeModelStillExists ? item.activeModel : "gemini-3.1-flash-image",
            updatedAt: nowIso(),
          }
        : item,
    );

    return {
      ...v3,
      version: 3,
      providers,
      settings: nextSettings,
    };
  });
}
