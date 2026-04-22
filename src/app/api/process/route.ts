import { after, NextResponse } from "next/server";
import { generatePreviewImage } from "@/lib/ai";
import { uploadBufferToS3 } from "@/lib/s3";
import {
  createGenerationRecord,
  getStoreContext,
  resolvePromptForProduct,
  updateGenerationResultData,
} from "@/lib/store";
import { fillPromptTemplate, getDefaultShopDomain, slugifyProductType } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

async function runLegacyGeneration(input: {
  generationId: string;
  imageId: string;
  sourceBuffer: Buffer;
  sourceContentType: string;
  shopDomain: string;
  productType: string;
  productTitle: string;
}) {
  try {
    const [store, promptRule] = await Promise.all([
      getStoreContext(input.shopDomain),
      resolvePromptForProduct({
        shopDomain: input.shopDomain,
        productType: input.productType,
      }),
    ]);

    if (!promptRule) {
      throw new Error("No prompt configured for this product type");
    }

    const sourceUpload = await uploadBufferToS3({
      buffer: input.sourceBuffer,
      folder: "source",
      contentType: input.sourceContentType,
    });

    const promptUsed = fillPromptTemplate(promptRule.promptTemplate, {
      productType: input.productType,
      productTitle: input.productTitle,
      sourceImageUrl: sourceUpload.url,
    });

    const generated = await generatePreviewImage({
      modelKey: store.setting.activeModel,
      prompt: promptRule.negativePrompt
        ? `${promptUsed}\n\nNegative prompt:\n${promptRule.negativePrompt}`
        : promptUsed,
      sourceImageBuffer: input.sourceBuffer,
      sourceImageContentType: input.sourceContentType,
      sourceImageUrl: sourceUpload.url,
      productType: input.productType,
      aspectRatio: promptRule.aspectRatio ?? undefined,
    });

    await updateGenerationResultData({
      generationId: input.generationId,
      shopDomain: input.shopDomain,
      sourceImageUrl: sourceUpload.url,
      outputImageUrl: generated.outputImageUrl,
      promptUsed,
      modelUsed: generated.usedModelKey,
      status: "succeeded",
      metadata: {
        ...(generated.metadata ?? {}),
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return json({ error: "Please upload an image" }, 400);
    }

    const maxFileSize = 20 * 1024 * 1024;
    if (file.size > maxFileSize) {
      return json({ error: "File must be under 20 MB" }, 400);
    }

    const shopDomain = String(formData.get("shopDomain") || getDefaultShopDomain()).trim();
    const productType = slugifyProductType(String(formData.get("productType") || "keychain"));
    const productTitle = String(formData.get("productTitle") || "Custom Pet Memorial Keychain").trim();
    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const sourceContentType = file.type || "image/png";

    const pending = await createGenerationRecord({
      shopDomain,
      productType,
      productTitle: productTitle || null,
      shopifyProductId: null,
      shopifyVariantId: null,
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
        legacyTask: true,
      },
    });

    const taskId = pending.id;
    const imageId = pending.id;

    after(async () => {
      await runLegacyGeneration({
        generationId: pending.id,
        imageId,
        sourceBuffer,
        sourceContentType,
        shopDomain,
        productType,
        productTitle,
      });
    });

    return json({ taskId, imageId });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Failed to create task" },
      500,
    );
  }
}