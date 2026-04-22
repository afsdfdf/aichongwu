import OpenAI from "openai";
import { getModelOption, type ModelAdapter } from "@/lib/catalog";
import { fetchRemoteFileAsBuffer, uploadBufferToS3 } from "@/lib/s3";
import { getProviderConfigByKey, getProviderConfigs } from "@/lib/store";

type GenerateInput = {
  modelKey: string;
  prompt: string;
  sourceImageBuffer?: Buffer;
  sourceImageContentType?: string;
  sourceImageUrl?: string;
  productType?: string;
  aspectRatio?: string;
};

type ProviderImageResult = {
  outputBuffer?: Buffer;
  contentType?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown> | null;
};

function hasSourceImage(input: GenerateInput) {
  return Boolean(input.sourceImageBuffer && input.sourceImageContentType);
}

function sourceImageBase64(input: GenerateInput) {
  return input.sourceImageBuffer ? input.sourceImageBuffer.toString("base64") : null;
}

function ensureImageAwareAdapter(adapter: ModelAdapter, label: string, input: GenerateInput) {
  if (!hasSourceImage(input)) return;
  if (adapter === "openai-edit" || adapter === "custom") return;

  throw new Error(
    `${label} is currently using a text-to-image path in this app, so the uploaded source image is not forwarded upstream. Switch to an image-edit compatible model or a custom endpoint that accepts source images.`,
  );
}

async function resolveProvider(modelKey: string) {
  const option = getModelOption(modelKey);
  if (!option) {
    throw new Error(`Unknown model: ${modelKey}`);
  }

  const provider = await getProviderConfigByKey(modelKey);
  // v3 returns fullEndpoint (base + path combined), prefer it over webhookUrl
  const endpointUrl = (provider as Record<string, unknown> | null)?.fullEndpoint as string | undefined
    || provider?.webhookUrl
    || option.defaultEndpoint
    || "";
  return {
    option,
    provider,
    endpointUrl,
    apiKey: provider?.apiKey || null,
    baseUrl: provider?.baseUrl || undefined,
    modelName: provider?.modelName || option.modelName,
  };
}

async function normalizeRemoteImage(result: ProviderImageResult) {
  if (result.outputBuffer && result.contentType) {
    return {
      outputBuffer: result.outputBuffer,
      contentType: result.contentType,
      metadata: result.metadata ?? null,
    };
  }

  if (result.imageUrl) {
    const remote = await fetchRemoteFileAsBuffer(result.imageUrl);
    return {
      outputBuffer: remote.buffer,
      contentType: remote.contentType,
      metadata: {
        ...(result.metadata ?? {}),
        remoteImageUrl: result.imageUrl,
      },
    };
  }

  throw new Error("Provider did not return an image");
}

async function generateWithOpenAIEdit(input: GenerateInput, modelName: string, apiKey: string, baseURL?: string) {
  const client = new OpenAI({ apiKey, baseURL });

  if (input.sourceImageBuffer && input.sourceImageContentType) {
    const file = new File([new Uint8Array(input.sourceImageBuffer)], "source.png", {
      type: input.sourceImageContentType,
    });

    const result = await client.images.edit({
      model: modelName as "gpt-image-1",
      image: file,
      prompt: input.prompt,
      size: "1024x1024",
    });

    const image = result.data?.[0];
    if (!image) throw new Error("OpenAI returned no image");

    return normalizeRemoteImage({
      outputBuffer: image.b64_json ? Buffer.from(image.b64_json, "base64") : undefined,
      contentType: image.b64_json ? "image/png" : undefined,
      imageUrl: image.url,
      metadata: {
        revisedPrompt: image.revised_prompt ?? null,
        sourceImageForwarded: true,
      },
    });
  }

  const result = await client.images.generate({
    model: modelName as "gpt-image-1",
    prompt: input.prompt,
    size: "1024x1024",
  });

  const image = result.data?.[0];
  if (!image) throw new Error("OpenAI returned no image");

  return normalizeRemoteImage({
    outputBuffer: image.b64_json ? Buffer.from(image.b64_json, "base64") : undefined,
    contentType: image.b64_json ? "image/png" : undefined,
    imageUrl: image.url,
    metadata: {
      revisedPrompt: image.revised_prompt ?? null,
      sourceImageForwarded: false,
    },
  });
}

