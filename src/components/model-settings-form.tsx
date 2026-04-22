"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Save,
  Search,
  Trash2,
  Zap,
  ImageIcon,
  VideoIcon,
  Upload,
  X,
  Sparkles,
  Pencil,
  Check,
} from "lucide-react";
import { PROVIDERS, getProviderById, getModelDefById, type ProviderDefinition } from "@/lib/catalog";
import { saveStoreSettingAction } from "@/app/admin/(protected)/actions";
import type { ProviderSummary } from "@/lib/store";

const initialState = { ok: false, message: "" };

type DetectedModel = {
  id: string;
  type: string;
  matchedKeywords?: string[];
};

type SavedPrompt = {
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
    providers.find((p) => p.models.some((m) => m.id === activeModel))?.id || providers[0]?.id || "openai",
  );

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const providerDef = getProviderById(selectedProviderId);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm lg:px-6 lg:py-6">
        <div className="flex flex-wrap items-center gap-2.5 lg:gap-3">
          {PROVIDERS.map((def) => {
            const configured = providers.find((p) => p.providerDefId === def.id);
            const hasKey = configured?.hasApiKey ?? false;
            const isActive = selectedProviderId === def.id;
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => setSelectedProviderId(def.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition lg:px-5 lg:py-2.5 lg:text-base ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : hasKey
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {def.label}
                {hasKey && !isActive && <CheckCircle2 className="size-4" />}
              </button>
            );
          })}
          {state.message && (
            <span className={`ml-auto text-sm font-medium ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>
              {state.message}
            </span>
          )}
        </div>

        {selectedProvider && providerDef ? (
          <ProviderConfigCard
            provider={selectedProvider}
            providerDef={providerDef}
            activeModel={activeModel}
            widgetAccentColor={widgetAccentColor}
            widgetButtonText={widgetButtonText}
            formAction={formAction}
            pending={pending}
            state={state}
          />
        ) : null}
      </div>

      <TestAndPromptWorkspace providers={providers} activeModel={activeModel} />
    </div>
  );
}


// ── Provider config (inline, no extra padding) ──

function ProviderConfigCard({
  provider,
  providerDef,
  activeModel,
  widgetAccentColor,
  widgetButtonText,
  formAction,
  pending,
  state,
}: {
  provider: ProviderSummary;
  providerDef: ProviderDefinition;
  activeModel: string;
  widgetAccentColor: string;
  widgetButtonText: string;
  formAction: (payload: FormData) => void;
  pending: boolean;
  state: { ok: boolean; message: string };
}) {
  const [showKey, setShowKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState(provider.baseUrl || providerDef.defaultBaseUrl || "");

  const [detecting, setDetecting] = useState(false);
  const [detectedModels, setDetectedModels] = useState<DetectedModel[]>([]);
  const [detectMessage, setDetectMessage] = useState("");

  async function detectModels() {
    const key = apiKeyInput.trim();
    const url = baseUrlInput.trim();
    if (!key || !url) { setDetectMessage("Enter API key and Base URL first"); return; }
    setDetecting(true); setDetectMessage(""); setDetectedModels([]);
    try {
      const res = await fetch("/api/providers/detect-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: url, apiKey: key }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; models?: DetectedModel[] };
      if (data.ok && data.models) { setDetectedModels(data.models); setDetectMessage(`${data.models.length} models detected`); }
      else { setDetectMessage(data.message || "Detection failed"); setDetectedModels([]); }
    } catch { setDetectMessage("Request failed"); }
    setDetecting(false);
  }

  return (
    <form action={formAction} className="mt-1.5 space-y-1.5">
      <input type="hidden" name="providerId" value={provider.id} />
      <input type="hidden" name="activeModel" value={activeModel} />
      <input type="hidden" name="widgetAccentColor" value={widgetAccentColor} />
      <input type="hidden" name="widgetButtonText" value={widgetButtonText} />

      {/* Key + URL one row */}
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <input
              name="apiKey"
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={provider.hasApiKey ? "Key ●●●" : "API Key"}
              autoComplete="off"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 pr-7 text-[11px] text-slate-900 outline-none"
            />
            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            </button>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <input
            name="baseUrl"
            value={baseUrlInput}
            onChange={(e) => setBaseUrlInput(e.target.value)}
            placeholder={providerDef.defaultBaseUrl || "Base URL"}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 outline-none"
          />
        </div>
        <button type="submit" disabled={pending} className="shrink-0 rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={detectModels}
          disabled={detecting || (!apiKeyInput.trim() && !provider.hasApiKey) || !baseUrlInput.trim()}
          className="shrink-0 rounded bg-violet-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {detecting ? "Detecting..." : "Detect models"}
        </button>
        {detectMessage && (
          <span className={`shrink-0 self-center text-[10px] ${detectedModels.length > 0 ? "text-emerald-600" : "text-amber-600"}`}>
            {detectMessage}
          </span>
        )}
      </div>

      {/* Detected models (compact) */}
      {detectedModels.length > 0 && (
        <div className="max-h-28 overflow-y-auto rounded border border-slate-200 bg-slate-50">
          {detectedModels.map((m) => {
            const isAlreadyAdded = provider.models.some((pm) => pm.modelName === m.id || pm.id === m.id);
            const isCurrentMain = provider.models.find((pm) => pm.modelName === m.id || pm.id === m.id)?.id === activeModel;
            return (
              <div key={m.id} className={`flex items-center justify-between border-b border-slate-100 px-2 py-0.5 last:border-0 ${isCurrentMain ? "bg-blue-50" : isAlreadyAdded ? "bg-emerald-50/50" : ""}`}>
                <div className="flex items-center gap-1 min-w-0">
                  {m.type === "video" ? <VideoIcon className="size-2.5 text-purple-500 shrink-0" /> : <ImageIcon className="size-2.5 text-blue-500 shrink-0" />}
                  <span className="text-[10px] text-slate-900 truncate">{m.id}</span>
                  {isCurrentMain && <span className="rounded bg-blue-600 px-0.5 text-[9px] text-white">Primary</span>}
                  {isAlreadyAdded && !isCurrentMain && <span className="rounded bg-emerald-100 px-0.5 text-[9px] text-emerald-700">Added</span>}
                </div>
                {!isAlreadyAdded && (
                  <button type="button" onClick={() => addDetectedModel(m.id, provider.id, providerDef.id)} className="shrink-0 rounded bg-blue-50 px-1 py-0.5 text-[10px] text-blue-700 hover:bg-blue-100">
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Configured models (compact inline tags) */}
      {provider.models.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {provider.models.map((model) => {
            const modelDef = getModelDefById(model.id);
            const isMain = model.id === activeModel;
            return (
              <span key={model.id} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ${isMain ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                {modelDef?.model.label || model.modelName || model.id}
                {isMain && " ★"}
                {!isMain && (
                  <button type="button" onClick={() => onManageProvider("set_main", { modelId: model.id })} className="text-blue-500 hover:text-blue-700" title="Set as primary model">
                    <Zap className="size-2.5" />
                  </button>
                )}
                <button type="button" onClick={() => onManageProvider("delete_model", { modelId: model.id })} className="text-rose-400 hover:text-rose-600" title="Remove model">
                  <Trash2 className="size-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </form>
  );
}

// ── Test + Prompt Workspace (collapsible, ultra-compact) ──

function TestAndPromptWorkspace({
  providers,
  activeModel,
}: {
  providers: ProviderSummary[];
  activeModel: string;
}) {
  const activeProvider = providers.find((p) => p.models.some((m) => m.id === activeModel));
  const testableModels = activeProvider?.models.filter((m) => {
    const def = getModelDefById(m.id);
    return def?.model.supportsImageTest !== false;
  }) || [];
  const selectedModel = testableModels.find((m) => m.id === activeModel) || testableModels[0];

  const [prompt, setPrompt] = useState("A premium pet memorial portrait, centered composition, soft studio lighting, elegant circular frame, realistic texture, clean background.");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [sourceBase64, setSourceBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [generating, setGenerating] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  const [savingPrompt, setSavingPrompt] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadPrompts(); }, []);

  async function loadPrompts() {
    try {
      const res = await fetch("/api/providers/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_prompts" }),
      });
      const data = (await res.json()) as { ok?: boolean; prompts?: SavedPrompt[] };
      if (data.ok && data.prompts) setSavedPrompts(data.prompts);
    } catch { /* */ }
    setLoadingPrompts(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setResultError("≤10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setSourcePreview(dataUri);
      setSourceBase64(dataUri);
    };
    reader.readAsDataURL(file);
  }

  async function handleFileAndGenerate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setResultError("≤10MB"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;
      setSourcePreview(dataUri);
      setSourceBase64(dataUri);
      await doGenerate(dataUri);
    };
    reader.readAsDataURL(file);
  }

  function clearSourceImage() {
    setSourcePreview(null);
    setSourceBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleTest() {
    if (!selectedModel) { setResultError("Configure a model first"); return; }
    if (!prompt.trim()) { setResultError("Enter a prompt first"); return; }
    if (!sourceBase64) { fileInputRef.current?.click(); return; }
    await doGenerate(sourceBase64);
  }

  async function doGenerate(srcBase64?: string) {
    if (!selectedModel) return;
    setGenerating(true); setResultImageUrl(null); setResultError(null);
    try {
      const body: Record<string, unknown> = {
        modelKey: selectedModel.id,
        prompt: prompt.trim(),
        mode: (srcBase64 || sourceBase64) ? "combined" : "text2img",
      };
      if (srcBase64) body.sourceImage = srcBase64;
      else if (sourceBase64) body.sourceImage = sourceBase64;

      const res = await fetch("/api/providers/test-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; outputImageUrl?: string };
      if (data.ok && data.outputImageUrl) setResultImageUrl(data.outputImageUrl);
      else setResultError(data.message || "Generation failed");
    } catch { setResultError("Request failed"); }
    setGenerating(false);
  }

  async function handleSavePrompt() {
    if (!prompt.trim()) { setSaveMessage({ ok: false, text: "Prompt cannot be empty" }); return; }
    setSavingPrompt(true); setSaveMessage(null);
    try {
      const res = await fetch("/api/providers/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_prompt",
          productType: "test",
          displayName: prompt.trim().slice(0, 30) + "...",
          promptTemplate: prompt.trim(),
          negativePrompt: negativePrompt.trim() || null,
          isActive: true,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (data.ok) { setSaveMessage({ ok: true, text: "Prompt saved" }); await loadPrompts(); }
      else setSaveMessage({ ok: false, text: data.message || "Save failed" });
    } catch { setSaveMessage({ ok: false, text: "Network error" }); }
    setSavingPrompt(false);
    setTimeout(() => setSaveMessage(null), 3000);
  }

  async function handleDeletePrompt(id: string) {
    setDeletingId(id);
    try { await fetch("/api/providers/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_prompt", promptId: id }) }); await loadPrompts(); } catch { /* */ }
    setDeletingId(null);
  }

  async function handleUpdatePrompt(id: string) {
    try {
      await fetch("/api/providers/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_prompt", promptId: id, displayName: editName, promptTemplate: prompt.trim() }),
      });
      setEditingPromptId(null);
      await loadPrompts();
    } catch { /* */ }
  }

  function applyPrompt(p: SavedPrompt) {
    setPrompt(p.promptTemplate);
    setNegativePrompt(p.negativePrompt || "");
    setResultImageUrl(null);
    setResultError(null);
  }

  return (
    <details className="rounded border border-slate-200 bg-white">
      <summary className="cursor-pointer px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 select-none">
        🎨 提示词测试 & 管理
      </summary>
      <div className="border-t border-slate-100 px-3 py-2">
        {/* Prompt row */}
        <div className="flex items-start gap-1.5">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="提示词..."
            className="flex-1 min-w-0 rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] leading-tight text-slate-900 outline-none focus:border-blue-400 resize-none"
          />
          <div className="flex flex-col gap-0.5 shrink-0">
            <button type="button" onClick={handleTest} disabled={generating || !selectedModel} className="inline-flex items-center gap-0.5 rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-violet-700 disabled:opacity-50">
              {generating ? <LoaderCircle className="size-2.5 animate-spin" /> : <Sparkles className="size-2.5" />}
              测试
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50">
              <Upload className="size-2.5" />
              {sourcePreview ? "换" : "图"}
            </button>
            <button type="button" onClick={handleSavePrompt} disabled={savingPrompt || !prompt.trim()} className="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              <Save className="size-2.5" />
              存
            </button>
          </div>
        </div>

        {/* Negative prompt */}
        <details className="mt-0.5">
          <summary className="text-[9px] text-slate-400 cursor-pointer hover:text-slate-600">负向</summary>
          <input value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="排除..." className="mt-0.5 w-full rounded border border-slate-200 px-1.5 py-0.5 text-[10px] outline-none" />
        </details>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileAndGenerate} className="hidden" />

        {/* Source thumb */}
        {sourcePreview && (
          <div className="mt-0.5 flex items-center gap-1">
            <img src={sourcePreview} alt="" className="h-5 w-5 rounded object-cover" />
            <button type="button" onClick={clearSourceImage} className="text-slate-400 hover:text-slate-600"><X className="size-2.5" /></button>
          </div>
        )}

        {/* Messages */}
        {saveMessage && <p className={`mt-0.5 text-[9px] ${saveMessage.ok ? "text-emerald-600" : "text-rose-600"}`}>{saveMessage.text}</p>}
        {resultError && <p className="mt-0.5 text-[9px] text-rose-600">❌ {resultError}</p>}

        {/* Result */}
        {resultImageUrl && (
          <div className="mt-0.5 flex items-center gap-1.5">
            <img src={resultImageUrl} alt="" className="h-12 w-12 rounded object-cover border border-slate-200" />
            <a href={resultImageUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-600 hover:underline">原图</a>
          </div>
        )}

        {/* Saved prompts list */}
        <div className="mt-1.5 pt-1.5 border-t border-slate-100">
          <p className="text-[9px] font-medium text-slate-500 mb-0.5">已保存</p>
          {loadingPrompts ? (
            <p className="text-[9px] text-slate-400">...</p>
          ) : savedPrompts.length === 0 ? (
            <p className="text-[9px] text-slate-400">暂无</p>
          ) : (
            <div className="space-y-px max-h-20 overflow-y-auto">
              {savedPrompts.map((p) => (
                <div key={p.id} className="group flex items-center gap-0.5 rounded px-1 py-px hover:bg-slate-50 text-[10px]">
                  {editingPromptId === p.id ? (
                    <div className="flex-1 flex items-center gap-0.5">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 min-w-0 rounded border border-slate-200 px-1 py-px text-[9px] outline-none" />
                      <button type="button" onClick={() => handleUpdatePrompt(p.id)} className="text-blue-600"><Check className="size-2.5" /></button>
                      <button type="button" onClick={() => setEditingPromptId(null)} className="text-slate-400"><X className="size-2.5" /></button>
                    </div>
                  ) : (
                    <>
                      <button type="button" onClick={() => applyPrompt(p)} className="flex-1 text-left min-w-0 truncate text-slate-700 hover:text-blue-600" title={p.promptTemplate}>
                        {p.displayName}
                      </button>
                      <button type="button" onClick={() => { setEditingPromptId(p.id); setEditName(p.displayName); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600">
                        <Pencil className="size-2" />
                      </button>
                      <button type="button" onClick={() => handleDeletePrompt(p.id)} disabled={deletingId === p.id} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600">
                        {deletingId === p.id ? <LoaderCircle className="size-2 animate-spin" /> : <Trash2 className="size-2" />}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

// ── Helpers ──

async function onManageProvider(action: string, payload: Record<string, unknown>) {
  await fetch("/api/providers/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
  window.location.reload();
}

async function addDetectedModel(modelId: string, providerId: string, providerDefId: string) {
  await fetch("/api/providers/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add_model", providerId, modelId, adapter: guessAdapter(modelId, providerDefId), endpoint: guessEndpoint(providerDefId) }),
  });
  window.location.reload();
}

function guessAdapter(modelId: string, providerDefId: string): string {
  const id = modelId.toLowerCase();
  if (providerDefId === "stability") return "stability";
  if (providerDefId === "replicate") return "replicate";
  if (providerDefId === "google") return "gemini";
  if (providerDefId === "fal") return "fal-queue";
  if (providerDefId === "midjourney") return "midjourney-async";
  if (providerDefId === "dashscope") return "dashscope-async";
  if (providerDefId === "volcengine") return "volcengine-async";
  if (providerDefId === "xfyun") return "xfyun-async";
  if (id.includes("sora")) return "openai-chat-image";
  if (id.includes("doubao") || id.includes("seedream")) return "openai-chat-image";
  if (id.includes("gemini")) return "openai-chat-image";
  if (id.includes("wan")) return "dashscope-async";
  if (id.includes("gpt-image") || id.includes("dall")) return "openai-images";
  if (id.includes("flux") || id.includes("ideogram") || id.includes("banana") || id.includes("nano")) return "openai-chat-image";
  return "openai-chat-image";
}

function guessEndpoint(providerDefId: string): string {
  const def = getProviderById(providerDefId);
  if (def?.models[0]) return def.models[0].defaultEndpoint;
  if (providerDefId === "poloai" || providerDefId === "custom") return "/chat/completions";
  return "/v1/images/generations";
}
