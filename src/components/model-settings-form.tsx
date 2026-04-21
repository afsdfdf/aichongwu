"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, TestTube2, WandSparkles } from "lucide-react";
import { saveStoreSettingAction } from "@/app/admin/(protected)/actions";
import { MODEL_OPTIONS } from "@/lib/catalog";

const initialState = { ok: false, message: "" };

type ProviderSummary = {
  key: string;
  label: string;
  webhookUrl: string | null;
  baseUrl: string | null;
  hasApiKey: boolean;
  isEnabled: boolean;
  option?: {
    key: string;
    formKey: string;
    label: string;
    description: string;
    provider: string;
    modelName: string;
    defaultEndpoint?: string;
    docsHint: string;
    supportsImageTest: boolean;
    supportsPreviewGeneration: boolean;
    authType: "bearer" | "query" | "none";
  } | null;
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
  const providerMap = useMemo(() => Object.fromEntries(providers.map((item) => [item.key, item])), [providers]);

  return (
    <form action={formAction} className="admin-panel space-y-6 p-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">模型与 API 配置中心</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              统一在这里管理模型端点、API Key、按钮样式，并直接做配置校验与生图测试。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="按钮文字" name="widgetButtonText" defaultValue={widgetButtonText} />
            <Field label="主色" name="widgetAccentColor" defaultValue={widgetAccentColor} />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-600">默认模型</label>
            <select
              name="activeModel"
              defaultValue={activeModel}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            >
              {MODEL_OPTIONS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <input type="checkbox" name="requireGeneration" defaultChecked={requireGeneration} className="size-4" />
            顾客必须先生成效果图，才能加入购物车
          </label>
        </div>

        <ButtonPreviewCard color={widgetAccentColor} text={widgetButtonText} />
      </div>

      <div className="grid gap-4">
        {MODEL_OPTIONS.map((option) => {
          const provider = providerMap[option.key];
          const endpointValue = provider?.webhookUrl || option.defaultEndpoint || "";
          const baseUrlValue = provider?.baseUrl || "";
          return (
            <ProviderCard
              key={option.key}
              option={option}
              hasApiKey={Boolean(provider?.hasApiKey)}
              endpointValue={endpointValue}
              baseUrlValue={baseUrlValue}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{state.message}</p>
        <button
          type="submit"
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          保存所有配置
        </button>
      </div>
    </form>
  );
}

function ProviderCard({
  option,
  hasApiKey,
  endpointValue,
  baseUrlValue,
}: {
  option: (typeof MODEL_OPTIONS)[number];
  hasApiKey: boolean;
  endpointValue: string;
  baseUrlValue: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-semibold text-slate-900">{option.label}</h4>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
              {option.provider}
            </span>
            {hasApiKey ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-600">
                <CheckCircle2 className="size-3.5" />
                已保存 API Key
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{option.description}</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{option.docsHint}</p>
        </div>
        <ProviderTools option={option} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <Field
          label="API 端点"
          name={`${option.formKey}__endpoint`}
          defaultValue={endpointValue}
          placeholder={option.defaultEndpoint || "https://api.example.com/generate"}
        />
        <Field
          label="API Key"
          name={`${option.formKey}__api_key`}
          placeholder={
            option.authType === "query" ? "Google / Query API Key" : option.authType === "none" ? "可留空" : "Bearer Token / API Key"
          }
        />
        <Field
          label="Base URL / 额外地址（可选）"
          name={`${option.formKey}__base_url`}
          defaultValue={baseUrlValue}
          placeholder={option.key.startsWith("gpt") || option.key === "dall-e-3" ? "https://api.openai.com/v1" : ""}
        />
      </div>
    </div>
  );
}

function ProviderTools({ option }: { option: (typeof MODEL_OPTIONS)[number] }) {
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingImage, setTestingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  async function testConnection() {
    setTestingConnection(true);
    setMessage("");
    setPreviewUrl("");
    const response = await fetch("/api/providers/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelKey: option.key }),
    });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message || (response.ok ? "配置正常" : "配置异常"));
    setTestingConnection(false);
  }

  async function testImage() {
    setTestingImage(true);
    setMessage("");
    setPreviewUrl("");
    const response = await fetch("/api/providers/test-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelKey: option.key,
        prompt:
          "A premium pet memorial portrait, centered composition, soft studio lighting, elegant circular frame, realistic texture, clean background.",
      }),
    });
    const payload = (await response.json()) as { message?: string; outputImageUrl?: string };
    setMessage(payload.message || (response.ok ? "测试完成" : "测试失败"));
    setPreviewUrl(payload.outputImageUrl || "");
    setTestingImage(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={testConnection}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
      >
        {testingConnection ? <LoaderCircle className="size-4 animate-spin" /> : <TestTube2 className="size-4" />}
        测试 API
      </button>
      <button
        type="button"
        onClick={testImage}
        disabled={!option.supportsImageTest || testingImage}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {testingImage ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
        生图测试
      </button>
      {message ? <span className="text-xs text-slate-500">{message}</span> : null}
      {previewUrl ? (
        <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline">
          打开测试图
        </a>
      ) : null}
    </div>
  );
}

function ButtonPreviewCard({ color, text }: { color: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
      <p className="text-sm font-medium text-slate-700">店铺按钮预览</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        这里预览 Shopify 商品页中的“生成效果图”按钮，方便统一店铺主色与文案。
      </p>
      <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="space-y-3">
          <div className="h-3 w-32 rounded-full bg-slate-100" />
          <div className="h-3 w-52 rounded-full bg-slate-100" />
          <button
            type="button"
            style={{ backgroundColor: color || "#2563eb" }}
            className="mt-2 w-full rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-sm"
          >
            {text || "生成效果图"}
          </button>
        </div>
      </div>
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
      <label className="text-sm text-slate-600">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
      />
    </div>
  );
}