function mapAspectRatioToSize(ar: string | undefined): string {
  switch (ar) {
    case "1:1": return "1024x1024";
    case "4:3": return "1024x768";
    case "3:4": return "768x1024";
    case "16:9": return "1024x576";
    case "9:16": return "576x1024";
    case "3:2": return "1024x683";
    case "2:3": return "683x1024";
    default: return "1024x1024";
  }
}

async function generateWithOpenAIImages(input: GenerateInput, modelName: string, apiKey: string, baseURL?: string) {
  ensureImageAwareAdapter("openai-images", modelName, input);
  const client = new OpenAI({ apiKey, baseURL });
  const size = mapAspectRatioToSize(input.aspectRatio);
  const result = await client.images.generate({
    model: modelName as "dall-e-3",
    prompt: input.prompt,
    size: size as "1024x1024",
  });
  const image = result.data?.[0];
  if (!image) throw new Error("OpenAI returned no image");
  return normalizeRemoteImage({
    outputBuffer: image.b64_json ? Buffer.from(image.b64_json, "base64") : undefined,
    contentType: image.b64_json ? "image/png" : undefined,
    imageUrl: image.url,
    metadata: {
      revisedPrompt: image.revised_prompt ?? null,
      sourceImageForwarded: false,
    },
  });
}

async function generateWithStability(input: GenerateInput, endpointUrl: string, apiKey: string) {
  ensureImageAwareAdapter("stability", "Stability", input);
  // v2beta endpoints use multipart/form-data, v1 endpoints use JSON
  const isV2 = endpointUrl.includes("/v2beta/");

  if (isV2) {
    const formData = new FormData();
    formData.append("prompt", input.prompt);
    formData.append("output_format", "png");

    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Stability v2 request failed: ${response.status} ${errorText}`);
    }

    // v2 returns image directly as binary or as JSON with base64
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("image/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return {
        outputBuffer: buffer,
        contentType,
        metadata: { provider: "stability-v2" },
      };
    }

    const payload = (await response.json()) as {
      image?: string;
      artifacts?: Array<{ base64?: string; seed?: number }>;
    };

    if (payload.image) {
      return {
        outputBuffer: Buffer.from(payload.image, "base64"),
        contentType: "image/png",
        metadata: { provider: "stability-v2" },
      };
    }

    const artifact = payload.artifacts?.[0];
    if (artifact?.base64) {
      return {
        outputBuffer: Buffer.from(artifact.base64, "base64"),
        contentType: "image/png",
        metadata: { provider: "stability-v2", seed: artifact.seed ?? null },
      };
    }

    throw new Error("Stability v2 returned no image data");
  }

  // Legacy v1 API
  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text_prompts: [{ text: input.prompt }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Stability request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    artifacts?: Array<{ base64?: string; seed?: number; finishReason?: string }>;
  };
  const artifact = payload.artifacts?.[0];
  if (!artifact?.base64) {
    throw new Error("Stability did not return base64 image data");
  }

  return {
    outputBuffer: Buffer.from(artifact.base64, "base64"),
    contentType: "image/png",
    metadata: {
      seed: artifact.seed ?? null,
      finishReason: artifact.finishReason ?? null,
      sourceImageForwarded: false,
    },
  };
}

async function pollReplicate(getUrl: string, apiKey: string) {
  // Vercel hobby=10s, pro=60s, enterprise=300s — stay well under limits
  const MAX_ATTEMPTS = 25; // 25 × 2s = 50s max polling
  const POLL_INTERVAL_MS = 2000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const payload = (await response.json()) as {
      status?: string;
      output?: string | string[];
      error?: string;
    };

    if (payload.status === "succeeded") {
      const output = Array.isArray(payload.output) ? payload.output[0] : payload.output;
      if (!output) throw new Error("Replicate succeeded but returned no output");
      return output;
    }

    if (payload.status === "failed" || payload.status === "canceled") {
      throw new Error(payload.error || `Replicate status: ${payload.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Replicate polling timed out (50s). The model may still be processing — check your Replicate dashboard.");
}

async function generateWithReplicate(input: GenerateInput, endpointUrl: string, apiKey: string) {
  ensureImageAwareAdapter("replicate", "Replicate", input);
  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        prompt: input.prompt,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Replicate request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    output?: string | string[];
    urls?: { get?: string };
  };

  const immediateOutput = Array.isArray(payload.output) ? payload.output[0] : payload.output;
  const imageUrl = immediateOutput || (payload.urls?.get ? await pollReplicate(payload.urls.get, apiKey) : null);
  if (!imageUrl) throw new Error("Replicate did not return image output");

  return normalizeRemoteImage({
    imageUrl,
    metadata: {
      provider: "replicate",
      sourceImageForwarded: false,
    },
  });
}

async function generateWithFalQueue(input: GenerateInput, endpointUrl: string, apiKey: string) {
  ensureImageAwareAdapter("fal-queue", "fal.ai", input);
  // fal.ai uses Key prefix (not Bearer) and async queue model
  const submitUrl = endpointUrl;

  const response = await fetch(submitUrl, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: input.prompt,
      image_size: "square_hd",
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`fal.ai request failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    images?: Array<{ url?: string }>;
    request_id?: string;
    status?: string;
  };

  // Synchronous response — images returned directly
  if (payload.images?.[0]?.url) {
    return normalizeRemoteImage({
      imageUrl: payload.images[0].url,
      metadata: { provider: "fal-queue", requestId: payload.request_id ?? null },
    });
  }

  // Async queue — poll for result
  const requestId = payload.request_id;
  if (!requestId) {
    throw new Error("fal.ai returned no images and no request_id for polling");
  }

  const MAX_POLL_ATTEMPTS = 25;
  const POLL_INTERVAL_MS = 2000;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const statusUrl = `${submitUrl}/requests/${requestId}`;
    const statusResp = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}` },
    });

    const statusPayload = (await statusResp.json()) as {
      status?: string;
      output?: { images?: Array<{ url?: string }> };
    };

    if (statusPayload.status === "COMPLETED" && statusPayload.output?.images?.[0]?.url) {
      return normalizeRemoteImage({
        imageUrl: statusPayload.output.images[0].url,
        metadata: { provider: "fal-queue", requestId },
      });
    }

    if (statusPayload.status === "FAILED") {
      throw new Error("fal.ai generation failed");
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("fal.ai polling timed out (50s). Check your fal.ai dashboard for the result.");
}

