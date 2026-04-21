import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { DEFAULT_PROMPTS, getModelOption, MODEL_OPTIONS } from "@/lib/catalog";
import {
  buildObjectUrl,
  getS3Bucket,
  getS3Client,
  getS3PublicBaseUrl,
  uploadBufferToS3,
} from "@/lib/s3";
import { getDefaultShopDomain, slugifyProductType } from "@/lib/utils";

export type PromptRecord = {
  id: string;
  shopDomain: string;
  productType: string;
  displayName: string;
  promptTemplate: string;
  negativePrompt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoreSettingRecord = {
  shopDomain: string;
  activeModel: string;
  requireGeneration: boolean;
  widgetAccentColor: string;
  widgetButtonText: string;
  createdAt: string;
  updatedAt: string;
};

export type ProviderSecretRecord = {
  key: string;
  label: string;
  apiKeyEncrypted: string | null;
  webhookUrl: string | null;
  baseUrl: string | null;
  modelName: string | null;
  isEnabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type GenerationRecord = {
  id: string;
  shopDomain: string;
  productType: string;
  productTitle: string | null;
  shopifyProductId: string | null;
  shopifyVariantId: string | null;
  customerEmail: string | null;
  customerId: string | null;
  sourceImageUrl: string;
  outputImageUrl: string;
  promptUsed: string;
  modelUsed: string;
  orderId: string | null;
  orderName: string | null;
  orderNumber: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportedAssetRecord = {
  key: string;
  url: string;
  size: number;
  lastModified: string | null;
  importedAt: string;
};

type S3ObjectLite = {
  key: string;
  size: number;
  lastModified: string | null;
};

type AppState = {
  version: 2;
  prompts: PromptRecord[];
  settings: StoreSettingRecord[];
  providers: ProviderSecretRecord[];
  generations: GenerationRecord[];
  importedAssets: ImportedAssetRecord[];
  updatedAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function getStateKey() {
  return process.env.S3_STATE_KEY || "system/app-state.json";
}

function createEmptyState(): AppState {
  return {
    version: 2,
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

async function readStateFromS3(): Promise<AppState> {
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
    return {
      ...createEmptyState(),
      ...parsed,
    };
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
}

async function mutateState(mutator: (state: AppState) => AppState | Promise<AppState>) {
  const state = await readStateFromS3();
  const nextState = await mutator(state);
  await writeStateToS3(nextState);
  return nextState;
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

function ensureDefaultProviders(existing: ProviderSecretRecord[]) {
  const now = nowIso();
  const defaults = MODEL_OPTIONS.map<ProviderSecretRecord>((item) => ({
    key: item.key,
    label: item.label,
    apiKeyEncrypted: null,
    webhookUrl: item.defaultEndpoint || null,
    baseUrl: null,
    modelName: item.modelName,
    isEnabled: true,
    priority: MODEL_OPTIONS.findIndex((option) => option.key === item.key) + 1,
    createdAt: now,
    updatedAt: now,
  }));

  return defaults.map((item) => existing.find((provider) => provider.key === item.key) ?? item);
}

function ensureDefaultSetting(shopDomain: string, existing?: StoreSettingRecord): StoreSettingRecord {
  const now = nowIso();
  return (
    existing ?? {
      shopDomain,
      activeModel: MODEL_OPTIONS[0].key,
      requireGeneration: true,
      widgetAccentColor: "#0ea5e9",
      widgetButtonText: "生成效果图",
      createdAt: now,
      updatedAt: now,
    }
  );
}

export async function ensureStoreDefaults(shopDomain = getDefaultShopDomain()) {
  const state = await readStateFromS3();
  const hasPrompts = state.prompts.some((item) => item.shopDomain === shopDomain);
  const hasSetting = state.settings.some((item) => item.shopDomain === shopDomain);
  const hasProviders = state.providers.length >= MODEL_OPTIONS.length;

  if (hasPrompts && hasSetting && hasProviders) return;

  await mutateState((current) => {
    const next = { ...current };
    next.providers = ensureDefaultProviders(current.providers);

    if (!current.prompts.some((item) => item.shopDomain === shopDomain)) {
      const now = nowIso();
      next.prompts = [
        ...current.prompts,
        ...DEFAULT_PROMPTS.map((item) => ({
          id: randomUUID(),
          shopDomain,
          productType: item.productType,
          displayName: item.displayName,
          promptTemplate: item.promptTemplate,
          negativePrompt: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })),
      ];
    }

    if (!current.settings.some((item) => item.shopDomain === shopDomain)) {
      next.settings = [...current.settings, ensureDefaultSetting(shopDomain)];
    }

    return next;
  });
}

export async function getStoreContext(shopDomain = getDefaultShopDomain()) {
  await ensureStoreDefaults(shopDomain);
  const state = await readStateFromS3();

  const prompts = state.prompts
    .filter((item) => item.shopDomain === shopDomain)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const setting = ensureDefaultSetting(
    shopDomain,
    state.settings.find((item) => item.shopDomain === shopDomain),
  );
  const providers = ensureDefaultProviders(state.providers).map((item) => ({
    option: getModelOption(item.key),
    key: item.key,
    label: item.label,
    webhookUrl: item.webhookUrl,
    baseUrl: item.baseUrl,
    modelName: item.modelName || getModelOption(item.key)?.modelName || "",
    isEnabled: item.isEnabled,
    priority: item.priority,
    hasApiKey: Boolean(item.apiKeyEncrypted),
  }));
  const importedAssets = state.importedAssets.sort((a, b) => b.importedAt.localeCompare(a.importedAt));

  return { prompts, setting, providers, importedAssets };
}

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

export async function saveStoreSettingRecord(input: {
  shopDomain: string;
  activeModel: string;
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
  await mutateState((state) => {
    const now = nowIso();
    const providers = ensureDefaultProviders(state.providers).map((provider) => {
      const update = updates.find((item) => item.key === provider.key);
      if (!update) return provider;

      const nextApiKey =
        typeof update.apiKey === "string" && update.apiKey.trim()
          ? encryptSecret(update.apiKey.trim())
          : update.keepExistingApiKey
            ? provider.apiKeyEncrypted
            : null;

      return {
        ...provider,
        label: update.label,
        apiKeyEncrypted: nextApiKey,
        webhookUrl: update.webhookUrl === undefined ? provider.webhookUrl : update.webhookUrl,
        baseUrl: update.baseUrl === undefined ? provider.baseUrl : update.baseUrl,
        modelName: update.modelName === undefined ? provider.modelName : update.modelName,
        isEnabled: update.isEnabled ?? provider.isEnabled,
        priority: update.priority ?? provider.priority,
        updatedAt: now,
      };
    });

    return {
      ...state,
      providers,
    };
  });
}

export async function getProviderConfigs() {
  const state = await readStateFromS3();
  return ensureDefaultProviders(state.providers).map((item) => ({
    ...item,
    option: getModelOption(item.key),
    apiKey: decryptSecret(item.apiKeyEncrypted),
    hasApiKey: Boolean(item.apiKeyEncrypted),
  })).sort((a, b) => a.priority - b.priority);
}

export async function getProviderConfigByKey(key: string) {
  const providers = await getProviderConfigs();
  return providers.find((item) => item.key === key) ?? null;
}

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
  await mutateState((state) => ({
    ...state,
    generations: state.generations.map((item) =>
      item.id === input.generationId && item.shopDomain === input.shopDomain
        ? {
            ...item,
            orderId: input.orderId,
            orderNumber: input.orderNumber,
            orderName: input.orderName,
            customerEmail: input.customerEmail,
            customerId: input.customerId,
            status: input.status,
            updatedAt: nowIso(),
          }
        : item,
    ),
  }));
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
      productTitle: "历史导入记录",
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
