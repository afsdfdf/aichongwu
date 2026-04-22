// Shared types for app state — imported by both store.ts and redis-cache.ts
// Avoids circular dependency when redis-cache only needs the type.

// ── Provider + Model Instance (new, v3 state) ──

export type ProviderRecord = {
  id: string; // e.g. "openai", "stability", "custom-1"
  providerDefId: string; // maps to PROVIDERS[].id in catalog.ts
  label: string; // display name
  apiKeyEncrypted: string | null;
  baseUrl: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  models: ModelInstanceRecord[];
};

export type ModelInstanceRecord = {
  id: string; // e.g. "gpt-image-1", "dall-e-3" — matches ModelDefinition.id
  modelName: string; // the actual model ID sent to the API
  adapter: string; // ModelAdapter value
  endpoint: string | null; // relative path or full URL override
  isEnabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

// ── Legacy types (v2 state, for migration) ──

export type PromptRecord = {
  id: string;
  shopDomain: string;
  productType: string;
  displayName: string;
  promptTemplate: string;
  negativePrompt: string | null;
  aspectRatio: string | null;
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
  designConfirmedAt: string | null;
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

// ── App State ──

export type AppState = {
  version: 2 | 3;
  prompts: PromptRecord[];
  settings: StoreSettingRecord[];
  providers: ProviderSecretRecord[] | ProviderRecord[]; // v2 = flat, v3 = nested
  generations: GenerationRecord[];
  importedAssets: ImportedAssetRecord[];
  updatedAt: string;
};