async function generateWithGemini(input: GenerateInput, endpointUrl: string, apiKey: string) {
  const isOfficialGoogleEndpoint = endpointUrl.includes("generativelanguage.googleapis.com");
  const url = isOfficialGoogleEndpoint
    ? `${endpointUrl}${endpointUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`
    : endpointUrl;

  const parts: Array<Record<string, unknown>> = [{ text: input.prompt }];
  if (hasSourceImage(input)) {
    parts.push({
      inline_data: {
        mime_type: input.sourceImageContentType || "image/png",
        data: sourceImageBase64(input),
      },
    });
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isOfficialGoogleEndpoint ? {} : { Authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify({
      contents: [
        {
          parts,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string };
          inline_data?: { data?: string; mimeType?: string; mime_type?: string };
        }>;
      };
    }>;
  };

  const imagePart = payload.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData || part.inline_data,
  );
  const inlineData = (imagePart?.inlineData || imagePart?.inline_data) as
    | { data?: string; mimeType?: string; mime_type?: string }
    | undefined;
  if (!inlineData?.data) {
    throw new Error("Gemini did not return inline image data");
  }

  return {
    outputBuffer: Buffer.from(inlineData.data, "base64"),
    contentType: inlineData.mimeType || inlineData.mime_type || "image/png",
    metadata: {
      provider: "gemini",
      sourceImageForwarded: hasSourceImage(input),
      endpointMode: isOfficialGoogleEndpoint ? "google-query-key" : "proxy-bearer",
    },
  };
}

/**
 * OpenAI Chat Completions image generation adapter.
 * Used by aggregator proxies (e.g. PoloAI) that expose image models
 * through the /v1/chat/completions endpoint. The response contains
 * images embedded as markdown in the content field:
 *   - base64:  ![image](data:image/png;base64,...)
 *   - url:     ![None](https://...)
 */
