"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import {
  removePromptTemplate,
  saveConnection,
  savePromptTemplateWithVersion,
  saveRoutePolicy,
  saveSystemSettings,
} from "@/lib/config-center/service";
import {
  getStoreContext,
  importExistingBucketAssets,
  syncHistoricalGenerationsFromBucket,
} from "@/lib/store";
import { formatDateTimeISO, getDefaultShopDomain, slugifyProductType } from "@/lib/utils";

type ActionState = { ok: boolean; message: string };

export async function savePromptAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminSession();

  const id = String(formData.get("id") || "");
  const productType = slugifyProductType(String(formData.get("productType") || ""));
  const displayName = String(formData.get("displayName") || "").trim();
  const promptTemplate = String(formData.get("promptTemplate") || "").trim();
  const negativePrompt = String(formData.get("negativePrompt") || "").trim();
  const aspectRatio = String(formData.get("aspectRatio") || "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!productType || !displayName || !promptTemplate) {
    return { ok: false, message: "请完整填写商品类型、显示名称和提示词。" };
  }

  await savePromptTemplateWithVersion({
    templateId: id || undefined,
    name: displayName,
    productType,
    displayName,
    promptTemplate,
    negativePrompt: negativePrompt || null,
    aspectRatio: aspectRatio || null,
    publish: isActive,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/prompts");
  revalidatePath("/admin/install");

  return {
    ok: true,
    message: `已保存到 ${getDefaultShopDomain()} / ${productType} / ${formatDateTimeISO(new Date())}`,
  };
}

export async function deletePromptAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminSession();
  const id = String(formData.get("id") || "");
  if (id) {
    await removePromptTemplate(id);
  }
  revalidatePath("/admin/prompts");
  revalidatePath("/admin");
  return { ok: true, message: id ? `已删除 ${id}` : "" };
}

export async function saveStoreSettingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminSession();

  const { setting, providers } = await getStoreContext(getDefaultShopDomain());

  const providerId = String(formData.get("providerId") || "").trim();
  const activeModel = String(formData.get("activeModel") || setting.activeModel || "gpt-image-1");
  const apiKey = String(formData.get("apiKey") || "");
  const baseUrl = String(formData.get("baseUrl") || "").trim();
  const widgetAccentColor = String(formData.get("widgetAccentColor") || setting.widgetAccentColor || "#2563eb");
  const widgetButtonText = String(formData.get("widgetButtonText") || setting.widgetButtonText || "Upload Your Pet Photo");

  await saveSystemSettings({
    shopifyStoreDomain: getDefaultShopDomain(),
    widgetAccentColor,
    widgetButtonText,
    requireGenerationBeforeAddToCart: setting.requireGeneration,
  });

  if (providerId) {
    const provider = providers.find((item) => item.id === providerId || item.providerDefId === providerId);

    if (provider) {
      for (const model of provider.models) {
        await saveConnection({
          id: `${provider.id}:${model.id}`,
          legacyProviderId: provider.id,
          modelCode: model.id,
          modelDisplayName: model.modelName,
          endpointPath: model.endpoint,
          enabled: model.isEnabled,
          priority: model.priority,
          baseUrl: baseUrl || provider.baseUrl || null,
          secret: apiKey || undefined,
        });
      }
    }

    await saveRoutePolicy({
      id: "generate:*",
      name: "Default Generate Route",
      scene: "generate",
      productType: "*",
      enabled: true,
      primaryConnectionId: activeModel,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/install");
    return {
      ok: true,
      message: `${providerId} 配置已保存，并同步默认路由。`,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/install");
  return { ok: true, message: "设置已保存。" };
}

export async function importBucketAssetsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminSession();

  const prefix = String(formData.get("prefix") || "").trim();
  const maxKeys = Number(formData.get("maxKeys") || 50);
  const imported = await importExistingBucketAssets({
    prefix,
    maxKeys,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/install");
  return {
    ok: true,
    message: `已从 S3 导入 ${imported.length} 个对象${prefix ? `（prefix: ${prefix}）` : ""}。`,
  };
}

export async function syncHistoryAction(): Promise<ActionState> {
  await requireAdminSession();
  const result = await syncHistoricalGenerationsFromBucket(getDefaultShopDomain());

  revalidatePath("/admin");
  revalidatePath("/admin/generations");
  return {
    ok: true,
    message: `历史同步完成：扫描到 ${result.totalHistoricalPairs} 对原图/效果图，当前后台共 ${result.totalGenerations} 条记录。`,
  };
}
