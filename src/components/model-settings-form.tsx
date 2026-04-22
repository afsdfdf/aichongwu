"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  ImageIcon,
  LoaderCircle,
  PlugZap,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { PROVIDERS, getModelDefById, getProviderById } from "@/lib/catalog";
import { saveStoreSettingAction } from "@/app/admin/(protected)/actions";
import type { ProviderSummary } from "@/lib/store";

const initialState = { ok: false, message: "" };

type DetectedModel = {
  id: string;
  type: "image" | "video" | "other";
  adapter: string;
  endpoint: string;
  providerId: string;
  protocol: "gemini" | "openai";
  matchedKeywords?: string[];
};

type PromptRow = {
  id: string;
  productType: string;
  displayName: string;
  promptTemplate: string;
  negativePrompt: string | null;
  isActive: boolean;
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
  const [selectedProviderId, setSelectedProviderId] = useState(
    providers.find((provider) => provider.models.some((model) => model.id === activeModel))?.id ||
      providers[0]?.id ||
      "openai",
  );

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);
  const providerDef = getProviderById(selectedProviderId);
  const currentLiveModel = useMemo(
    () =>
      providers
        .flatMap((provider) =>
          provider.models.map((model) => ({
            ...model,
            providerLabel: provider.label,
          })),
        )
        .find((model) => model.id === activeModel),
    [providers, activeModel],
  );
  const currentLiveModelDef = currentLiveModel ? getModelDefById(currentLiveModel.id) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((provider) => {
              const configured = providers.find((item) => item.providerDefId === provider.id);
              const isActive = selectedProviderId === provider.id;
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => setSelectedProviderId(provider.id)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : configured?.hasApiKey
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {provider.label}
                  {configured?.hasApiKey && !isActive ? <CheckCircle2 className="size-4" /> : null}
                </button>
              );
            })}
          </div>

          {selectedProvider && providerDef ? (
            <ProviderConfigCard
              provider={selectedProvider}
              providerDefId={providerDef.id}
              providerTitle={providerDef.label}
              providerDescription={providerDef.description}
              providerDefaultBaseUrl={providerDef.defaultBaseUrl}
              activeModel={activeModel}
              widgetAccentColor={widgetAccentColor}
              widgetButtonText={widgetButtonText}
              formAction={formAction}
              pending={pending}
              onSelectProvider={setSelectedProviderId}
            />
          ) : null}
        </div>

        <div className="space-y-3">
          <SummaryCard
            icon={<Cpu className="size-5" />}
            title="当前生效模型"
            body={
              <>
                <p className="text-lg font-semibold text-slate-900">
                  {currentLiveModelDef?.model.label || currentLiveModel?.modelName || activeModel}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {currentLiveModel?.providerLabel || "未识别服务商"} · {currentLiveModel?.adapter || "未识别适配器"}
                </p>
              </>
            }
          />

          <SummaryCard
            icon={<PlugZap className="size-5" />}
            title="检测规则"
            body={
              <ul className="space-y-1.5 text-sm leading-6 text-slate-600">
                <li>1. 先识别接口属于 Gemini 还是 OpenAI 兼容协议，再推荐模型。</li>
                <li>2. 每个模型分别保存自己的 endpoint，不共用猜测路径。</li>
                <li>3. 先添加实际可用模型，再切换为当前生产模型。</li>
                <li>4. 生产图像优先使用支持图生图的接口路径。</li>
              </ul>
            }
          />

          <SummaryCard
            icon={<Save className="size-5" />}
            title="最近保存结果"
            body={
              <p className={`text-sm leading-6 ${state.ok ? "text-emerald-600" : "text-slate-500"}`}>
                {state.message || "请先保存密钥，再检测接口类型并添加已验证模型。"}
              </p>
            }
          />
        </div>
      </div>

      <TestAndPromptWorkspace providers={providers} activeModel={activeModel} />
    </div>
  );
}

