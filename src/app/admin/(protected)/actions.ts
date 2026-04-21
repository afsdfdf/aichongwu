"use server";

import { revalidatePath } from "next/cache";
import { getModelOption, MODEL_OPTIONS } from "@/lib/catalog";
import { requireAdminSession } from "@/lib/auth";
import {
  deletePromptRecord,
  importExistingBucketAssets,
  savePromptRecord,
  saveProviderConfigs,
  saveStoreSettingRecord,
  syncHistoricalGenerationsFromBucket,
} from "@/lib/store";
import { getDefaultShopDomain, slugifyProductType } from "@/lib/utils";

type ActionState = { ok: boolean; message: string };

export async function savePromptAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminSession();

  const id = String(formData.get("id") || "");
  const productType = slugifyProductType(String(formData.get("productType") || ""));
  const displayName = String(formData.get("displayName") || "").trim();
  const promptTemplate = String(formData.get("promptTemplate") || "").trim();
  const negativePrompt = String(formData.get("negativePrompt") || "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!productType || !displayName || !promptTemplate) {
    return { ok: false, message: "请完整填写产品类型、显示名和提示词。" };
  }

  await savePromptRecord({
    id: id || undefined,
    shopDomain: getDefaultShopDomain(),
    productType,
    displayName,
    promptTemplate,
    negativePrompt: negativePrompt || null,
    isActive,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/prompts");
  revalidatePath("/admin/install");
  return { ok: true, message: "提示词已保存。" };
}

export async function deletePromptAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") || "");
  if (id) {
    await deletePromptRecord(id);
  }
  revalidatePath("/admin/prompts");
  revalidatePath("/admin");
}

export async function saveStoreSettingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminSession();

  await saveStoreSettingRecord({
    shopDomain: getDefaultShopDomain(),
    activeModel: String(formData.get("activeModel") || "gpt-image-1"),
    requireGeneration: formData.get("requireGeneration") === "on",
    widgetAccentColor: String(formData.get("widgetAccentColor") || "#2563eb"),
    widgetButtonText: String(formData.get("widgetButtonText") || "生成效果图"),
  });

  await saveProviderConfigs(
    MODEL_OPTIONS.map((option) => {
      const field = option.formKey;
      const savedEndpoint = String(formData.get(`${field}__endpoint`) || "").trim();
      const savedBaseUrl = String(formData.get(`${field}__base_url`) || "").trim();
      const apiKey = String(formData.get(`${field}__api_key`) || "");

      return {
        key: option.key,
        label: option.label,
        apiKey,
        keepExistingApiKey: !apiKey.trim(),
        webhookUrl: savedEndpoint || option.defaultEndpoint || null,
        baseUrl: savedBaseUrl || null,
        isEnabled: true,
      };
    }),
  );

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/install");
  return { ok: true, message: "设置、模型端点与 API Key 已保存。" };
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

export async function getProviderOptionAction(modelKey: string) {
  await requireAdminSession();
  return getModelOption(modelKey);
}