async function generateWithOpenAIChatImage(
  input: GenerateInput,
  modelName: string,
  apiKey: string,
  baseURL?: string,
) {
  ensureImageAwareAdapter("openai-chat-image", modelName, input);
  const client = new OpenAI({ apiKey, baseURL });

  // Build prompt with aspect ratio hint
  let userPrompt = input.prompt;
  if (input.aspectRatio && input.aspectRatio !== "1:1") {
    userPrompt = `[Aspect ratio: ${input.aspectRatio}] ${userPrompt}`;
  }

  const result = await client.chat.completions.create({
    model: modelName,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    max_tokens: 4096,
  });

  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Chat completions returned no content");
  }

  // ── Extract image from markdown ──
  // Pattern 1: base64 data URI  ![alt](data:image/png;base64,XXXXXX)
  const base64Match = content.match(
    /!\[.*?\]\(data:(image\/[a-zA-Z+]+);base64,([A-Za-z0-9+/=]+)\)/,
  );
  if (base64Match) {
    const mimeType = base64Match[1];
    const base64Data = base64Match[2];
    return {
      outputBuffer: Buffer.from(base64Data, "base64"),
      contentType: mimeType,
      metadata: {
        provider: "openai-chat-image",
        model: result.model,
        usage: result.usage ?? null,
        sourceImageForwarded: false,
      },
    };
  }

  // Pattern 2: regular URL  ![alt](https://...)
  const urlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  if (urlMatch) {
    const imageUrl = urlMatch[1];
    return normalizeRemoteImage({
      imageUrl,
      metadata: {
        provider: "openai-chat-image",
        model: result.model,
        usage: result.usage ?? null,
        sourceImageForwarded: false,
      },
    });
  }

  // Pattern 3: bare URL (some proxies just return the URL as content)
  const bareUrlMatch = content.match(/^(https?:\/\/\S+\.(png|jpg|jpeg|webp|gif)\S*)$/i);
  if (bareUrlMatch) {
    return normalizeRemoteImage({
      imageUrl: bareUrlMatch[1],
      metadata: {
        provider: "openai-chat-image",
        model: result.model,
        usage: result.usage ?? null,
        sourceImageForwarded: false,
      },
    });
  }

  throw new Error(
    `Chat completions response did not contain a recognizable image. Content preview: ${content.substring(0, 200)}`,
  );
}

