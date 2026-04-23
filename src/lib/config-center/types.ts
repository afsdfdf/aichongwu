export type ConnectionKind =
  | "openai_official"
  | "openai_compatible"
  | "vendor_native"
  | "custom_webhook_sync"
  | "custom_webhook_async";

export type AuthScheme = "bearer" | "x-api-key" | "basic" | "custom-headers" | "none";

export interface SystemSetting {
  id: "system";
  appDomain: string;
  shopifyStoreDomain: string;
  apiBaseUrl: string;
  widgetAccentColor: string;
  widgetButtonText: string;
  requireGenerationBeforeAddToCart: boolean;
  defaultRouteId: string | null;
  maxSourceImageSizeMB: number;
  defaultExecutionMode: "sync" | "async";
  updatedAt: string;
  updatedBy?: string | null;
}

export interface ConnectionRecord {
  id: string;
  name: string;
  providerKind: ConnectionKind;
  legacyProviderId: string;
  enabled: boolean;
  priority: number;
  authScheme: AuthScheme;
  encryptedSecret: string | null;
  baseUrl: string | null;
  submitUrl: string | null;
  statusUrlTemplate: string | null;
  modelCode: string;
  modelDisplayName: string;
  adapter: string;
  operationMode: "sync" | "async";
  endpointPath: string | null;
  customHeaders: Record<string, string> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutePolicyRecord {
  id: string;
  name: string;
  scene: "generate" | "process" | "admin_test";
  productType: string | "*";
  enabled: boolean;
  primaryConnectionId: string;
  fallbackConnectionIds: string[];
  promptBindingId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplateRecord {
  id: string;
  name: string;
  productType: string | "*";
  scene: "generate" | "process" | "admin_test";
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersionRecord {
  id: string;
  templateId: string;
  version: number;
  displayName: string;
  promptTemplate: string;
  negativePrompt: string | null;
  aspectRatio: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PromptBindingRecord {
  id: string;
  routePolicyId: string;
  templateId: string;
  publishedVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface EffectivePrompt {
  template: PromptTemplateRecord;
  version: PromptVersionRecord;
  binding: PromptBindingRecord | null;
}

export interface EffectiveRoute {
  route: RoutePolicyRecord;
  primary: ConnectionRecord;
  fallbacks: ConnectionRecord[];
}

export interface LegacySyncResult {
  syncedToBucket: boolean;
  message: string;
}
