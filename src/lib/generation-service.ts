import { randomUUID } from "node:crypto";
import { generatePreviewImage } from "@/lib/ai";
import { uploadBufferToS3 } from "@/lib/s3";
import {
  createGenerationRecord,
  getStoreContext,
  updateGenerationResultData,
} from "@/lib/store";
import { resolveRuntimeRouteAndPrompt } from "@/lib/config-center/service";
import { fillPromptTemplate, getDefaultShopDomain, slugifyProductType } from "@/lib/utils";

export type NormalizedGenerationInput = {
  entrypoint: "generate" | "process";
  mode: "sync" | "async";
  shopDomain: string;
  productType: string;
  productTitle: string;
  shopifyProductId: string | null;
  shopifyVariantId: string | null;
  sourceBuffer: Buffer;
  sourceContentType: string;
  maxFileSizeMb: number;
};

export async function normalizeGenerationRequest(
  request: Request,
  options: {
    entrypoint: "generate" | "process";
    mode: "sync" | "async";
    fileField: "file" | "image";
    maxFileSizeMb: number;
    defaultProductType: string;
    defaultTitle: string;
  },
): Promise<NormalizedGenerationInput> {
  const formData = await request.formData();
  const file = formData.get(options.fileField);
  if (!(file instanceof File)) {
    throw new Error(options.fileField === "file" ? "请上传图片文件。" : "Please upload an image");
  }

  const maxBytes = options.maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`图片文件不能超过 ${options.maxFileSizeMb}MB。`);
  }

  return {
    entrypoint: options.entrypoint,
    mode: options.mode,
    shopDomain: String(formData.get("shopDomain") || getDefaultShopDomain()).trim(),
    productType: slugifyProductType(String(formData.get("productType") || options.defaultProductType)),
    productTitle: String(formData.get("productTitle") || options.defaultTitle).trim(),
    shopifyProductId: String(formData.get("productId") || "").trim() || null,
    shopifyVariantId: String(formData.get("variantId") || "").trim() || null,
    sourceBuffer: Buffer.from(await file.arrayBuffer()),
    sourceContentType: file.type || "image/png",
    maxFileSizeMb: options.maxFileSizeMb,
  };
}

function buildPromptText(promptTemplate: string, input: { productType: string; productTitle: string; sourceImageUrl: string; negativePrompt?: string | null }) {
  const promptUsed = fillPromptTemplate(promptTemplate, {
    productType: input.productType,
    productTitle: input.productTitle,
    sourceImageUrl: input.sourceImageUrl,
  });

  return {
    promptUsed,
    fullPrompt: input.negativePrompt ? `${promptUsed}\n\nNegative prompt:\n${input.negativePrompt}` : promptUsed,
  };
}

export async function runSynchronousGeneration(input: NormalizedGenerationInput) {
  const [runtime, legacyStore] = await Promise.all([
    resolveRuntimeRouteAndPrompt({ scene: input.entrypoint === "process" ? "process" : "generate", productType: input.productType }),
    getStoreContext(input.shopDomain),
  ]);

  if (!runtime.prompt) {
    throw new Error("未找到对应产品提示词。请先在后台发布提示词版本。");
  }

  const sourceUpload = await uploadBufferToS3({
    buffer: input.sourceBuffer,
    folder: "source",
    contentType: input.sourceContentType,
  });

  const composed = buildPromptText(runtime.prompt.version.promptTemplate, {
    productType: input.productType,
    productTitle: input.productTitle,
    sourceImageUrl: sourceUpload.url,
    negativePrompt: runtime.prompt.version.negativePrompt,
  });

  const selectedConnection = runtime.route?.primary;
  const modelKey = selectedConnection?.id || selectedConnection?.modelCode || legacyStore.setting.activeModel;
  if (!modelKey) {
    throw new Error("No active model configured. Please save a model in the admin settings first.");
  }

  const generated = await generatePreviewImage({
    modelKey,
    prompt: composed.fullPrompt,
    sourceImageBuffer: input.sourceBuffer,
    sourceImageContentType: input.sourceContentType,
    sourceImageUrl: sourceUpload.url,
    productType: input.productType,
    aspectRatio: runtime.prompt.version.aspectRatio ?? undefined,
  });

  const record = await createGenerationRecord({
    shopDomain: input.shopDomain,
    productType: input.productType,
    productTitle: input.productTitle || null,
    shopifyProductId: input.shopifyProductId,
    shopifyVariantId: input.shopifyVariantId,
    customerEmail: null,
    customerId: null,
    sourceImageUrl: sourceUpload.url,
    outputImageUrl: generated.outputImageUrl,
    promptUsed: composed.promptUsed,
    modelUsed: generated.usedModelKey,
    orderId: null,
    orderName: null,
    orderNumber: null,
    status: "generated",
    designConfirmedAt: null,
    metadata: {
      ...(generated.metadata ?? {}),
      routePolicyId: runtime.route?.route.id ?? null,
      connectionId: selectedConnection?.id ?? `${legacyStore.setting.modelProvider}:${modelKey}`,
      promptTemplateId: runtime.prompt.template.id,
      promptVersion: runtime.prompt.version.version,
      requestMode: input.mode,
    },
  });

  return {
    record,
    sourceImageUrl: sourceUpload.url,
  };
}

export async function createPendingGeneration(input: NormalizedGenerationInput) {
  return createGenerationRecord({
    shopDomain: input.shopDomain,
    productType: input.productType,
    productTitle: input.productTitle || null,
    shopifyProductId: input.shopifyProductId,
    shopifyVariantId: input.shopifyVariantId,
    customerEmail: null,
    customerId: null,
    sourceImageUrl: "",
    outputImageUrl: "",
    promptUsed: "",
    modelUsed: "",
    orderId: null,
    orderName: null,
    orderNumber: null,
    status: "processing",
    designConfirmedAt: null,
    metadata: {
      compatibilityTaskId: randomUUID(),
      requestMode: input.mode,
    },
  });
}

export async function runAsyncGenerationJob(input: NormalizedGenerationInput & { generationId: string; imageId: string }) {
  try {
    const result = await runSynchronousGeneration(input);
    await updateGenerationResultData({
      generationId: input.generationId,
      shopDomain: input.shopDomain,
      sourceImageUrl: result.sourceImageUrl,
      outputImageUrl: result.record.outputImageUrl,
      promptUsed: result.record.promptUsed,
      modelUsed: result.record.modelUsed,
      status: "succeeded",
      metadata: {
        ...(result.record.metadata ?? {}),
        legacyTask: true,
        imageId: input.imageId,
        error: null,
      },
    });
  } catch (error) {
    await updateGenerationResultData({
      generationId: input.generationId,
      shopDomain: input.shopDomain,
      status: "failed",
      metadata: {
        legacyTask: true,
        imageId: input.imageId,
        error: error instanceof Error ? error.message : "Generation failed",
      },
    });
  }
}
