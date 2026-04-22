import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/providers/detect-models
 * Body: { baseUrl: string, apiKey: string }
 *
 * Calls the provider's /v1/models endpoint and returns the list of available models.
 * Works with any OpenAI-compatible API (one-api, new-api, etc.)
 */
export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ message: "未登录" }, { status: 401 });
    }

    const body = (await request.json()) as { baseUrl?: string; apiKey?: string };
    if (!body.baseUrl || !body.apiKey) {
      return NextResponse.json({ message: "缺少 baseUrl 或 apiKey" }, { status: 400 });
    }

    // Normalize base URL — strip trailing slash
    let baseUrl = body.baseUrl.replace(/\/+$/, "");

    // Build the models endpoint URL
    let modelsUrl: string;
    if (baseUrl.endsWith("/models") || baseUrl.endsWith("/v1/models")) {
      modelsUrl = baseUrl;
    } else if (baseUrl.endsWith("/v1")) {
      modelsUrl = `${baseUrl}/models`;
    } else if (baseUrl.includes("/v1/")) {
      // e.g. https://api.example.com/v1/chat/completions -> /v1/models
      const v1Idx = baseUrl.indexOf("/v1/");
      modelsUrl = baseUrl.substring(0, v1Idx + 3) + "/models";
    } else {
      // Try /v1/models as default
      modelsUrl = `${baseUrl}/v1/models`;
    }

    const response = await fetch(modelsUrl, {
      headers: {
        Authorization: `Bearer ${body.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json({
        ok: false,
        message: `API 返回 ${response.status}: ${text.slice(0, 200) || response.statusText}`,
        models: [],
      });
    }

    const data = (await response.json()) as {
      data?: Array<{ id: string; object?: string }>;
      models?: Array<{ id: string }>;
    };
    const rawModels: Array<{ id: string }> = data.data || data.models || [];

    // Filter: only keep models that look like image generation models
    const IMAGE_KEYWORDS = [
      "image", "dall", "gpt-image", "flux", "stable", "sdxl", "sd3",
      "midjourney", "ideogram", "banana", "nano", "gemini", "wan",
      "seedream", "doubao", "sora", "minimax", "kling", "cogview",
      "playground", "recraft", "leonardo", "pix-art", "pixart",
      "turbo", "photo", "vision", "imagen",
    ];

    // Categorize models
    const imageModels: Array<{ id: string; type: string; matchedKeywords: string[] }> = [];
    const otherModels: Array<{ id: string; type: string }> = [];

    for (const m of rawModels) {
      const id = m.id.toLowerCase();
      const matched = IMAGE_KEYWORDS.filter((kw) => id.includes(kw));

      if (matched.length > 0) {
        // Determine type: video vs image
        const isVideo = id.includes("sora") || id.includes("video") || id.includes("kling") || id.includes("minimax-video");
        imageModels.push({
          id: m.id,
          type: isVideo ? "video" : "image",
          matchedKeywords: matched,
        });
      } else {
        otherModels.push({ id: m.id, type: "other" });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `检测到 ${rawModels.length} 个模型，其中 ${imageModels.length} 个生图模型`,
      total: rawModels.length,
      models: imageModels,
      otherModels: otherModels.slice(0, 50), // cap at 50 for non-image models
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "检测失败";
    return NextResponse.json({ ok: false, message, models: [] }, { status: 500 });
  }
}
