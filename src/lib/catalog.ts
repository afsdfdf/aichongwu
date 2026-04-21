export type ModelOption = {
  key: string;
  label: string;
  description: string;
  adapter: "openai-edit" | "webhook";
  webhookEnv?: string;
};

export const MODEL_OPTIONS: ModelOption[] = [
  {
    key: "gpt-image-1",
    label: "OpenAI GPT Image 1",
    description: "开箱即用，支持上传原图后做风格化/商品效果图生成。",
    adapter: "openai-edit",
  },
  {
    key: "flux-webhook",
    label: "Flux (Webhook)",
    description: "通过你自己的 Flux API / Replicate / 工作流 webhook 接入。",
    adapter: "webhook",
    webhookEnv: "FLUX_WEBHOOK_URL",
  },
  {
    key: "stable-diffusion-webhook",
    label: "Stable Diffusion (Webhook)",
    description: "通过你自己的 SD API / ComfyUI / 工作流 webhook 接入。",
    adapter: "webhook",
    webhookEnv: "STABLE_DIFFUSION_WEBHOOK_URL",
  },
  {
    key: "midjourney-webhook",
    label: "Midjourney (Webhook)",
    description: "如你有合规可用的 Midjourney API 中转，可在这里切换。",
    adapter: "webhook",
    webhookEnv: "MIDJOURNEY_WEBHOOK_URL",
  },
  {
    key: "custom-webhook",
    label: "Custom Model (Webhook)",
    description: "任意自定义模型网关，返回图片 URL 或 base64 即可。",
    adapter: "webhook",
    webhookEnv: "CUSTOM_MODEL_WEBHOOK_URL",
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
