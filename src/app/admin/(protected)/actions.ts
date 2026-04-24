"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import { removePromptTemplate, savePromptTemplateWithVersion } from "@/lib/config-center/service";
import {
  getStoreContext,
  importExistingBucketAssets,
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
    return { ok: false, message: "Product type, display name, and prompt are required." };
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
    message: `Prompt saved for ${getDefaultShopDomain()} / ${productType} / ${formatDateTimeISO(new Date())}`,
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
  return { ok: true, message: id ? `Deleted ${id}` : "" };
}

export async function saveStoreSettingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminSession();

  const { setting } = await getStoreContext(getDefaultShopDomain());

  const providerId = (
    String(formData.get("providerId") || setting.modelProvider || "google").trim() === "google" ? "google" : "custom"
  ) as "google" | "custom";
  const activeModel = String(formData.get("activeModel") || setting.activeModel || "gemini-3.1-flash-image").trim();
  const modelName = String(formData.get("modelName") || "").trim() || activeModel;
  const apiKey = String(formData.get("apiKey") || "");
  const baseUrl =
    String(formData.get("baseUrl") || "").trim() ||
    (providerId === "google" ? "https://generativelanguage.googleapis.com" : "https://ai403.eu.cc/v1");
  const rawEndpoint =
    providerId === "google"
      ? `/v1beta/models/${modelName}:generateContent`
      : String(formData.get("modelEndpoint") || "").trim() || "/images/edits";
  const modelEndpoint =
    providerId === "custom" && /\/v1$/i.test(baseUrl) && /^\/v1\//i.test(rawEndpoint)
      ? rawEndpoint.replace(/^\/v1/i, "")
      : rawEndpoint;
  const modelAdapter =
    providerId === "google"
      ? "gemini"
      : "custom";
  const widgetAccentColor = String(formData.get("widgetAccentColor") || setting.widgetAccentColor || "#2563eb");
  const widgetButtonText = String(formData.get("widgetButtonText") || setting.widgetButtonText || "Upload Your Pet Photo");

  await saveStoreSettingRecord({
    shopDomain: getDefaultShopDomain(),
    activeModel,
    modelProvider: providerId,
    modelApiKey: apiKey,
    keepExistingModelApiKey: !apiKey.trim(),
    modelBaseUrl: baseUrl || null,
    modelEndpoint: modelEndpoint || null,
    modelName,
    modelAdapter,
    requireGeneration: setting.requireGeneration,
    widgetAccentColor,
    widgetButtonText,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/install");
  return { ok: true, message: "Model configuration saved." };
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
    message: `Imported ${imported.length} objects from S3${prefix ? ` (prefix: ${prefix})` : ""}.`,
  };
}

export async function syncHistoryAction(): Promise<ActionState> {
  await requireAdminSession();
  const result = await syncHistoricalGenerationsFromBucket(getDefaultShopDomain());

  revalidatePath("/admin");
  revalidatePath("/admin/generations");
  return {
    ok: true,
    message: `Historical sync completed. Found ${result.totalHistoricalPairs} source/output pairs and ${result.totalGenerations} generation records.`,
  };
}
