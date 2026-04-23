import { getDefaultShopDomain } from "@/lib/utils";
import {
  savePromptRecord,
  saveProviderRecord,
  saveStoreSettingRecord,
} from "@/lib/store";
import type {
  ConnectionRecord,
  EffectivePrompt,
  LegacySyncResult,
  RoutePolicyRecord,
  SystemSetting,
} from "@/lib/config-center/types";
import { decryptSecret } from "@/lib/config-center/crypto";

export async function syncSystemSettingToBucket(
  setting: SystemSetting,
  route: RoutePolicyRecord | null,
  activeModelKey: string | null,
): Promise<LegacySyncResult> {
  const shopDomain = setting.shopifyStoreDomain || getDefaultShopDomain();
  await saveStoreSettingRecord({
    shopDomain,
    activeModel: activeModelKey || route?.primaryConnectionId || "gpt-image-1",
    requireGeneration: setting.requireGenerationBeforeAddToCart,
    widgetAccentColor: setting.widgetAccentColor,
    widgetButtonText: setting.widgetButtonText,
  });

  return {
    syncedToBucket: true,
    message: "system setting synced to legacy S3 state",
  };
}

export async function syncConnectionToBucket(connection: ConnectionRecord): Promise<LegacySyncResult> {
  await saveProviderRecord({
    providerId: connection.legacyProviderId,
    apiKey: decryptSecret(connection.encryptedSecret) || undefined,
    keepExistingApiKey: !connection.encryptedSecret,
    baseUrl: connection.baseUrl,
    models: [
      {
        id: connection.modelCode,
        modelName: connection.modelDisplayName,
        endpoint: connection.endpointPath || connection.submitUrl || null,
        isEnabled: connection.enabled,
        priority: connection.priority,
      },
    ],
  });

  return {
    syncedToBucket: true,
    message: `connection ${connection.id} synced to legacy provider store`,
  };
}

export async function syncPromptToBucket(prompt: EffectivePrompt): Promise<LegacySyncResult> {
  const shopDomain = getDefaultShopDomain();
  await savePromptRecord({
    id: prompt.template.id,
    shopDomain,
    productType: prompt.template.productType,
    displayName: prompt.version.displayName,
    promptTemplate: prompt.version.promptTemplate,
    negativePrompt: prompt.version.negativePrompt,
    aspectRatio: prompt.version.aspectRatio,
    isActive: prompt.version.isActive,
  });

  return {
    syncedToBucket: true,
    message: `prompt ${prompt.template.id}@${prompt.version.version} synced to legacy prompt store`,
  };
}
