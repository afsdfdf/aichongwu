import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { PROVIDERS } from "@/lib/catalog";

export const runtime = "nodejs";

type DetectedModel = {
  id: string;
  type: "image" | "video" | "other";
  adapter: string;
  endpoint: string;
  providerId: string;
  protocol: "gemini" | "openai";
  matchedKeywords?: string[];
};

function normalizeInputBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function looksLikeGeminiEndpoint(baseUrl: string) {
  return (
    baseUrl.includes("generativelanguage.googleapis.com") ||
    /\/v1beta\/models\/.+:generateContent/i.test(baseUrl) ||
    baseUrl.includes(":generateContent")
  );
}

function getOrigin(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return baseUrl;
  }
}

function buildGeminiModelDetections(baseUrl: string): DetectedModel[] {
  const googleProvider = PROVIDERS.find((item) => item.id === "google");
  if (!googleProvider) return [];

  const origin = getOrigin(baseUrl);

  return googleProvider.models.map((model) => ({
    id: model.id,
    type: "image" as const,
    adapter: model.adapter,
    endpoint: `${origin}${model.defaultEndpoint}`,
    providerId: "google",
    protocol: "gemini" as const,
    matchedKeywords: ["gemini", "generateContent"],
  }));
}

function buildOpenAIModelsUrl(baseUrl: string) {
  if (baseUrl.endsWith("/models") || baseUrl.endsWith("/v1/models")) return baseUrl;
  if (baseUrl.endsWith("/v1")) return `${baseUrl}/models`;
  if (baseUrl.includes("/v1/")) {
    const idx = baseUrl.indexOf("/v1/");
    return `${baseUrl.substring(0, idx + 3)}/models`;
  }
  return `${baseUrl}/v1/models`;
}

function inferModelEndpoint(origin: string, modelId: string, supportedTypes?: string[]) {
  const lower = modelId.toLowerCase();
  const types = supportedTypes || [];

  if (types.includes("gemini") || lower.includes("gemini")) {
    return {
      adapter: "openai-chat-image",
      endpoint: `${origin}/v1/chat/completions`,
      providerId: "custom",
      protocol: "openai" as const,
      type: "image" as const,
    };
  }

  if (lower.includes("gpt-image")) {
    return {
      adapter: "openai-edit",
      endpoint: `${origin}/v1/images/edits`,
      providerId: "openai",
      protocol: "openai" as const,
      type: "image" as const,
    };
  }

  if (lower.includes("dall") || lower.includes("imagen")) {
    return {
      adapter: "openai-images",
      endpoint: `${origin}/v1/images/generations`,
      providerId: "openai",
      protocol: "openai" as const,
      type: "image" as const,
    };
  }

  if (
    lower.includes("flux") ||
    lower.includes("seedream") ||
    lower.includes("doubao") ||
    lower.includes("ideogram") ||
    lower.includes("banana")
  ) {
    return {
      adapter: "openai-chat-image",
      endpoint: `${origin}/v1/chat/completions`,
      providerId: "openai",
      protocol: "openai" as const,
      type: lower.includes("video") ? ("video" as const) : ("image" as const),
    };
  }

  if (lower.includes("sora") || lower.includes("video") || lower.includes("kling")) {
    return {
      adapter: "openai-chat-image",
      endpoint: `${origin}/v1/chat/completions`,
      providerId: "openai",
      protocol: "openai" as const,
      type: "video" as const,
    };
  }

  return {
    adapter: "custom",
    endpoint: `${origin}/v1/chat/completions`,
    providerId: "custom",
    protocol: "openai" as const,
    type: "other" as const,
  };
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, message: "Unauthorized", models: [] }, { status: 401 });
    }

    const body = (await request.json()) as { baseUrl?: string; apiKey?: string };
    if (!body.baseUrl || !body.apiKey) {
      return NextResponse.json({ ok: false, message: "Missing baseUrl or apiKey", models: [] }, { status: 400 });
    }

    const baseUrl = normalizeInputBaseUrl(body.baseUrl);

    if (looksLikeGeminiEndpoint(baseUrl)) {
      const models = buildGeminiModelDetections(baseUrl);
      return NextResponse.json({
        ok: true,
        protocol: "gemini",
        providerId: "google",
        normalizedBaseUrl: getOrigin(baseUrl),
        message: `Detected Gemini generateContent endpoint. ${models.length} recommended models are ready.`,
        models,
      });
    }

    const modelsUrl = buildOpenAIModelsUrl(baseUrl);
    const response = await fetch(modelsUrl, {
      headers: {
        Authorization: `Bearer ${body.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json({
        ok: false,
        message: `Provider returned ${response.status}: ${text.slice(0, 200) || response.statusText}`,
        models: [],
      });
    }

    const data = (await response.json()) as {
      data?: Array<{ id: string; supported_endpoint_types?: string[] }>;
      models?: Array<{ id: string; supported_endpoint_types?: string[] }>;
    };
    const rawModels = data.data || data.models || [];
    const origin = getOrigin(baseUrl);

    const models: DetectedModel[] = rawModels.map((model) => {
      const inferred = inferModelEndpoint(origin, model.id, model.supported_endpoint_types);
      return {
        id: model.id,
        ...inferred,
        matchedKeywords: model.supported_endpoint_types || [],
      };
    });

    const imageModels = models.filter((model) => model.type !== "other");
    const suggestedProviderId = imageModels[0]?.providerId || "custom";

    return NextResponse.json({
      ok: true,
      protocol: imageModels.some((item) => item.protocol === "gemini") ? "mixed" : "openai",
      providerId: suggestedProviderId,
      normalizedBaseUrl: origin,
      message: `Detected ${rawModels.length} models. ${imageModels.length} image-capable models are available.`,
      models: imageModels,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Detection failed";
    return NextResponse.json({ ok: false, message, models: [] }, { status: 500 });
  }
}