async function generateWithCustom(input: GenerateInput, endpointUrl: string, apiKey?: string | null) {
  const provider = await getProviderConfigByKey(input.modelKey);
  const modelName = provider?.modelName || input.modelKey;
  const sourceProvided = hasSourceImage(input);
  const size = mapAspectRatioToSize(input.aspectRatio);
  const isOpenAICompatibleEditsApi =
    endpointUrl.includes("/v1/images/edits") || endpointUrl.includes("/images/edits");
  const isOpenAICompatibleImagesApi =
    endpointUrl.includes("/v1/images/generations") || endpointUrl.includes("/images/generations");

  if (sourceProvided && isOpenAICompatibleEditsApi) {
    const formData = new FormData();
    formData.append("model", modelName);
    formData.append("prompt", input.prompt);
    formData.append("size", size);
    formData.append("n", "1");
    formData.append(
      "image",
      new File([new Uint8Array(input.sourceImageBuffer!)], "source.png", {
        type: input.sourceImageContentType!,
      }),
    );

    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Custom API edit request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
      imageUrl?: string;
      imageBase64?: string;
      mimeType?: string;
      metadata?: Record<string, unknown>;
    };

    const openAIStyleImage = payload.data?.[0];
    if (openAIStyleImage?.b64_json) {
      return {
        outputBuffer: Buffer.from(openAIStyleImage.b64_json, "base64"),
        contentType: "image/png",
        metadata: {
          ...(payload.metadata ?? {}),
          revisedPrompt: openAIStyleImage.revised_prompt ?? null,
          provider: "custom-openai-compatible-edit",
          sourceImageForwarded: true,
        },
      };
    }

    if (openAIStyleImage?.url) {
      return normalizeRemoteImage({
        imageUrl: openAIStyleImage.url,
        metadata: {
          ...(payload.metadata ?? {}),
          revisedPrompt: openAIStyleImage.revised_prompt ?? null,
          provider: "custom-openai-compatible-edit",
          sourceImageForwarded: true,
        },
      });
    }

    if (payload.imageBase64) {
      return {
        outputBuffer: Buffer.from(payload.imageBase64, "base64"),
        contentType: payload.mimeType || "image/png",
        metadata: {
          ...(payload.metadata ?? {}),
          provider: "custom-openai-compatible-edit",
          sourceImageForwarded: true,
        },
      };
    }

    return normalizeRemoteImage({
      imageUrl: payload.imageUrl,
      metadata: {
        ...(payload.metadata ?? {}),
        provider: "custom-openai-compatible-edit",
        sourceImageForwarded: true,
      },
    });
  }

  if (sourceProvided && isOpenAICompatibleImagesApi) {
    throw new Error(
      "The configured endpoint uses /images/generations, which is text-to-image only. Your uploaded image is not sent to that upstream API. Use an /images/edits endpoint or a custom JSON endpoint that accepts sourceImageUrl/sourceImageBase64.",
    );
  }

  const requestBody = isOpenAICompatibleImagesApi
    ? {
        model: modelName,
        prompt: input.prompt,
        n: 1,
        size,
      }
    : {
        prompt: input.prompt,
        sourceImageUrl: input.sourceImageUrl || null,
        sourceImageBase64: sourceImageBase64(input),
        sourceImageContentType: input.sourceImageContentType || null,
        productType: input.productType || null,
        modelKey: input.modelKey,
        modelName,
      };

  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Custom API request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    created?: number;
    data?: Array<{
      url?: string;
      b64_json?: string;
      revised_prompt?: string;
    }>;
    imageUrl?: string;
    imageBase64?: string;
    mimeType?: string;
    metadata?: Record<string, unknown>;
  };

  const openAIStyleImage = payload.data?.[0];
  if (openAIStyleImage?.b64_json) {
    return {
      outputBuffer: Buffer.from(openAIStyleImage.b64_json, "base64"),
      contentType: "image/png",
      metadata: {
        ...(payload.metadata ?? {}),
        revisedPrompt: openAIStyleImage.revised_prompt ?? null,
        provider: "custom-openai-compatible",
        sourceImageForwarded: false,
      },
    };
  }

  if (openAIStyleImage?.url) {
    return normalizeRemoteImage({
      imageUrl: openAIStyleImage.url,
      metadata: {
        ...(payload.metadata ?? {}),
        revisedPrompt: openAIStyleImage.revised_prompt ?? null,
        provider: "custom-openai-compatible",
        sourceImageForwarded: false,
      },
    });
  }

  if (payload.imageBase64) {
    return {
      outputBuffer: Buffer.from(payload.imageBase64, "base64"),
      contentType: payload.mimeType || "image/png",
      metadata: {
        ...(payload.metadata ?? {}),
        sourceImageForwarded: sourceProvided,
      },
    };
  }

  return normalizeRemoteImage({
    imageUrl: payload.imageUrl,
    metadata: {
      ...(payload.metadata ?? {}),
      sourceImageForwarded: sourceProvided,
    },
  });
}

function ensureConfigured(value: string | null | undefined, label: string) {
  if (!value) {
    throw new Error(`${label} 未配置`);
  }
  return value;
}

async function runProviderImageGeneration(input: GenerateInput) {
  const { option, endpointUrl, apiKey, baseUrl, modelName } = await resolveProvider(input.modelKey);

  switch (option.adapter as ModelAdapter) {
    case "openai-edit":
      return generateWithOpenAIEdit(
        input,
        modelName,
        ensureConfigured(apiKey, "OpenAI API Key"),
        baseUrl,
      );
    case "openai-images":
      return generateWithOpenAIImages(
        input,
        modelName,
        ensureConfigured(apiKey, "OpenAI API Key"),
        baseUrl,
      );
    case "openai-chat-image":
      return generateWithOpenAIChatImage(
        input,
        modelName,
        ensureConfigured(apiKey, "Chat Image API Key"),
        baseUrl,
      );
    case "stability":
      return generateWithStability(input, ensureConfigured(endpointUrl, "Stability 端点"), ensureConfigured(apiKey, "Stability API Key"));
    case "replicate":
      return generateWithReplicate(input, ensureConfigured(endpointUrl, "Replicate 端点"), ensureConfigured(apiKey, "Replicate API Token"));
    case "gemini":
      return generateWithGemini(input, ensureConfigured(endpointUrl, "Gemini 端点"), ensureConfigured(apiKey, "Google API Key"));
    case "custom":
      return generateWithCustom(input, ensureConfigured(endpointUrl, "自定义 API 端点"), apiKey);
    case "midjourney-async":
    case "dashscope-async":
    case "volcengine-async":
    case "xfyun-async":
      throw new Error(`${option.label} 多数为异步任务型接口，当前支持配置校验，不支持即时生图测试。`);
    case "fal-queue":
      return generateWithFalQueue(input, ensureConfigured(endpointUrl, "fal.ai 端点"), ensureConfigured(apiKey, "fal.ai API Key"));
    default:
      throw new Error(`Unsupported adapter: ${option.adapter}`);
  }
}