function ProviderConfigCard({
  provider,
  providerDefId,
  providerTitle,
  providerDescription,
  providerDefaultBaseUrl,
  activeModel,
  widgetAccentColor,
  widgetButtonText,
  formAction,
  pending,
  onSelectProvider,
}: {
  provider: ProviderSummary;
  providerDefId: string;
  providerTitle: string;
  providerDescription: string;
  providerDefaultBaseUrl: string;
  activeModel: string;
  widgetAccentColor: string;
  widgetButtonText: string;
  formAction: (payload: FormData) => void;
  pending: boolean;
  onSelectProvider: (providerId: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState(provider.baseUrl || providerDefaultBaseUrl || "");
  const [detecting, setDetecting] = useState(false);
  const [detectedModels, setDetectedModels] = useState<DetectedModel[]>([]);
  const [detectMessage, setDetectMessage] = useState("");
  const [detectedProtocol, setDetectedProtocol] = useState("");

  useEffect(() => {
    setApiKeyInput("");
    setBaseUrlInput(provider.baseUrl || providerDefaultBaseUrl || "");
    setDetectedModels([]);
    setDetectMessage("");
    setDetectedProtocol("");
  }, [provider.id, provider.baseUrl, providerDefaultBaseUrl]);

  async function detectModels() {
    const apiKey = apiKeyInput.trim();
    const baseUrl = baseUrlInput.trim();
    if (!apiKey && !provider.hasApiKey) {
      setDetectMessage("Paste an API key first.");
      return;
    }
    if (!baseUrl) {
      setDetectMessage("Paste an endpoint or base URL first.");
      return;
    }

    setDetecting(true);
    setDetectedModels([]);
    setDetectMessage("");
    setDetectedProtocol("");

    try {
      const response = await fetch("/api/providers/detect-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        models?: DetectedModel[];
        protocol?: string;
        providerId?: string;
        normalizedBaseUrl?: string;
      };

      if (!data.ok || !data.models) {
        setDetectMessage(data.message || "Detection failed.");
        return;
      }

      setDetectedModels(data.models);
      setDetectMessage(data.message || `${data.models.length} models detected.`);
      setDetectedProtocol(
        data.protocol === "gemini"
          ? "Gemini generateContent"
          : data.protocol === "mixed"
            ? "Mixed OpenAI + Gemini"
            : "OpenAI compatible",
      );

      if (data.providerId) {
        onSelectProvider(data.providerId);
      }
      if (data.normalizedBaseUrl) {
        setBaseUrlInput(data.normalizedBaseUrl);
      }
    } catch {
      setDetectMessage("Request failed.");
    } finally {
      setDetecting(false);
    }
  }

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="providerId" value={provider.id} />
      <input type="hidden" name="activeModel" value={activeModel} />
      <input type="hidden" name="widgetAccentColor" value={widgetAccentColor} />
      <input type="hidden" name="widgetButtonText" value={widgetButtonText} />

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">PROVIDER</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{providerTitle}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{providerDescription}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              {provider.models.length} 个已保存模型
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="min-w-0 lg:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">API Key</label>
              <div className="relative">
                <input
                  name="apiKey"
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  placeholder={provider.hasApiKey ? "API key already saved" : "Paste API key"}
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Endpoint / Base URL</label>
              <input
                name="baseUrl"
                value={baseUrlInput}
                onChange={(event) => setBaseUrlInput(event.target.value)}
                placeholder={providerDefaultBaseUrl || "Paste the endpoint or base URL"}
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Saving..." : "保存设置"}
            </button>

            <button
              type="button"
              onClick={detectModels}
              disabled={detecting || (!apiKeyInput.trim() && !provider.hasApiKey) || !baseUrlInput.trim()}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {detecting ? "Detecting..." : "检测模型"}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                协议：{detectedProtocol || "尚未检测"}
              </span>
              <span>{detectMessage || "先检测，再把实际可用模型及其独立路径保存下来。"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">SAVED MODELS</p>
              <p className="mt-1 text-sm text-slate-500">当前服务商下已保存的模型与 endpoint。</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              当前：{activeModel}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {provider.models.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                当前服务商还没有保存模型。
              </div>
            ) : (
              provider.models.map((model) => {
                const modelDef = getModelDefById(model.id);
                const isMain = model.id === activeModel;
                return (
                  <div key={model.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{modelDef?.model.label || model.modelName || model.id}</span>
                          {isMain ? (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">当前生效</span>
                          ) : null}
                          {model.isEnabled ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">已启用</span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">已停用</span>
                          )}
                        </div>
                        <p className="mt-1 break-all text-xs leading-5 text-slate-500">{model.endpoint || "未保存 endpoint"}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isMain ? (
                          <button
                            type="button"
                            onClick={() => onManageProvider("set_main", { modelId: model.id })}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            设为当前
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onManageProvider("delete_model", { modelId: model.id })}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {detectedModels.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">DETECTED MODELS</p>
              <p className="mt-1 text-sm text-slate-500">先确认检测出的路径，再添加你真正要运行的模型。</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {detectedModels.length} 个结果
            </span>
          </div>

          <div className="mt-4 grid gap-2.5">
            {detectedModels.map((model) => {
              const isAlreadyAdded = provider.models.some((item) => item.id === model.id || item.modelName === model.id);
              const isCurrent = provider.models.find((item) => item.id === model.id || item.modelName === model.id)?.id === activeModel;
              return (
                <div key={model.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {model.type === "video" ? <Sparkles className="size-4 shrink-0 text-purple-500" /> : <ImageIcon className="size-4 shrink-0 text-blue-500" />}
                        <span className="text-sm font-semibold text-slate-900">{model.id}</span>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{model.protocol}</span>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{model.adapter}</span>
                        {isCurrent ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">当前</span> : null}
                        {isAlreadyAdded && !isCurrent ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">已保存</span> : null}
                      </div>
                      <p className="mt-1 break-all text-xs leading-5 text-slate-500">{model.endpoint}</p>
                    </div>

                    {!isAlreadyAdded ? (
                      <button
                        type="button"
                        onClick={() => addDetectedModel(model, provider.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        添加模型
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </form>
  );
}

function TestAndPromptWorkspace({
  providers,
  activeModel,
}: {
  providers: ProviderSummary[];
  activeModel: string;
}) {
  const activeProvider = providers.find((provider) => provider.models.some((model) => model.id === activeModel));
  const currentModel = activeProvider?.models.find((model) => model.id === activeModel) || activeProvider?.models[0];

  const [prompt, setPrompt] = useState(
    "Use the uploaded photo as the subject. Generate a premium memorial preview, preserve the identity and key details of the source image, and follow the saved backend prompt style.",
  );
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [sourceBase64, setSourceBase64] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<{
    usedModelKey?: string;
    sourceImageForwarded?: boolean;
  } | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<PromptRow[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      const response = await fetch("/api/providers/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_prompts" }),
      });
      const data = (await response.json()) as { ok?: boolean; prompts?: PromptRow[] };
      if (data.ok && data.prompts) setSavedPrompts(data.prompts);
    } catch {
      // ignore
    } finally {
      setLoadingPrompts(false);
    }
  }

  async function runTest(withSource?: string) {
    if (!currentModel) {
      setResultError("请先配置当前生效模型。");
      return;
    }
    if (!prompt.trim()) {
      setResultError("请先输入测试提示词。");
      return;
    }

    setGenerating(true);
    setResultError(null);
    setResultImageUrl(null);
    setResultMeta(null);

    try {
      const response = await fetch("/api/providers/test-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelKey: currentModel.id,
          prompt: prompt.trim(),
          mode: withSource || sourceBase64 ? "combined" : "text2img",
          sourceImage: withSource || sourceBase64 || undefined,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        outputImageUrl?: string;
        usedModelKey?: string;
        sourceImageForwarded?: boolean;
      };

      if (!data.ok || !data.outputImageUrl) {
        setResultError(data.message || "生成失败。");
        return;
      }

      setResultImageUrl(data.outputImageUrl);
      setResultMeta({
        usedModelKey: data.usedModelKey,
        sourceImageForwarded: data.sourceImageForwarded,
      });
    } catch {
      setResultError("请求失败。");
    } finally {
      setGenerating(false);
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;
      setSourcePreview(dataUri);
      setSourceBase64(dataUri);
      await runTest(dataUri);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">TEST WORKSPACE</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">测试工作区</h3>
          <p className="mt-1 text-sm text-slate-500">使用当前生效模型验证 prompt、源图传递和最终生成结果。</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          当前测试模型：{currentModel?.id || "未配置"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-400"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Upload className="size-4" />
              {sourcePreview ? "更换源图" : "上传源图"}
            </button>

            <button
              type="button"
              onClick={() => runTest()}
              disabled={generating}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {generating ? "测试中..." : "运行测试"}
            </button>

            {sourcePreview ? (
              <button
                type="button"
                onClick={() => {
                  setSourcePreview(null);
                  setSourceBase64(null);
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <X className="size-4" />
                清空图片
              </button>
            ) : null}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">SAVED PROMPTS</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {loadingPrompts ? (
                <span className="text-sm text-slate-500">正在加载提示词...</span>
              ) : savedPrompts.length === 0 ? (
                <span className="text-sm text-slate-500">还没有已保存提示词。</span>
              ) : (
                savedPrompts.map((promptRow) => (
                  <button
                    key={promptRow.id}
                    type="button"
                    onClick={() => setPrompt(promptRow.promptTemplate)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {promptRow.displayName}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">RESULT PREVIEW</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-slate-400">源图</p>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {sourcePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sourcePreview} alt="Source" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-slate-400">上传一张源图</span>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-slate-400">结果图</p>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {resultImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resultImageUrl} alt="Generated" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-slate-400">{generating ? "生成中..." : "暂无结果"}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {resultMeta ? (
              <>
                <MetaRow label="使用模型" value={resultMeta.usedModelKey || "Unknown"} />
                <MetaRow label="是否转发源图" value={resultMeta.sourceImageForwarded ? "true" : "false"} />
              </>
            ) : null}
            {resultError ? <p className="text-sm font-medium text-rose-600">{resultError}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">{title}</p>
          <div className="mt-2">{body}</div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

async function onManageProvider(action: string, payload: Record<string, unknown>) {
  await fetch("/api/providers/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  window.location.reload();
}

async function addDetectedModel(model: DetectedModel, fallbackProviderId: string) {
  await fetch("/api/providers/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "add_model",
      providerId: model.providerId || fallbackProviderId,
      modelId: model.id,
      modelName: model.id,
      endpoint: model.endpoint,
    }),
  });
  window.location.reload();
}
