"use server";

import { revalidatePath } from "next/cache";
import { detectModelsFromEndpoint, getModelOption } from "@/lib/catalog";
import { requireAdminSession } from "@/lib/auth";
import {
  deletePromptRecord,
  getStoreContext,
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

  const { setting } = await getStoreContext(getDefaultShopDomain());

  const activeModel = String(formData.get("activeModel") || setting.activeModel || "gpt-image-1");
  const option = getModelOption(activeModel);
  if (!option) {
    return { ok: false, message: "未找到对应模型。" };
  }

  const nextButtonText = String(formData.get("widgetButtonText") || setting.widgetButtonText || "生成效果图");
  const nextAccentColor = String(formData.get("widgetAccentColor") || setting.widgetAccentColor || "#2563eb");

  await saveStoreSettingRecord({
    shopDomain: getDefaultShopDomain(),
    activeModel,
    requireGeneration: setting.requireGeneration,
    widgetAccentColor: nextAccentColor,
    widgetButtonText: nextButtonText,
  });

  const endpoint =
    String(formData.get("endpointUrl") || formData.get(`${option.formKey}__endpoint`) || "").trim();
  const apiKey = String(formData.get("apiKey") || formData.get(`${option.formKey}__api_key`) || "");
  const baseUrl = String(formData.get("baseUrl") || formData.get(`${option.formKey}__base_url`) || "").trim();
  const modelName =
    String(formData.get("modelName") || formData.get(`${option.formKey}__model_name`) || "").trim();
  const priority = Math.max(1, Number(formData.get(`${option.formKey}__priority`) || 1));
  const isEnabled = formData.get(`${option.formKey}__enabled`) === "on";

  const compatible = detectModelsFromEndpoint(endpoint);
  const compatibleHint =
    compatible.length > 0
      ? `已识别 ${compatible.length} 个兼容模型。`
      : "当前端点未识别到常见模型，将按你手动选择的模型配置保存。";

  await saveProviderConfigs([
    {
      key: option.key,
      label: option.label,
      apiKey,
      keepExistingApiKey: !apiKey.trim(),
      webhookUrl: endpoint || option.defaultEndpoint || null,
      baseUrl: baseUrl || null,
      modelName: modelName || option.modelName,
      priority,
      isEnabled,
    },
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/install");
  return { ok: true, message: `${option.label} 配置已保存。${compatibleHint}` };
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
