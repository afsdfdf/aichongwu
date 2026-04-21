"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import {
  deletePromptRecord,
  importExistingBucketAssets,
  savePromptRecord,
  saveProviderConfigs,
  saveStoreSettingRecord,
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
    widgetAccentColor: String(formData.get("widgetAccentColor") || "#0ea5e9"),
    widgetButtonText: String(formData.get("widgetButtonText") || "生成效果图"),
  });

  await saveProviderConfigs([
    {
      key: "gpt-image-1",
      label: "OpenAI GPT Image 1",
      apiKey: String(formData.get("openaiApiKey") || ""),
      keepExistingApiKey: !String(formData.get("openaiApiKey") || "").trim(),
      baseUrl: String(formData.get("openaiBaseUrl") || "").trim() || null,
      isEnabled: true,
    },
    {
      key: "flux-webhook",
      label: "Flux (Webhook)",
      apiKey: String(formData.get("fluxApiKey") || ""),
      keepExistingApiKey: !String(formData.get("fluxApiKey") || "").trim(),
      webhookUrl: String(formData.get("fluxWebhookUrl") || "").trim() || null,
      isEnabled: true,
    },
    {
      key: "stable-diffusion-webhook",
      label: "Stable Diffusion (Webhook)",
      apiKey: String(formData.get("sdApiKey") || ""),
      keepExistingApiKey: !String(formData.get("sdApiKey") || "").trim(),
      webhookUrl: String(formData.get("sdWebhookUrl") || "").trim() || null,
      isEnabled: true,
    },
    {
      key: "midjourney-webhook",
      label: "Midjourney (Webhook)",
      apiKey: String(formData.get("midjourneyApiKey") || ""),
      keepExistingApiKey: !String(formData.get("midjourneyApiKey") || "").trim(),
      webhookUrl: String(formData.get("midjourneyWebhookUrl") || "").trim() || null,
      isEnabled: true,
    },
    {
      key: "custom-webhook",
      label: "Custom Model (Webhook)",
      apiKey: String(formData.get("customApiKey") || ""),
      keepExistingApiKey: !String(formData.get("customApiKey") || "").trim(),
      webhookUrl: String(formData.get("customWebhookUrl") || "").trim() || null,
      isEnabled: true,
    },
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/install");
  return { ok: true, message: "设置和模型密钥已保存。" };
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
