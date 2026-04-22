export type ModelAdapter =
  | "openai-edit"
  | "openai-images"
  | "openai-chat-image"
  | "stability"
  | "replicate"
  | "gemini"
  | "fal-queue"
  | "midjourney-async"
  | "dashscope-async"
  | "volcengine-async"
  | "xfyun-async"
  | "custom";

// ── Provider definition (shared API Key + Base URL) ──

export type ProviderDefinition = {
  id: string;
  label: string;
  description: string;
  authType: "bearer" | "query" | "none";
  defaultBaseUrl: string;
  docsHint: string;
  models: ModelDefinition[];
};

// ── Model definition (lives under a provider) ──

export type ModelDefinition = {
  id: string;
  label: string;
  adapter: ModelAdapter;
  modelName: string;
  defaultEndpoint: string;
  supportsImageTest: boolean;
  supportsPreviewGeneration: boolean;
  description: string;
};

// ── All providers ──

export const PROVIDERS: ProviderDefinition[] = [
  // ── 1. OpenAI ──
  {
    id: "openai",
    label: "OpenAI",
    description: "OpenAI 官方或兼容 API（支持中转站 one-api / new-api 等）",
    authType: "bearer",
    defaultBaseUrl: "https://api.openai.com/v1",
    docsHint: "填写 OpenAI API Key。如用中转站，修改 Base URL 即可。",
    models: [
      {
        id: "gpt-image-1",
        label: "GPT Image 1",
        adapter: "openai-edit",
        modelName: "gpt-image-1",
        defaultEndpoint: "/images/edits",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "支持上传原图后重绘，适合商品效果图主流程",
      },
      {
        id: "gpt-image-1.5",
        label: "GPT Image 1.5",
        adapter: "openai-images",
        modelName: "gpt-image-1.5",
        defaultEndpoint: "/images/generations",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "OpenAI 最新图像生成模型，复杂场景和迭代优化",
      },
      {
        id: "gpt-image-1-mini",
        label: "GPT Image 1 Mini",
        adapter: "openai-images",
        modelName: "gpt-image-1-mini",
        defaultEndpoint: "/images/generations",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "GPT Image 1 轻量版，更快速度更低成本",
      },
      {
        id: "dall-e-3",
        label: "DALL·E 3",
        adapter: "openai-images",
        modelName: "dall-e-3",
        defaultEndpoint: "/images/generations",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "文生图模型，适合测试提示词与风格方向",
      },
    ],
  },

  // ── 2. Stability AI ──
  {
    id: "stability",
    label: "Stability AI",
    description: "Stability AI Stable Image API",
    authType: "bearer",
    defaultBaseUrl: "https://api.stability.ai",
    docsHint: "填写 Stability API Key（platform.stability.ai 获取）。",
    models: [
      {
        id: "stable-image-ultra",
        label: "Stable Image Ultra",
        adapter: "stability",
        modelName: "stable-image-ultra",
        defaultEndpoint: "/v2beta/stable-image/generate/ultra",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Stability 旗舰模型，最高画质，适合最终输出",
      },
      {
        id: "stable-image-core",
        label: "Stable Image Core",
        adapter: "stability",
        modelName: "stable-image-core",
        defaultEndpoint: "/v2beta/stable-image/generate/core",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Stability 核心模型，速度与质量平衡",
      },
      {
        id: "sd3-large",
        label: "SD3 Large",
        adapter: "stability",
        modelName: "stable-diffusion-3-large",
        defaultEndpoint: "/v2beta/stable-image/generate/sd3",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Stable Diffusion 3 Large，开源最强",
      },
    ],
  },

  // ── 3. Replicate ──
  {
    id: "replicate",
    label: "Replicate",
    description: "Replicate 平台模型托管服务（Flux / Ideogram / Nano Banana 等）",
    authType: "bearer",
    defaultBaseUrl: "https://api.replicate.com",
    docsHint: "填写 Replicate API Token（replicate.com/account/api-tokens 获取）。",
    models: [
      {
        id: "flux-2-pro",
        label: "Flux 2 Pro",
        adapter: "replicate",
        modelName: "black-forest-labs/flux-2-pro",
        defaultEndpoint: "/v1/models/black-forest-labs/flux-2-pro/predictions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Flux 2 Pro，2026 最佳写实证，产品摄影首选",
      },
      {
        id: "flux-pro",
        label: "Flux 1.1 Pro",
        adapter: "replicate",
        modelName: "black-forest-labs/flux-pro",
        defaultEndpoint: "/v1/models/black-forest-labs/flux-pro/predictions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Flux 1.1 Pro，高质量但较慢",
      },
      {
        id: "flux-schnell",
        label: "Flux Schnell",
        adapter: "replicate",
        modelName: "black-forest-labs/flux-schnell",
        defaultEndpoint: "/v1/models/black-forest-labs/flux-schnell/predictions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Flux Schnell，超快速出图，适合预览",
      },
      {
        id: "ideogram-v3",
        label: "Ideogram v3",
        adapter: "replicate",
        modelName: "ideogram-ai/ideogram-v3",
        defaultEndpoint: "/v1/models/ideogram-ai/ideogram-v3/predictions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "文字渲染最强，海报/Logo/印刷品首选",
      },
      {
        id: "nano-banana-2",
        label: "Nano Banana 2",
        adapter: "replicate",
        modelName: "google/nano-banana-2",
        defaultEndpoint: "/v1/models/google/nano-banana-2/predictions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Google Gemini 3.1 Flash Image，高容量低成本",
      },
    ],
  },

  // ── 4. Google AI ──
  {
    id: "google",
    label: "Google AI",
    description: "Google Gemini 生图模型（Nano Banana 系列）",
    authType: "query",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    docsHint: "填写 Google AI API Key，接口以 query 参数 ?key= 鉴权。",
    models: [
      {
        id: "gemini-3.1-flash-image",
        label: "Gemini 3.1 Flash Image",
        adapter: "gemini",
        modelName: "gemini-3.1-flash-image-preview",
        defaultEndpoint: "/v1beta/models/gemini-3.1-flash-image-preview:generateContent",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Nano Banana 2，Google 最新生图模型，速度快成本低",
      },
      {
        id: "gemini-3-pro-image",
        label: "Gemini 3 Pro Image",
        adapter: "gemini",
        modelName: "gemini-3-pro-image-preview",
        defaultEndpoint: "/v1beta/models/gemini-3-pro-image-preview:generateContent",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Nano Banana Pro，推理引导生图，文字/图表渲染最强",
      },
      {
        id: "gemini-2.5-flash-image",
        label: "Gemini 2.5 Flash Image",
        adapter: "gemini",
        modelName: "gemini-2.5-flash-image",
        defaultEndpoint: "/v1beta/models/gemini-2.5-flash-image:generateContent",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "上一代稳定版，兼容性好",
      },
    ],
  },

  // ── 5. fal.ai ──
  {
    id: "fal",
    label: "fal.ai",
    description: "fal.ai 高性能生图推理平台（Flux / Ideogram / Nano Banana / GPT Image 等）",
    authType: "bearer",
    defaultBaseUrl: "https://queue.fal.run",
    docsHint: "填写 fal.ai API Key（fal.ai/dashboard/keys 获取）。",
    models: [
      {
        id: "fal-flux2-pro",
        label: "Flux 2 Pro (fal)",
        adapter: "fal-queue",
        modelName: "fal-ai/flux-2-pro",
        defaultEndpoint: "/fal-ai/flux-2-pro",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "fal.ai 上的 Flux 2 Pro，同步/异步双模式",
      },
      {
        id: "fal-flux-pro",
        label: "Flux 1.1 Pro (fal)",
        adapter: "fal-queue",
        modelName: "fal-ai/flux-pro",
        defaultEndpoint: "/fal-ai/flux-pro",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "fal.ai 上的 Flux Pro，高质量",
      },
      {
        id: "fal-flux-schnell",
        label: "Flux Schnell (fal)",
        adapter: "fal-queue",
        modelName: "fal-ai/flux/schnell",
        defaultEndpoint: "/fal-ai/flux/schnell",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "fal.ai 上的 Flux Schnell，最快出图",
      },
      {
        id: "fal-ideogram-v3",
        label: "Ideogram v3 (fal)",
        adapter: "fal-queue",
        modelName: "fal-ai/ideogram/v3",
        defaultEndpoint: "/fal-ai/ideogram/v3",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "fal.ai 上的 Ideogram v3，文字渲染最佳",
      },
      {
        id: "fal-nano-banana-pro",
        label: "Nano Banana Pro (fal)",
        adapter: "fal-queue",
        modelName: "fal-ai/nano-banana-pro",
        defaultEndpoint: "/fal-ai/nano-banana-pro",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "fal.ai 上的 Nano Banana Pro，推理引导生图",
      },
      {
        id: "fal-gpt-image-1.5",
        label: "GPT Image 1.5 (fal)",
        adapter: "fal-queue",
        modelName: "fal-ai/gpt-image-1.5",
        defaultEndpoint: "/fal-ai/gpt-image-1.5",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "fal.ai 上的 GPT Image 1.5，复杂场景",
      },
    ],
  },

  // ── 6. Midjourney ──
  {
    id: "midjourney",
    label: "Midjourney",
    description: "第三方 Midjourney API 代理（异步任务型）",
    authType: "bearer",
    defaultBaseUrl: "https://api.midapi.ai",
    docsHint: "填写 Midjourney 代理 API Key。提交后需轮询获取结果。",
    models: [
      {
        id: "midjourney-v6.1",
        label: "Midjourney v6.1",
        adapter: "midjourney-async",
        modelName: "midjourney-v6.1",
        defaultEndpoint: "/mj/v6.1/imagine",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "Midjourney v6.1，艺术感最强，异步任务",
      },
      {
        id: "midjourney-v6",
        label: "Midjourney v6",
        adapter: "midjourney-async",
        modelName: "midjourney-v6",
        defaultEndpoint: "/mj/v6/imagine",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "Midjourney v6，经典版本，异步任务",
      },
    ],
  },

  // ── 7. 阿里云 DashScope ──
  {
    id: "dashscope",
    label: "阿里云百炼",
    description: "阿里云通义万相文生图（wan2.7 / wan2.1 系列）",
    authType: "bearer",
    defaultBaseUrl: "https://dashscope.aliyuncs.com",
    docsHint: "填写 DashScope API Key（百炼控制台获取）。",
    models: [
      {
        id: "wan2.7-image-pro",
        label: "万相 2.7 Pro",
        adapter: "dashscope-async",
        modelName: "wan2.7-image-pro",
        defaultEndpoint: "/api/v1/services/aigc/multimodal-generation/generation",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "万相 2.7 专业版，支持 4K 高清输出，文生图+图编辑",
      },
      {
        id: "wan2.7-image",
        label: "万相 2.7",
        adapter: "dashscope-async",
        modelName: "wan2.7-image",
        defaultEndpoint: "/api/v1/services/aigc/multimodal-generation/generation",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "万相 2.7 标准版，生成速度更快，1K/2K 输出",
      },
      {
        id: "wanx2.1-turbo",
        label: "万相 2.1 Turbo",
        adapter: "dashscope-async",
        modelName: "wanx2.1-t2i-turbo",
        defaultEndpoint: "/api/v1/services/aigc/text2image/image-synthesis",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "上一代万相 2.1 Turbo，异步任务",
      },
    ],
  },

  // ── 8. 火山引擎（即梦 AI）──
  {
    id: "volcengine",
    label: "火山引擎 / 即梦 AI",
    description: "字节跳动即梦 AI 图片生成（Seedream / Jimeng 4.x 系列）",
    authType: "bearer",
    defaultBaseUrl: "https://visual.volcengineapi.com",
    docsHint: "填写火山引擎 API Key（火山引擎控制台获取）。",
    models: [
      {
        id: "jimeng-4.6",
        label: "即梦 4.6",
        adapter: "volcengine-async",
        modelName: "jimeng-4.6",
        defaultEndpoint: "/2022-08-31/cv/v1/jimeng/high_aes_general",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "即梦 AI 图片生成 4.6 最新版，画质最高",
      },
      {
        id: "jimeng-4.0",
        label: "即梦 4.0",
        adapter: "volcengine-async",
        modelName: "jimeng-4.0",
        defaultEndpoint: "/2022-08-31/cv/v1/jimeng/high_aes_general",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "即梦 AI 图片生成 4.0，稳定版",
      },
      {
        id: "seedream-5.0",
        label: "Seedream 5.0",
        adapter: "volcengine-async",
        modelName: "seedream-5.0",
        defaultEndpoint: "/2022-08-31/cv/v1/jimeng/high_aes_general",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "Seedream 5.0，信息图表和实时数据场景",
      },
    ],
  },

  // ── 9. 讯飞星火 ──
  {
    id: "xfyun",
    label: "讯飞星火",
    description: "讯飞星火大模型图片生成",
    authType: "bearer",
    defaultBaseUrl: "https://spark-api.xf-yun.com",
    docsHint: "填写讯飞星火 API Key。",
    models: [
      {
        id: "xfyun-image",
        label: "星火图片生成",
        adapter: "xfyun-async",
        modelName: "xfyun-image",
        defaultEndpoint: "/v1/images/generation",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "讯飞星火图片生成，异步任务型",
      },
    ],
  },

  // ── 10. PoloAI 中转站 ──
  {
    id: "poloai",
    label: "PoloAI 中转站",
    description: "PoloAI 聚合中转站 — Gemini / Doubao / Sora2 多模型，OpenAI Chat 格式生图",
    authType: "bearer",
    defaultBaseUrl: "https://nanoapi.poloai.top/v1",
    docsHint: "填写 PoloAI 中转站 API Key。接口走 /v1/chat/completions，图片内嵌在回复 content 中。",
    models: [
      {
        id: "poloai-gemini-3.1-flash-image",
        label: "Gemini 3.1 Flash Image",
        adapter: "openai-chat-image",
        modelName: "gemini-3.1-flash-image-preview",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Nano Banana 2，Google 最新生图模型，速度快成本低",
      },
      {
        id: "poloai-gemini-3.1-flash-image-high",
        label: "Gemini 3.1 Flash Image (高清)",
        adapter: "openai-chat-image",
        modelName: "gemini-3.1-flash-image-preview-high",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Nano Banana 2 高清版，画质更精细",
      },
      {
        id: "poloai-gemini-3-pro-image",
        label: "Gemini 3 Pro Image",
        adapter: "openai-chat-image",
        modelName: "gemini-3-pro-image-preview-high",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Nano Banana Pro，推理引导生图，文字/图表渲染最强",
      },
      {
        id: "poloai-gemini-2.5-flash-image",
        label: "Gemini 2.5 Flash Image",
        adapter: "openai-chat-image",
        modelName: "gemini-2.5-flash-image",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "上一代稳定版，兼容性好",
      },
      {
        id: "poloai-gemini-2.5-flash-image-preview",
        label: "Gemini 2.5 Flash Image (Preview)",
        adapter: "openai-chat-image",
        modelName: "gemini-2.5-flash-image-preview",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "Gemini 2.5 Flash Image 预览版",
      },
      {
        id: "poloai-doubao-seedream-4.0",
        label: "豆包 Seedream 4.0",
        adapter: "openai-chat-image",
        modelName: "doubao-seedream-4-0-250828",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "字节豆包 Seedream 4.0，中文场景理解优秀",
      },
      {
        id: "poloai-sora2-landscape",
        label: "Sora2 横屏 5s",
        adapter: "openai-chat-image",
        modelName: "sora2-landscape",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "OpenAI Sora2 横屏 5 秒视频",
      },
      {
        id: "poloai-sora2-landscape-15s",
        label: "Sora2 横屏 15s",
        adapter: "openai-chat-image",
        modelName: "sora2-landscape-15s",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "OpenAI Sora2 横屏 15 秒视频",
      },
      {
        id: "poloai-sora2-portrait",
        label: "Sora2 竖屏 5s",
        adapter: "openai-chat-image",
        modelName: "sora2-portrait",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "OpenAI Sora2 竖屏 5 秒视频",
      },
      {
        id: "poloai-sora2-portrait-15s",
        label: "Sora2 竖屏 15s",
        adapter: "openai-chat-image",
        modelName: "sora2-portrait-15s",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "OpenAI Sora2 竖屏 15 秒视频",
      },
      {
        id: "poloai-sora2-pro-landscape-25s",
        label: "Sora2 Pro 横屏 25s",
        adapter: "openai-chat-image",
        modelName: "sora2-pro-landscape-25s",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "Sora2 Pro 横屏 25 秒，画质最佳",
      },
      {
        id: "poloai-sora2-pro-portrait-25s",
        label: "Sora2 Pro 竖屏 25s",
        adapter: "openai-chat-image",
        modelName: "sora2-pro-portrait-25s",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "Sora2 Pro 竖屏 25 秒，画质最佳",
      },
      {
        id: "poloai-sora2-pro-landscape-hd-10s",
        label: "Sora2 Pro 横屏 HD 10s",
        adapter: "openai-chat-image",
        modelName: "sora2-pro-landscape-hd-10s",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "Sora2 Pro 横屏 HD 10 秒",
      },
      {
        id: "poloai-sora2-pro-portrait-hd-10s",
        label: "Sora2 Pro 竖屏 HD 10s",
        adapter: "openai-chat-image",
        modelName: "sora2-pro-portrait-hd-10s",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "Sora2 Pro 竖屏 HD 10 秒",
      },
      {
        id: "poloai-sora2-pro-landscape-hd-15s",
        label: "Sora2 Pro 横屏 HD 15s",
        adapter: "openai-chat-image",
        modelName: "sora2-pro-landscape-hd-15s",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "Sora2 Pro 横屏 HD 15 秒",
      },
      {
        id: "poloai-sora2-pro-portrait-hd-15s",
        label: "Sora2 Pro 竖屏 HD 15s",
        adapter: "openai-chat-image",
        modelName: "sora2-pro-portrait-hd-15s",
        defaultEndpoint: "/chat/completions",
        supportsImageTest: false,
        supportsPreviewGeneration: false,
        description: "Sora2 Pro 竖屏 HD 15 秒",
      },
    ],
  },

  // ── 11. 自定义 API ──
  {
    id: "custom",
    label: "自定义 API",
    description: "任何兼容 OpenAI Images 格式或自定义 JSON 格式的接口",
    authType: "bearer",
    defaultBaseUrl: "",
    docsHint: "填写完整端点 URL，按统一 JSON 格式返回即可。",
    models: [
      {
        id: "custom-endpoint",
        label: "自定义模型",
        adapter: "custom",
        modelName: "custom",
        defaultEndpoint: "",
        supportsImageTest: true,
        supportsPreviewGeneration: true,
        description: "自由填写端点，支持 OpenAI Images 兼容格式",
      },
    ],
  },
];

