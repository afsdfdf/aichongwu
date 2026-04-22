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
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="flex flex-wrap gap-2.5">
            {PROVIDERS.map((provider) => {
              const configured = providers.find((item) => item.providerDefId === provider.id);
              const isActive = selectedProviderId === provider.id;
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => setSelectedProviderId(provider.id)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
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

        <div className="space-y-4">
          <SummaryCard
            icon={<Cpu className="size-5" />}
            title="Current live model"
            body={
              <>
                <p className="text-xl font-semibold text-slate-900">
                  {currentLiveModelDef?.model.label || currentLiveModel?.modelName || activeModel}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {currentLiveModel?.providerLabel || "Unknown provider"} · {currentLiveModel?.adapter || "Unknown adapter"}
                </p>
              </>
            }
          />

          <SummaryCard
            icon={<PlugZap className="size-5" />}
            title="Detection rules"
            body={
              <ul className="space-y-2 text-sm leading-6 text-slate-600">
                <li>1. Detect whether the endpoint is Gemini or OpenAI-compatible before suggesting models.</li>
                <li>2. Save each model with its own endpoint path, not one shared guessed path.</li>
                <li>3. Add the model you actually want, then set it as the current live model.</li>
                <li>4. Use image-to-image compatible paths for storefront production generation.</li>
              </ul>
            }
          />

          <SummaryCard
            icon={<Save className="size-5" />}
            title="Latest save feedback"
            body={
              <p className={`text-sm leading-6 ${state.ok ? "text-emerald-600" : "text-slate-500"}`}>
                {state.message || "Save credentials first, then detect the endpoint family and add the tested model."}
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
    <form action={formAction} className="mt-5 space-y-5">
      <input type="hidden" name="providerId" value={provider.id} />
      <input type="hidden" name="activeModel" value={activeModel} />
      <input type="hidden" name="widgetAccentColor" value={widgetAccentColor} />
      <input type="hidden" name="widgetButtonText" value={widgetButtonText} />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Provider connection</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{providerTitle}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{providerDescription}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1.25fr_auto_auto]">
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-slate-600">API Key</label>
              <div className="relative">
                <input
                  name="apiKey"
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  placeholder={provider.hasApiKey ? "API key already saved" : "Paste API key"}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                />
                <button type="button" onClick={() => setShowKey((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-slate-600">Endpoint or Base URL</label>
              <input
                name="baseUrl"
                value={baseUrlInput}
                onChange={(event) => setBaseUrlInput(event.target.value)}
                placeholder={providerDefaultBaseUrl || "Paste the endpoint or base URL"}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              onClick={detectModels}
              disabled={detecting || (!apiKeyInput.trim() && !provider.hasApiKey) || !baseUrlInput.trim()}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {detecting ? "Detecting..." : "Detect models"}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Protocol: {detectedProtocol || "Not detected yet"}
              </span>
              <span className="text-sm text-slate-500">
                {detectMessage || "Detect first, then save the model with its own path."}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Configured models</p>
              <p className="mt-1 text-sm text-slate-500">Current provider models with their saved endpoint paths.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Current: {activeModel}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {provider.models.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No models saved for this provider yet.
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
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">Live</span>
                          ) : null}
                          {model.isEnabled ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Enabled</span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Disabled</span>
                          )}
                        </div>
                        <p className="mt-1 break-all text-xs leading-5 text-slate-500">{model.endpoint || "No endpoint saved"}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isMain ? (
                          <button
                            type="button"
                            onClick={() => onManageProvider("set_main", { modelId: model.id })}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Set current
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onManageProvider("delete_model", { modelId: model.id })}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Delete
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Detected models</p>
              <p className="mt-1 text-sm text-slate-500">Choose the detected path first, then save the actual model you want to run.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {detectedModels.length} detected
            </span>
          </div>

          <div className="mt-4 grid gap-3">
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
                        {isCurrent ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">Current</span> : null}
                        {isAlreadyAdded && !isCurrent ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Saved</span> : null}
                      </div>
                      <p className="mt-1 break-all text-xs leading-5 text-slate-500">{model.endpoint}</p>
                    </div>

                    {!isAlreadyAdded ? (
                      <button
                        type="button"
                        onClick={() => addDetectedModel(model, provider.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Add model
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
      setResultError("Configure a live model first.");
      return;
    }
    if (!prompt.trim()) {
      setResultError("Enter a test prompt first.");
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
        setResultError(data.message || "Generation failed.");
        return;
      }

      setResultImageUrl(data.outputImageUrl);
      setResultMeta({
        usedModelKey: data.usedModelKey,
        sourceImageForwarded: data.sourceImageForwarded,
      });
    } catch {
      setResultError("Request failed.");
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Test workspace</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Prompt + image test</h3>
          <p className="mt-1 text-sm text-slate-500">Use the current live model to confirm the endpoint really forwards the uploaded source image.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Current test model: {currentModel?.id || "None"}
        </span>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-400"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Upload className="size-4" />
              {sourcePreview ? "Replace source image" : "Upload source image"}
            </button>

            <button
              type="button"
              onClick={() => runTest()}
              disabled={generating}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Run test
            </button>

            {sourcePreview ? (
              <button type="button" onClick={() => { setSourcePreview(null); setSourceBase64(null); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <X className="size-4" />
                Clear image
              </button>
            ) : null}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Saved prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {loadingPrompts ? (
                <span className="text-sm text-slate-500">Loading prompts...</span>
              ) : savedPrompts.length === 0 ? (
                <span className="text-sm text-slate-500">No saved prompts yet.</span>
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Test result preview</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Source image</p>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {sourcePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sourcePreview} alt="Source" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-slate-400">Upload a source image</span>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Generated image</p>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {resultImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resultImageUrl} alt="Generated" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-slate-400">{generating ? "Generating..." : "No result yet"}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {resultMeta ? (
              <>
                <MetaRow label="Used model" value={resultMeta.usedModelKey || "Unknown"} />
                <MetaRow label="Source forwarded" value={resultMeta.sourceImageForwarded ? "true" : "false"} />
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>
          <div className="mt-2">{body}</div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
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
