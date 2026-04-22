"use server";

import { revalidatePath } from "next/cache";
import { getProviderById } from "@/lib/catalog";
import { requireAdminSession } from "@/lib/auth";
import {
  deletePromptRecord,
  getStoreContext,
  importExistingBucketAssets,
  savePromptRecord,
  saveProviderRecord,
  saveStoreSettingRecord,
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
    return { ok: false, message: "请完整填写产品类型、显示名称和提示词。" };
  }

  await savePromptRecord({
    id: id || undefined,
    shopDomain: getDefaultShopDomain(),
    productType,
    displayName,
    promptTemplate,
    negativePrompt: negativePrompt || null,
    aspectRatio: aspectRatio || null,
    isActive,
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
    await deletePromptRecord(id);
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

  const { setting } = await getStoreContext(getDefaultShopDomain());

  const providerId = String(formData.get("providerId") || "").trim();
  const activeModel = String(formData.get("activeModel") || setting.activeModel || "gpt-image-1");
  const apiKey = String(formData.get("apiKey") || "");
  const baseUrl = String(formData.get("baseUrl") || "").trim();
  const widgetAccentColor = String(formData.get("widgetAccentColor") || setting.widgetAccentColor || "#2563eb");
  const widgetButtonText = String(formData.get("widgetButtonText") || setting.widgetButtonText || "生成效果图");

  await saveStoreSettingRecord({
    shopDomain: getDefaultShopDomain(),
    activeModel,
    requireGeneration: setting.requireGeneration,
    widgetAccentColor,
    widgetButtonText,
  });

  if (providerId) {
    const providerDef = getProviderById(providerId);
    const label = providerDef?.label || providerId;

    const models: Array<{
      id: string;
      modelName: string;
      endpoint: string | null;
      isEnabled: boolean;
      priority: number;
    }> = [];

    for (const [key, value] of formData.entries()) {
      const match = key.match(/^model_(.+)_modelName$/);
      if (!match) continue;

      const modelId = match[1];
      const modelName = String(value || "").trim();
      const endpoint = String(formData.get(`model_${modelId}_endpoint`) || "").trim() || null;
      const priority = Math.max(1, Number(formData.get(`model_${modelId}_priority`) || 1));

      if (modelName) {
        models.push({ id: modelId, modelName, endpoint, isEnabled: true, priority });
      }
    }

    await saveProviderRecord({
      providerId,
      apiKey,
      keepExistingApiKey: !apiKey.trim(),
      baseUrl: baseUrl || null,
      models: models.length > 0 ? models : undefined,
    });

    const modelCount = models.length || providerDef?.models.length || 0;
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/install");
    return {
      ok: true,
      message: `${label} 配置已保存（${modelCount} 个模型）。`,
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
