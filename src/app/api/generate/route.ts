import { NextResponse } from "next/server";
import { generatePreviewImage } from "@/lib/ai";
import { uploadBufferToS3 } from "@/lib/s3";
import { createGenerationRecord, getStoreContext, resolvePromptForProduct } from "@/lib/store";
import { fillPromptTemplate, getDefaultShopDomain, slugifyProductType } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "请上传图片文件。" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "图片文件不能超过 10MB。" }, { status: 400 });
    }

    const shopDomain = String(formData.get("shopDomain") || getDefaultShopDomain());
    const productType = slugifyProductType(String(formData.get("productType") || "frame"));
    const productTitle = String(formData.get("productTitle") || "");
    const shopifyProductId = String(formData.get("productId") || "");
    const shopifyVariantId = String(formData.get("variantId") || "");

    const [store, promptRule] = await Promise.all([
      getStoreContext(shopDomain),
      resolvePromptForProduct({ shopDomain, productType }),
    ]);

    if (!promptRule) {
      return NextResponse.json({ message: "未找到对应产品提示词。" }, { status: 404 });
    }

    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const sourceUpload = await uploadBufferToS3({
      buffer: sourceBuffer,
      folder: "source",
      contentType: file.type || "image/png",
    });

    const promptUsed = fillPromptTemplate(promptRule.promptTemplate, {
      productType,
      productTitle,
      sourceImageUrl: sourceUpload.url,
    });

    const generated = await generatePreviewImage({
      modelKey: store.setting.activeModel,
      prompt: promptRule.negativePrompt
        ? `${promptUsed}\n\nNegative prompt:\n${promptRule.negativePrompt}`
        : promptUsed,
      sourceImageBuffer: sourceBuffer,
      sourceImageContentType: file.type || "image/png",
      sourceImageUrl: sourceUpload.url,
      productType,
      aspectRatio: promptRule.aspectRatio ?? undefined,
    });

    const record = await createGenerationRecord({
      shopDomain,
      productType,
      productTitle: productTitle || null,
      shopifyProductId: shopifyProductId || null,
      shopifyVariantId: shopifyVariantId || null,
      customerEmail: null,
      customerId: null,
      sourceImageUrl: sourceUpload.url,
      outputImageUrl: generated.outputImageUrl,
      promptUsed,
      modelUsed: generated.usedModelKey,
      orderId: null,
      orderName: null,
      orderNumber: null,
      status: "generated",
      metadata: generated.metadata ?? null,
    });

    return NextResponse.json({
      ok: true,
      generationId: record.id,
      outputImageUrl: record.outputImageUrl,
      promptUsed: record.promptUsed,
      modelUsed: record.modelUsed,
      metadata: record.metadata ?? null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "生成失败。",
      },
      { status: 500 },
    );
  }
}
