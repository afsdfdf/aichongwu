export type ModelAdapter =
  | "openai-edit"
  | "openai-images"
  | "stability"
  | "replicate"
  | "gemini"
  | "midjourney-async"
  | "dashscope-async"
  | "xfyun-async"
  | "custom";

export type ModelOption = {
  key: string;
  formKey: string;
  label: string;
  description: string;
  adapter: ModelAdapter;
  provider: string;
  modelName: string;
  defaultEndpoint?: string;
  docsHint: string;
  supportsImageTest: boolean;
  supportsPreviewGeneration: boolean;
  authType: "bearer" | "query" | "none";
};

export const MODEL_OPTIONS: ModelOption[] = [
  {
    key: "gpt-image-1",
    formKey: "gpt_image_1",
    label: "OpenAI GPT Image 1",
    description: "适合当前上传原图后生成商品效果图的主流程，支持图片编辑/重绘。",
    adapter: "openai-edit",
    provider: "OpenAI",
    modelName: "gpt-image-1",
    defaultEndpoint: "https://api.openai.com/v1/images/edits",
    docsHint: "填写 OpenAI API Key 即可；可选自定义 Base URL。",
    supportsImageTest: true,
    supportsPreviewGeneration: true,
    authType: "bearer",
  },
  {
    key: "dall-e-3",
    formKey: "dall_e_3",
    label: "DALL·E 3",
    description: "OpenAI 文生图模型，适合测试提示词与风格方向。",
    adapter: "openai-images",
    provider: "OpenAI",
    modelName: "dall-e-3",
    defaultEndpoint: "https://api.openai.com/v1/images/generations",
    docsHint: "走 OpenAI 官方 Images API。",
    supportsImageTest: true,
    supportsPreviewGeneration: true,
    authType: "bearer",
  },
  {
    key: "stable-diffusion-xl-1024-v1-0",
    formKey: "sdxl_1024_v1_0",
    label: "Stable Diffusion XL 1.0",
    description: "Stability AI 官方 SDXL 文生图接口。",
    adapter: "stability",
    provider: "Stability AI",
    modelName: "stable-diffusion-xl-1024-v1-0",
    defaultEndpoint:
      "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
    docsHint: "使用 Stability API Key；适合快速出测试图。",
    supportsImageTest: true,
    supportsPreviewGeneration: true,
    authType: "bearer",
  },
  {
    key: "stable-diffusion-3.5-large",
    formKey: "sd_3_5_large",
    label: "Stable Diffusion 3.5 Large",
    description: "Stability AI 新版 SD 3.5 大模型。",
    adapter: "stability",
    provider: "Stability AI",
    modelName: "stable-diffusion-3.5-large",
    defaultEndpoint:
      "https://api.stability.ai/v1/generation/stable-diffusion-3.5-large/text-to-image",
    docsHint: "使用 Stability API Key。",
    supportsImageTest: true,
    supportsPreviewGeneration: true,
    authType: "bearer",
  },
  {
    key: "black-forest-labs/flux-schnell",
    formKey: "flux_schnell",
    label: "Flux Schnell",
    description: "Replicate 平台上的 Flux Schnell。",
    adapter: "replicate",
    provider: "Replicate",
    modelName: "black-forest-labs/flux-schnell",
    defaultEndpoint:
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
    docsHint: "填写 Replicate API Token，可直接做生图测试。",
    supportsImageTest: true,
    supportsPreviewGeneration: true,
    authType: "bearer",
  },
  {
    key: "black-forest-labs/flux-pro",
    formKey: "flux_pro",
    label: "Flux Pro",
    description: "Replicate 平台上的 Flux Pro，高质量但更慢。",
    adapter: "replicate",
    provider: "Replicate",
    modelName: "black-forest-labs/flux-pro",
    defaultEndpoint:
      "https://api.replicate.com/v1/models/black-forest-labs/flux-pro/predictions",
    docsHint: "填写 Replicate API Token。",
    supportsImageTest: true,
    supportsPreviewGeneration: true,
    authType: "bearer",
  },
  {
    key: "gemini-2.5-flash-image",
    formKey: "gemini_2_5_flash_image",
    label: "Gemini 2.5 Flash Image",
    description: "Google Gemini 生图模型。",
    adapter: "gemini",
    provider: "Google",
    modelName: "gemini-2.5-flash-image",
    defaultEndpoint:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    docsHint: "填写 Google API Key，接口会以 query 参数方式带 key。",
    supportsImageTest: true,
    supportsPreviewGeneration: true,
    authType: "query",
  },
  {
    key: "midjourney-v6",
    formKey: "midjourney_v6",
    label: "Midjourney v6",
    description: "第三方 Midjourney 通用 API，一般为异步任务。",
    adapter: "midjourney-async",
    provider: "Midjourney",
    modelName: "midjourney-v6",
    defaultEndpoint: "https://api.mjapi.com/api/v1/mj/submit/imagine",
    docsHint: "通常只能测试鉴权与提交是否成功，返回任务号而非即时图片。",
    supportsImageTest: false,
    supportsPreviewGeneration: false,
    authType: "bearer",
  },
  {
    key: "wanx2.1-t2i-turbo",
    formKey: "wanx2_1_t2i_turbo",
    label: "阿里云 通义万相 2.1 Turbo",
    description: "DashScope 文生图，一般为异步任务。",
    adapter: "dashscope-async",
    provider: "DashScope",
    modelName: "wanx2.1-t2i-turbo",
    defaultEndpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
    docsHint: "通常返回任务状态，适合做配置校验。",
    supportsImageTest: false,
    supportsPreviewGeneration: false,
    authType: "bearer",
  },
  {
    key: "seedream-v4.5",
    formKey: "seedream_v4_5",
    label: "字节 Seedream v4.5",
    description: "作为第三方图像生成接口配置位使用。",
    adapter: "xfyun-async",
    provider: "Seedream / Spark API",
    modelName: "seedream-v4.5",
    defaultEndpoint: "https://spark-api.xf-yun.com/v1/images/generation",
    docsHint: "按你接入方的鉴权方式填写，默认作为异步/提交型接口处理。",
    supportsImageTest: false,
    supportsPreviewGeneration: false,
    authType: "bearer",
  },
  {
    key: "custom-webhook",
    formKey: "custom_webhook",
    label: "自定义 API",
    description: "自定义标准格式接口，返回 imageUrl 或 imageBase64。",
    adapter: "custom",
    provider: "Custom",
    modelName: "custom",
    defaultEndpoint: "",
    docsHint: "你可以自由填写端点，按统一 JSON 格式返回即可。",
    supportsImageTest: true,
    supportsPreviewGeneration: true,
    authType: "bearer",
  },
];

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

export function getModelOption(key: string) {
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
      return item.provider === "Google";
    }
    if (value.includes("api.mjapi.com")) {
      return item.provider === "Midjourney";
    }
    if (value.includes("dashscope.aliyuncs.com")) {
      return item.provider === "DashScope";
    }
    if (value.includes("spark-api.xf-yun.com")) {
      return item.provider === "Seedream / Spark API";
    }
    return candidate.includes(value) || value.includes(candidate.replace(/^https?:\/\//, ""));
  });
}
