"use client";

import { useActionState, useMemo, useState } from "react";
import { Save, Sparkles, Upload, X } from "lucide-react";
import { saveStoreSettingAction } from "@/app/admin/(protected)/actions";

const initialState = { ok: false, message: "" };

type ProviderMode = "google" | "custom";

type Props = {
  activeModel: string;
  modelProvider: "google" | "openai" | "custom";
  modelName: string | null;
  modelBaseUrl: string | null;
  modelEndpoint: string | null;
  hasApiKey: boolean;
  widgetAccentColor: string;
  widgetButtonText: string;
};

export function ModelSettingsForm({
  activeModel,
  modelProvider,
  modelName,
  modelBaseUrl,
  modelEndpoint,
  hasApiKey,
  widgetAccentColor,
  widgetButtonText,
}: Props) {
  const normalizedProvider: ProviderMode = modelProvider === "google" ? "google" : "custom";
  const [state, formAction, pending] = useActionState(saveStoreSettingAction, initialState);
  const [providerId, setProviderId] = useState<ProviderMode>(normalizedProvider);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("Use the uploaded image as the subject and generate a clean premium preview.");
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testImageUrl, setTestImageUrl] = useState<string | null>(null);

  const defaults = useMemo(() => {
    const useSavedValues = normalizedProvider === providerId;

    if (providerId === "google") {
      return {
        activeModel: useSavedValues ? activeModel || "gemini-3.1-flash-image" : "gemini-3.1-flash-image",
        modelName: useSavedValues ? modelName || "gemini-3.1-flash-image-preview" : "gemini-3.1-flash-image-preview",
        modelBaseUrl: "https://generativelanguage.googleapis.com",
        modelEndpoint: "",
      };
    }

    return {
      activeModel: useSavedValues ? activeModel || "gpt-image-2" : "gpt-image-2",
      modelName: useSavedValues ? modelName || activeModel || "gpt-image-2" : "gpt-image-2",
      modelBaseUrl: useSavedValues ? modelBaseUrl || "https://ai403.eu.cc/v1" : "https://ai403.eu.cc/v1",
      modelEndpoint: useSavedValues ? modelEndpoint || "/images/edits" : "/images/edits",
    };
  }, [activeModel, modelBaseUrl, modelEndpoint, modelName, normalizedProvider, providerId]);

  async function runTest() {
    setTesting(true);
    setTestMessage("");
    setTestImageUrl(null);

    try {
      const response = await fetch("/api/providers/test-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelKey: defaults.activeModel,
          prompt,
          sourceImage: sourceImage || undefined,
        }),
      });

      const raw = await response.text();
      let data: { ok?: boolean; message?: string; outputImageUrl?: string } | null = null;

      try {
        data = raw ? (JSON.parse(raw) as { ok?: boolean; message?: string; outputImageUrl?: string }) : null;
      } catch {
        setTestMessage(
          raw.trimStart().startsWith("<")
            ? `Server returned an HTML error page (${response.status}).`
            : raw || `Test failed with status ${response.status}.`,
        );
        return;
      }

      if (!data?.ok) {
        setTestMessage(data?.message || `Test failed with status ${response.status}.`);
        return;
      }

      setTestMessage(data.message || "Test completed.");
      setTestImageUrl(data.outputImageUrl || null);
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : "Test failed.");
    } finally {
      setTesting(false);
    }
  }

  const modeTitle = providerId === "google" ? "Google" : "GPT / Compatible";
  const modeDescription =
    providerId === "google"
      ? "Google uses the official SDK. Save one Google configuration and it becomes active."
      : "GPT / Compatible uses raw HTTP for OpenAI-compatible gateways. Save one configuration and it becomes active.";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setProviderId("google")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${providerId === "google" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => setProviderId("custom")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${providerId === "custom" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            GPT / Compatible
          </button>
        </div>

        <form key={providerId} action={formAction} className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <input type="hidden" name="providerId" value={providerId} />
            <input type="hidden" name="widgetAccentColor" value={widgetAccentColor} />
            <input type="hidden" name="widgetButtonText" value={widgetButtonText} />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Current Mode</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{modeTitle}</h3>
              <p className="mt-1 text-sm text-slate-500">{modeDescription}</p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Model ID</span>
              <input
                name="activeModel"
                defaultValue={defaults.activeModel}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Runtime Model Name</span>
              <input
                name="modelName"
                defaultValue={defaults.modelName}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">API Key</span>
              <input
                name="apiKey"
                type="password"
                placeholder={hasApiKey ? "Saved. Leave empty to keep current key." : "Paste API key"}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Base URL</span>
              <input
                name="baseUrl"
                defaultValue={defaults.modelBaseUrl}
                readOnly={providerId === "google"}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0 read-only:bg-slate-50"
              />
            </label>

            {providerId !== "google" ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Endpoint Path</span>
                <input
                  name="modelEndpoint"
                  defaultValue={defaults.modelEndpoint}
                  placeholder="/images/edits, /images/generations, or /chat/completions"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0"
                />
              </label>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Save className="size-4" />
                {pending ? "Saving..." : "Save"}
              </button>
              <p className={`text-sm ${state.ok ? "text-emerald-600" : "text-slate-500"}`}>{state.message}</p>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Test Workspace</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Quick Validation</h3>
              <p className="mt-1 text-sm text-slate-500">Tests always use the single active configuration shown above.</p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Prompt</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-0"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Source Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setSourceImage(null);
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setSourceImage(String(reader.result || ""));
                  reader.readAsDataURL(file);
                }}
                className="block w-full text-sm text-slate-600"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={runTest}
                disabled={testing}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Sparkles className="size-4" />
                {testing ? "Testing..." : "Run Test"}
              </button>
              {sourceImage ? (
                <button
                  type="button"
                  onClick={() => setSourceImage(null)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700"
                >
                  <X className="size-4" />
                  Clear Image
                </button>
              ) : (
                <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 text-sm text-slate-500">
                  <Upload className="size-4" />
                  Optional image
                </span>
              )}
            </div>

            {testMessage ? <p className="text-sm text-slate-600">{testMessage}</p> : null}
            {testImageUrl ? (
              <img src={testImageUrl} alt="Test result" className="w-full rounded-2xl border border-slate-200 object-cover" />
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
