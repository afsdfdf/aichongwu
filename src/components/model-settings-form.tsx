"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Save,
  TestTube2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { detectModelsFromEndpoint, MODEL_OPTIONS } from "@/lib/catalog";
import { saveStoreSettingAction } from "@/app/admin/(protected)/actions";

const initialState = { ok: false, message: "" };

type ProviderSummary = {
  key: string;
  label: string;
  webhookUrl: string | null;
  baseUrl: string | null;
  modelName: string;
  hasApiKey: boolean;
  isEnabled: boolean;
  priority: number;
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
  const [state, formAction, pending] = useActionState(saveStoreSettingAction, initialState);
  const [listMessage, setListMessage] = useState("");
  const providerMap = useMemo(() => Object.fromEntries(providers.map((item) => [item.key, item])), [providers]);
  const [selectedModelKey, setSelectedModelKey] = useState(activeModel);
  const [selectedEndpointTemplate, setSelectedEndpointTemplate] = useState(activeModel);

  const selectedOption = MODEL_OPTIONS.find((item) => item.key === selectedModelKey) ?? MODEL_OPTIONS[0];
  const selectedProvider = providerMap[selectedOption.key];
  const endpointValue = selectedProvider?.webhookUrl || selectedOption.defaultEndpoint || "";
  const detectedModels = useMemo(() => detectModelsFromEndpoint(endpointValue), [endpointValue]);
  const endpointTemplates = MODEL_OPTIONS.filter((item) => item.defaultEndpoint);
  const configuredModels = useMemo(
    () =>
      providers
        .filter(
          (item) =>
            item.hasApiKey ||
            Boolean(item.baseUrl) ||
            Boolean(item.webhookUrl && item.webhookUrl !== item.option?.defaultEndpoint),
        )
        .sort((a, b) => a.priority - b.priority),
    [providers],
  );

  async function manageProvider(
    action: "toggle" | "delete" | "priority" | "set_main",
    payload: Record<string, unknown>,
  ) {
    const response = await fetch("/api/providers/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = (await response.json()) as { message?: string };
    setListMessage(data.message || (response.ok ? "已更新" : "更新失败"));
    if (response.ok) {
      window.location.reload();
    }
  }

  return (
    <form action={formAction} className="admin-panel space-y-5 p-5">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">模型与 API 配置中心</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              先选择全球常见生图 API 端点模板，或者直接填写你自己的端点；然后选择模型并填写模型 ID。
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-600">API 端点模板</label>
            <select
              value={selectedEndpointTemplate}
              onChange={(event) => {
                setSelectedEndpointTemplate(event.target.value);
                setSelectedModelKey(event.target.value);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            >
              {endpointTemplates.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label} · {item.defaultEndpoint}
                </option>
              ))}
              <option value="custom-webhook">自定义 API · 自由填写端点</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="API 端点"
              name="endpointUrl"
              defaultValue={endpointValue}
              placeholder="https://api.example.com/generate"
            />
            <Field
              label="模型 ID / 模型名称"
              name="modelName"
              defaultValue={selectedProvider?.modelName || selectedOption.modelName}
              placeholder="如 gpt-image-1 / flux-pro / stable-diffusion-3.5-large"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-600">兼容模型选择</label>
            <select
              name="activeModel"
              value={selectedModelKey}
              onChange={(event) => setSelectedModelKey(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            >
              {(detectedModels.length > 0 ? detectedModels : MODEL_OPTIONS).map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              {detectedModels.length > 0
                ? `当前端点识别出 ${detectedModels.length} 个兼容模型，可直接选择。`
                : "当前端点未识别到常见模型，可手动输入模型 ID 并选择自定义 API。"}
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-700">店铺按钮预览</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            当前店铺会使用这个按钮文案与颜色，供商品页上传和生成预览使用。
          </p>
          <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-5">
            <div className="space-y-3">
              <div className="h-3 w-32 rounded-full bg-slate-100" />
              <div className="h-3 w-52 rounded-full bg-slate-100" />
              <button
                type="button"
                style={{ backgroundColor: widgetAccentColor || "#2563eb" }}
                className="mt-2 w-full rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-sm"
              >
                {widgetButtonText || "生成效果图"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-semibold text-slate-900">{selectedOption.label}</h4>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                {selectedOption.provider}
              </span>
              {selectedProvider?.hasApiKey ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-600">
                  <CheckCircle2 className="size-3.5" />
                  已保存 API Key
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                  尚未保存 API Key
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{selectedOption.description}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{selectedOption.docsHint}</p>
          </div>
          <ProviderTools option={selectedOption} />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_0.8fr_0.8fr_160px_140px]">
          <Field
            label="API Key"
            name="apiKey"
            placeholder={
              selectedOption.authType === "query"
                ? "Google / Query API Key"
                : selectedOption.authType === "none"
                  ? "可留空"
                  : "Bearer Token / API Key"
            }
          />
          <Field
            label="Base URL / 额外地址（可选）"
            name="baseUrl"
            defaultValue={selectedProvider?.baseUrl || ""}
            placeholder={
              selectedOption.key.startsWith("gpt") || selectedOption.key === "dall-e-3"
                ? "https://api.openai.com/v1"
                : ""
            }
          />
          <Field
            label="优先级"
            name={`${selectedOption.formKey}__priority`}
            defaultValue={String(selectedProvider?.priority || 1)}
            placeholder="1"
          />
          <div className="space-y-2">
            <label className="text-sm text-slate-600">启用</label>
            <label className="flex h-[50px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
              <input
                type="checkbox"
                name={`${selectedOption.formKey}__enabled`}
                defaultChecked={selectedProvider?.isEnabled ?? true}
                className="size-4"
              />
              启用
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-blue-900">保存配置</p>
            <p className="mt-1 text-xs text-blue-800">
              保存后会自动加入下方“已配置成功的模型”列表，可进一步启停、设主模型、测试和排序。
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <Save className="size-4" />
            {pending ? "保存中..." : "保存当前模型配置"}
          </button>
        </div>
      </div>

      <ConfiguredModelsTable
        configuredModels={configuredModels}
        activeModel={activeModel}
        listMessage={listMessage}
        onEdit={(key) => setSelectedModelKey(key)}
        onManage={manageProvider}
      />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{state.message}</p>
        <button
          type="submit"
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          保存全部配置
        </button>
      </div>
    </form>
  );
}

function ConfiguredModelsTable({
  configuredModels,
  activeModel,
  listMessage,
  onEdit,
  onManage,
}: {
  configuredModels: ProviderSummary[];
  activeModel: string;
  listMessage: string;
  onEdit: (key: string) => void;
  onManage: (
    action: "toggle" | "delete" | "priority" | "set_main",
    payload: Record<string, unknown>,
  ) => Promise<void>;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-slate-900">已配置成功的模型</h4>
          <p className="mt-1 text-sm text-slate-500">
            保存成功后会自动出现在这里。支持删除模型、测试模型、启用/停用模型、设置优先级；当主模型请求错误时，
            系统会自动切换到下一个已启用模型。
          </p>
        </div>
        {listMessage ? <span className="text-sm text-slate-500">{listMessage}</span> : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="grid grid-cols-[1.4fr_1fr_90px_90px_120px_1.3fr] bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
          <span>模型</span>
          <span>端点</span>
          <span>状态</span>
          <span>优先级</span>
          <span>主模型</span>
          <span>操作</span>
        </div>
        {configuredModels.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">还没有成功保存的模型。</div>
        ) : (
          configuredModels.map((model) => (
            <ConfiguredModelRow
              key={model.key}
              model={model}
              isMain={model.key === activeModel}
              onEdit={() => onEdit(model.key)}
              onManage={onManage}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConfiguredModelRow({
  model,
  isMain,
  onEdit,
  onManage,
}: {
  model: ProviderSummary;
  isMain: boolean;
  onEdit: () => void;
  onManage: (
    action: "toggle" | "delete" | "priority" | "set_main",
    payload: Record<string, unknown>,
  ) => Promise<void>;
}) {
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingImage, setTestingImage] = useState(false);

  async function testConnection() {
    setTestingConnection(true);
    await fetch("/api/providers/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelKey: model.key }),
    });
    setTestingConnection(false);
  }

  async function testImage() {
    setTestingImage(true);
    await fetch("/api/providers/test-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelKey: model.key,
        prompt:
          "A premium pet memorial portrait, centered composition, soft studio lighting, elegant circular frame, realistic texture, clean background.",
      }),
    });
    setTestingImage(false);
  }

  return (
    <div className="grid grid-cols-[1.4fr_1fr_90px_90px_120px_1.3fr] items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{model.label}</span>
          {model.hasApiKey ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">已保存 Key</span>
          ) : null}
        </div>
        <div className="mt-1 text-xs text-slate-500">{model.option?.provider}</div>
      </div>
      <div className="truncate text-xs text-slate-500">{model.webhookUrl || "未配置端点"}</div>
      <div>
        <button
          type="button"
          onClick={() => onManage("toggle", { modelKey: model.key, enabled: !model.isEnabled })}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
        >
          {model.isEnabled ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
          {model.isEnabled ? "启用" : "停用"}
        </button>
      </div>
      <div className="text-slate-700">{model.priority}</div>
      <div>
        {isMain ? (
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">主模型</span>
        ) : (
          <button
            type="button"
            onClick={() => onManage("set_main", { modelKey: model.key })}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700"
          >
            设为主模型
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onEdit} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
          编辑
        </button>
        <button
          type="button"
          onClick={testConnection}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
        >
          {testingConnection ? <LoaderCircle className="size-3.5 animate-spin" /> : "测 API"}
        </button>
        <button
          type="button"
          onClick={testImage}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
        >
          {testingImage ? <LoaderCircle className="size-3.5 animate-spin" /> : "测生图"}
        </button>
        <button
          type="button"
          onClick={() => onManage("priority", { modelKey: model.key, priority: Math.max(1, model.priority - 1) })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
        >
          提高优先级
        </button>
        <button
          type="button"
          onClick={() => onManage("delete", { modelKey: model.key })}
          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          <Trash2 className="size-3.5" />
          删除
        </button>
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
