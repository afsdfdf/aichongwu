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
};

type ProviderImageResult = {
  outputBuffer?: Buffer;
  contentType?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown> | null;
};

async function resolveProvider(modelKey: string) {
  const option = getModelOption(modelKey);
  if (!option) {
    throw new Error(`Unknown model: ${modelKey}`);
  }

  const provider = await getProviderConfigByKey(modelKey);
  return {
    option,
    provider,
    endpointUrl: provider?.webhookUrl || option.defaultEndpoint || "",
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

async function generateWithOpenAIEdit(input: GenerateInput, apiKey: string, baseURL?: string) {
  const client = new OpenAI({ apiKey, baseURL });

  if (input.sourceImageBuffer && input.sourceImageContentType) {
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
    if (!image) throw new Error("OpenAI returned no image");

    return normalizeRemoteImage({
      outputBuffer: image.b64_json ? Buffer.from(image.b64_json, "base64") : undefined,
      contentType: image.b64_json ? "image/png" : undefined,
      imageUrl: image.url,
      metadata: {
        revisedPrompt: image.revised_prompt ?? null,
      },
    });
  }

  const result = await client.images.generate({
    model: "gpt-image-1",
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
    },
  });
}

async function generateWithOpenAIImages(input: GenerateInput, modelName: string, apiKey: string, baseURL?: string) {
  const client = new OpenAI({ apiKey, baseURL });
  const result = await client.images.generate({
    model: modelName as "dall-e-3",
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
    },
  });
}

async function generateWithStability(input: GenerateInput, endpointUrl: string, apiKey: string) {
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
    },
  };
}

async function pollReplicate(getUrl: string, apiKey: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
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

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Replicate polling timed out");
}

async function generateWithReplicate(input: GenerateInput, endpointUrl: string, apiKey: string) {
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
    },
  });
}

async function generateWithGemini(input: GenerateInput, endpointUrl: string, apiKey: string) {
  const url = `${endpointUrl}${endpointUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: input.prompt }],
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
        }>;
      };
    }>;
  };

  const inlineData = payload.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
  if (!inlineData?.data) {
    throw new Error("Gemini did not return inline image data");
  }

  return {
    outputBuffer: Buffer.from(inlineData.data, "base64"),
    contentType: inlineData.mimeType || "image/png",
    metadata: {
      provider: "gemini",
    },
  };
}

async function generateWithCustom(input: GenerateInput, endpointUrl: string, apiKey?: string | null) {
  const provider = await getProviderConfigByKey(input.modelKey);
  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      prompt: input.prompt,
      sourceImageUrl: input.sourceImageUrl || null,
      productType: input.productType || null,
      modelKey: input.modelKey,
      modelName: provider?.modelName || input.modelKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom API request failed: ${response.status}`);
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

  return normalizeRemoteImage({
    imageUrl: payload.imageUrl,
    metadata: payload.metadata ?? null,
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
      return generateWithOpenAIEdit(input, ensureConfigured(apiKey, "OpenAI API Key"), baseUrl);
    case "openai-images":
      return generateWithOpenAIImages(
        input,
        modelName,
        ensureConfigured(apiKey, "OpenAI API Key"),
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
    case "xfyun-async":
      throw new Error(`${option.label} 多数为异步任务型接口，当前支持配置校验，不支持即时生图测试。`);
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
        provider.option?.supportsPreviewGeneration,
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

  const uploaded = await uploadBufferToS3({
    buffer: generated.outputBuffer,
    folder: "generated",
    contentType: generated.contentType,
  });

  return {
    outputImageUrl: uploaded.url,
    metadata: {
      ...(generated.metadata ?? {}),
      usedModelKey,
      fallbackUsed: usedModelKey !== primaryKey,
    },
  };
}

export async function generateTestImage(params: { modelKey: string; prompt: string }) {
  const generated = await runProviderImageGeneration({
    modelKey: params.modelKey,
    prompt: params.prompt,
  });

  const uploaded = await uploadBufferToS3({
    buffer: generated.outputBuffer,
    folder: "tests",
    contentType: generated.contentType,
  });

  return {
    outputImageUrl: uploaded.url,
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
    message: `${option.label} 配置已读取`,
    option,
    endpointUrl,
    hasApiKey: Boolean(apiKey),
    baseUrl: baseUrl || null,
  };
}