// ── Lookup helpers ──

export function getProviderById(id: string): ProviderDefinition | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getModelDefById(modelId: string): { provider: ProviderDefinition; model: ModelDefinition } | null {
  for (const provider of PROVIDERS) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) return { provider, model };
  }
  return null;
}

export function getAllModelDefinitions(): Array<{ provider: ProviderDefinition; model: ModelDefinition }> {
  const result: Array<{ provider: ProviderDefinition; model: ModelDefinition }> = [];
  for (const provider of PROVIDERS) {
    for (const model of provider.models) {
      result.push({ provider, model });
    }
  }
  return result;
}

// ── Backward-compatible MODEL_OPTIONS (for ai.ts / store.ts transition) ──

export type ModelOption = {
  key: string;
  formKey: string;
  label: string;
  description: string;
  adapter: ModelAdapter;
  provider: string;
  modelName: string;
  defaultEndpoint: string;
  docsHint: string;
  supportsImageTest: boolean;
  supportsPreviewGeneration: boolean;
  authType: "bearer" | "query" | "none";
};

export const MODEL_OPTIONS: ModelOption[] = getAllModelDefinitions().map(({ provider, model }) => ({
  key: model.id,
  formKey: model.id.replace(/[^a-zA-Z0-9]/g, "_"),
  label: model.label,
  description: model.description,
  adapter: model.adapter,
  provider: provider.label,
  modelName: model.modelName,
  defaultEndpoint: `${provider.defaultBaseUrl}${model.defaultEndpoint}`,
  docsHint: provider.docsHint,
  supportsImageTest: model.supportsImageTest,
  supportsPreviewGeneration: model.supportsPreviewGeneration,
  authType: provider.authType,
}));