export async function generatePreviewImage(input: GenerateInput) {
  const primaryKey = input.modelKey;
  const configuredProviders = await getProviderConfigs();
  const fallbackKeys = configuredProviders
    .filter(
      (provider) =>
        provider.key !== primaryKey &&
        provider.isEnabled &&
        provider.hasApiKey &&
        provider.option?.supportsPreviewGeneration &&
        (provider.option?.adapter === "openai-edit" || provider.option?.adapter === "custom"),
    )
    .map((provider) => provider.key);

  const attemptKeys = [primaryKey, ...fallbackKeys];
  let lastError: Error | null = null;
  let generated:
    | {
        outputBuffer: Buffer;
        contentType: string;
        metadata: Record<string, unknown> | null;
      }
    | null = null;
  let usedModelKey = primaryKey;

  for (const modelKey of attemptKeys) {
    try {
      generated = await runProviderImageGeneration({
        ...input,
        modelKey,
      });
      usedModelKey = modelKey;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown provider error");
    }
  }

  if (!generated) {
    throw lastError ?? new Error("All configured models failed");
  }

  if (hasSourceImage(input) && !generated.metadata?.sourceImageForwarded) {
    throw new Error(
      "This storefront flow requires image-to-image generation. The current model path did not forward the uploaded source image upstream, so generation was blocked.",
    );
  }

  const uploaded = await uploadBufferToS3({
    buffer: generated.outputBuffer,
    folder: "generated",
    contentType: generated.contentType,
  });

  return {
    outputImageUrl: uploaded.url,
    usedModelKey,
    metadata: {
      ...(generated.metadata ?? {}),
      usedModelKey,
      fallbackUsed: usedModelKey !== primaryKey,
    },
  };
}

export async function generateTestImage(params: {
  modelKey: string;
  prompt: string;
  sourceImageBuffer?: Buffer;
  sourceImageContentType?: string;
  aspectRatio?: string;
}) {
  const generated = await runProviderImageGeneration({
    modelKey: params.modelKey,
    prompt: params.prompt,
    sourceImageBuffer: params.sourceImageBuffer,
    sourceImageContentType: params.sourceImageContentType,
    aspectRatio: params.aspectRatio,
  });

  const uploaded = await uploadBufferToS3({
    buffer: generated.outputBuffer,
    folder: "tests",
    contentType: generated.contentType,
  });

  return {
    outputImageUrl: uploaded.url,
    usedModelKey: params.modelKey,
    metadata: generated.metadata ?? null,
  };
}

export async function validateProviderSetup(modelKey: string) {
  const { option, endpointUrl, apiKey, baseUrl } = await resolveProvider(modelKey);
  return {
    ok: Boolean(
      option.adapter === "custom"
        ? endpointUrl
        : option.adapter === "gemini"
          ? endpointUrl && apiKey
          : option.adapter.startsWith("openai")
            ? apiKey
            : endpointUrl,
    ),
    message: option.adapter === "openai-chat-image"
      ? `${option.label} — Chat Completions 模式，需 API Key${baseUrl ? "，Base URL: " + baseUrl : ""}`
      : `${option.label} 配置已读取`,
    option,
    endpointUrl,
    hasApiKey: Boolean(apiKey),
    baseUrl: baseUrl || null,
  };
}
