"use client";

import { useActionState } from "react";
import { saveStoreSettingAction } from "@/app/admin/(protected)/actions";
import { MODEL_OPTIONS } from "@/lib/catalog";

const initialState = { ok: false, message: "" };

type ProviderSummary = {
  key: string;
  label: string;
  webhookUrl: string | null;
  baseUrl: string | null;
  hasApiKey: boolean;
};

export function ModelSettingsForm({
  activeModel,
  requireGeneration,
  widgetAccentColor,
  widgetButtonText,
  providers,
}: {
  activeModel: string;
  requireGeneration: boolean;
  widgetAccentColor: string;
  widgetButtonText: string;
  providers: ProviderSummary[];
}) {
  const [state, formAction] = useActionState(saveStoreSettingAction, initialState);
  const providerMap = Object.fromEntries(providers.map((item) => [item.key, item]));

  return (
    <form action={formAction} className="glass space-y-6 rounded-[28px] p-6">
      <div>
        <h3 className="text-xl font-semibold text-white">模型与小组件设置</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          这里控制默认模型、商品页按钮样式，以及各个模型提供方的 API Key / webhook。
          API Key 会在服务端加密后写入 S3，不需要你手动配置模型环境变量。
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-slate-300">默认模型</label>
        <select
          name="activeModel"
          defaultValue={activeModel}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
        >
          {MODEL_OPTIONS.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-slate-300">按钮文字</label>
          <input
            name="widgetButtonText"
            defaultValue={widgetButtonText}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">强调色</label>
          <input
            name="widgetAccentColor"
            defaultValue={widgetAccentColor}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm text-slate-300">
        <input type="checkbox" name="requireGeneration" defaultChecked={requireGeneration} className="size-4" />
        顾客必须先生成效果图，才能加入购物车
      </label>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProviderCard
          title="OpenAI GPT Image 1"
          hint={providerMap["gpt-image-1"]?.hasApiKey ? "已保存 API Key，留空表示保留不变" : "未保存 API Key"}
        >
          <Field label="OpenAI API Key" name="openaiApiKey" placeholder="sk-..." />
          <Field
            label="OpenAI Base URL（可选）"
            name="openaiBaseUrl"
            defaultValue={providerMap["gpt-image-1"]?.baseUrl ?? ""}
            placeholder="https://api.openai.com/v1"
          />
        </ProviderCard>

        <ProviderCard
          title="Flux Webhook"
          hint={providerMap["flux-webhook"]?.hasApiKey ? "已保存 API Key，留空表示保留不变" : "适合接 Replicate / 你自己的网关"}
        >
          <Field
            label="Flux Webhook URL"
            name="fluxWebhookUrl"
            defaultValue={providerMap["flux-webhook"]?.webhookUrl ?? ""}
            placeholder="https://your-flux-api.example.com/generate"
          />
          <Field label="Flux API Key（可选）" name="fluxApiKey" placeholder="token / key" />
        </ProviderCard>

        <ProviderCard
          title="Stable Diffusion Webhook"
          hint={providerMap["stable-diffusion-webhook"]?.hasApiKey ? "已保存 API Key，留空表示保留不变" : "适合接 ComfyUI / A1111 / 自定义 SD 服务"}
        >
          <Field
            label="SD Webhook URL"
            name="sdWebhookUrl"
            defaultValue={providerMap["stable-diffusion-webhook"]?.webhookUrl ?? ""}
            placeholder="https://your-sd-api.example.com/generate"
          />
          <Field label="SD API Key（可选）" name="sdApiKey" placeholder="token / key" />
        </ProviderCard>

        <ProviderCard
          title="Midjourney / Custom 网关"
          hint="如你有可用中转服务，可在这里写 webhook"
        >
          <Field
            label="Midjourney Webhook URL"
            name="midjourneyWebhookUrl"
            defaultValue={providerMap["midjourney-webhook"]?.webhookUrl ?? ""}
            placeholder="https://your-midjourney-gateway.example.com/generate"
          />
          <Field label="Midjourney API Key（可选）" name="midjourneyApiKey" placeholder="token / key" />
          <Field
            label="Custom Webhook URL"
            name="customWebhookUrl"
            defaultValue={providerMap["custom-webhook"]?.webhookUrl ?? ""}
            placeholder="https://your-custom-api.example.com/generate"
          />
          <Field label="Custom API Key（可选）" name="customApiKey" placeholder="token / key" />
        </ProviderCard>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-400">{state.message}</p>
        <button
          type="submit"
          className="rounded-2xl bg-sky-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
        >
          保存设置
        </button>
      </div>
    </form>
  );
}

function ProviderCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <h4 className="text-lg font-semibold text-white">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-400">{hint}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-300">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
      />
    </div>
  );
}