export function getModelOption(key: string): ModelOption | null {
  return MODEL_OPTIONS.find((item) => item.key === key) ?? null;
}

export function detectModelsFromEndpoint(endpoint: string) {
  const value = endpoint.trim().toLowerCase();
  if (!value) return [];

  return MODEL_OPTIONS.filter((item) => {
    const candidate = (item.defaultEndpoint || "").toLowerCase();
    if (!candidate) return false;

    if (value.includes("api.openai.com")) {
      return item.provider === "OpenAI";
    }
    if (value.includes("api.stability.ai")) {
      return item.provider === "Stability AI";
    }
    if (value.includes("api.replicate.com")) {
      return item.provider === "Replicate";
    }
    if (value.includes("generativelanguage.googleapis.com")) {
      return item.provider === "Google AI";
    }
    if (value.includes("queue.fal.run") || value.includes("fal.ai")) {
      return item.provider === "fal.ai";
    }
    if (value.includes("midapi.ai") || value.includes("mjapi.com")) {
      return item.provider === "Midjourney";
    }
    if (value.includes("dashscope.aliyuncs.com") || value.includes("dashscope-intl")) {
      return item.provider === "阿里云百炼";
    }
    if (value.includes("visual.volcengineapi.com") || value.includes("volcengine")) {
      return item.provider === "火山引擎 / 即梦 AI";
    }
    if (value.includes("spark-api.xf-yun.com")) {
      return item.provider === "讯飞星火";
    }
    if (value.includes("nanoapi.poloai.top") || value.includes("poloai")) {
      return item.provider === "PoloAI 中转站";
    }
    return candidate.includes(value) || value.includes(candidate.replace(/^https?:\/\//, ""));
  });
}

// ── Default prompts (unchanged) ──

export const DEFAULT_PROMPTS = [
  {
    productType: "frame",
    displayName: "相框",
    promptTemplate:
      "Create a photorealistic e-commerce mockup for a {{productType}} using the uploaded customer photo as the main visual. Keep the original subject recognizable, improve lighting, preserve important facial details, and present it as a premium ready-to-buy product shot on a clean background.",
  },
  {
    productType: "fridge-magnet",
    displayName: "冰箱贴",
    promptTemplate:
      "Turn the uploaded customer photo into a realistic {{productType}} product preview. Keep the image recognizable, adapt composition to magnet proportions, use soft commercial lighting, and output a polished marketplace-ready mockup.",
  },
  {
    productType: "keychain",
    displayName: "钥匙扣",
    promptTemplate:
      "Generate a realistic {{productType}} product mockup from the uploaded customer photo. Preserve the main person or pet, fit the crop naturally into a keychain design, and make it look like a premium product listing image.",
  },
];
