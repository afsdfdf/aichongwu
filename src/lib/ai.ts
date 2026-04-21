import OpenAI from "openai";
import { MODEL_OPTIONS } from "@/lib/catalog";
import { fetchRemoteFileAsBuffer, uploadBufferToS3 } from "@/lib/s3";
import { getProviderConfigByKey } from "@/lib/store";

type GenerateInput = {
  modelKey: string;
  prompt: string;
  sourceImageBuffer: Buffer;
  sourceImageContentType: string;
  sourceImageUrl: string;
  productType: string;
};

function getModelConfig(modelKey: string) {
  const model = MODEL_OPTIONS.find((item) => item.key === modelKey);
  if (!model) {
    throw new Error(`Unknown model: ${modelKey}`);
  }
  return model;
}

async function generateWithOpenAI(input: GenerateInput) {
  const provider = await getProviderConfigByKey("gpt-image-1");
  const apiKey = provider?.apiKey || process.env.OPENAI_API_KEY;
  const baseURL = provider?.baseUrl || undefined;

  if (!apiKey) {
    return {
      outputBuffer: input.sourceImageBuffer,
      contentType: input.sourceImageContentType,
      metadata: {
        mode: "mock",
        reason: "OpenAI API Key is not configured yet, returned original image as demo output",
      },
    };
  }

  const client = new OpenAI({ apiKey, baseURL });
  const file = new File([new Uint8Array(input.sourceImageBuffer)], "source.png", {
    type: input.sourceImageContentType,
  });

  const result = await client.images.edit({
    model: "gpt-image-1",
    image: file,
    prompt: input.prompt,
    size: "1024x1024",
  });

  const image = result.data?.[0];
  if (!image) {
    throw new Error("OpenAI returned no image");
  }

  if (image.b64_json) {
    return {
      outputBuffer: Buffer.from(image.b64_json, "base64"),
      contentType: "image/png",
      metadata: {
        revisedPrompt: image.revised_prompt ?? null,
      },
    };
  }

  if (image.url) {
    const remote = await fetchRemoteFileAsBuffer(image.url);
    return {
      outputBuffer: remote.buffer,
      contentType: remote.contentType,
      metadata: {
        revisedPrompt: image.revised_prompt ?? null,
      },
    };
  }

  throw new Error("OpenAI image payload format unsupported");
}

async function generateWithWebhook(input: GenerateInput, webhookUrl: string, apiKey?: string | null) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      prompt: input.prompt,
      sourceImageUrl: input.sourceImageUrl,
      productType: input.productType,
      modelKey: input.modelKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook model failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    imageUrl?: string;
    imageBase64?: string;
    mimeType?: string;
    metadata?: Record<string, unknown>;
  };

  if (payload.imageBase64) {
    return {
      outputBuffer: Buffer.from(payload.imageBase64, "base64"),
      contentType: payload.mimeType || "image/png",
      metadata: payload.metadata ?? null,
    };
  }

  if (payload.imageUrl) {
    const remote = await fetchRemoteFileAsBuffer(payload.imageUrl);
    return {
      outputBuffer: remote.buffer,
      contentType: remote.contentType,
      metadata: payload.metadata ?? null,
    };
  }

  throw new Error("Webhook did not return imageUrl or imageBase64");
}

export async function generatePreviewImage(input: GenerateInput) {
  const model = getModelConfig(input.modelKey);
  const provider = await getProviderConfigByKey(input.modelKey);

  const generated =
    model.adapter === "openai-edit"
      ? await generateWithOpenAI(input)
      : await generateWithWebhook(
          input,
          provider?.webhookUrl || process.env[model.webhookEnv!] || "",
          provider?.apiKey || null,
        );

  if (model.adapter === "webhook" && !provider?.webhookUrl && !process.env[model.webhookEnv!]) {
    throw new Error(`Webhook URL is not configured for ${input.modelKey}`);
  }

  const uploaded = await uploadBufferToS3({
    buffer: generated.outputBuffer,
    folder: "generated",
    contentType: generated.contentType,
  });

  return {
    outputImageUrl: uploaded.url,
    metadata: generated.metadata ?? null,
  };
}
