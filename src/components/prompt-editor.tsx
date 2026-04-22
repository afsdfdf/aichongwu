"use client";

import { useMemo, useTransition, useActionState, useState, useRef } from "react";
import { deletePromptAction, savePromptAction } from "@/app/admin/(protected)/actions";
import { Trash2, Save, ChevronDown, Upload, X, LoaderCircle, Sparkles, ImageIcon } from "lucide-react";

type PromptRow = {
  id: string;
  productType: string;
  displayName: string;
  promptTemplate: string;
  negativePrompt: string | null;
  aspectRatio: string | null;
  isActive: boolean;
};

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", desc: "方形" },
  { value: "4:3", label: "4:3", desc: "横版" },
  { value: "3:4", label: "3:4", desc: "竖版" },
  { value: "16:9", label: "16:9", desc: "宽屏" },
  { value: "9:16", label: "9:16", desc: "长图" },
  { value: "3:2", label: "3:2", desc: "经典" },
  { value: "2:3", label: "2:3", desc: "竖长" },
];

const initialState = { ok: false, message: "" };

export function PromptEditor({
  title,
  description,
  values,
  activeModel,
}: {
  title: string;
  description: string;
  values?: PromptRow;
  activeModel?: string;
}) {
  const [state, formAction] = useActionState(savePromptAction, initialState);
  const negativePrompt = useMemo(() => values?.negativePrompt ?? "", [values?.negativePrompt]);
  const defaultRatio = values?.aspectRatio || "1:1";

  return (
    <details open={!!values} className="rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2 hover:bg-slate-50 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-slate-900 truncate">{values?.displayName || title}</span>
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{values?.productType || "new"}</span>
          {values?.aspectRatio && (
            <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{values.aspectRatio}</span>
          )}
          {values?.isActive && <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600">启用</span>}
        </div>
        <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
      </summary>

      <form action={formAction} className="border-t border-slate-100 px-4 py-3 space-y-3">
        <input type="hidden" name="id" defaultValue={values?.id ?? ""} />

        {/* Key + Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-600">商品类型 key</label>
            <input
              name="productType"
              defaultValue={values?.productType ?? ""}
              placeholder="frame / fridge-magnet / keychain"
              className="mt-0.5 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-600">显示名称</label>
            <input
              name="displayName"
              defaultValue={values?.displayName ?? ""}
              placeholder="相框"
              className="mt-0.5 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Aspect ratio selector */}
        <div>
          <label className="text-[11px] font-medium text-slate-600">输出比例</label>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {ASPECT_RATIOS.map((r) => (
              <label key={r.value} className="group cursor-pointer">
                <input
                  type="radio"
                  name="aspectRatio"
                  value={r.value}
                  defaultChecked={defaultRatio === r.value}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 hover:bg-slate-50">
                  {/* Mini aspect ratio preview */}
                  <span
                    className="inline-block rounded-sm border border-current opacity-40"
                    style={{
                      width: r.value === "1:1" ? 8 : r.value.split(":")[0] > r.value.split(":")[1] ? 10 : 6,
                      height: r.value === "1:1" ? 8 : r.value.split(":")[0] > r.value.split(":")[1] ? 6 : 10,
                    }}
                  />
                  {r.label}
                  <span className="text-[9px] text-slate-400 peer-checked:text-blue-400">{r.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Positive prompt */}
        <div>
          <label className="text-[11px] font-medium text-slate-600">正向提示词</label>
          <textarea
            name="promptTemplate"
            defaultValue={values?.promptTemplate ?? ""}
            rows={4}
            className="mt-0.5 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-400 resize-none"
          />
        </div>

        {/* Negative prompt */}
        <details>
          <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600">负向提示词（可选）</summary>
          <textarea
            name="negativePrompt"
            defaultValue={negativePrompt}
            rows={2}
            className="mt-0.5 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-400 resize-none"
          />
        </details>

        {/* Active + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <input type="checkbox" name="isActive" defaultChecked={values ? values.isActive : true} className="size-3" />
              启用
            </label>
            {state.message && (
              <span className={`text-[11px] ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>{state.message}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {values?.id && <DeleteButton promptId={values.id} />}
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              <Save className="size-3" />
              {values ? "保存" : "新增"}
            </button>
          </div>
        </div>
      </form>

      {/* Test section — only for saved prompts */}
      {values?.id && <PromptTester prompt={values} activeModel={activeModel} />}
    </details>
  );
}

// ── Inline test panel per prompt ──

function PromptTester({
  prompt,
  activeModel,
}: {
  prompt: PromptRow;
  activeModel?: string;
}) {
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [sourceBase64, setSourceBase64] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("图片不能超过 10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const uri = reader.result as string;
      setSourcePreview(uri);
      setSourceBase64(uri);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    if (!activeModel) { setError("请先在设置页配置模型"); return; }
    if (!sourceBase64) { fileRef.current?.click(); return; }

    setGenerating(true);
    setResultUrl(null);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        modelKey: activeModel,
        prompt: prompt.promptTemplate,
        mode: sourceBase64 ? "combined" : "text2img",
        aspectRatio: prompt.aspectRatio || "1:1",
      };
      if (sourceBase64) body.sourceImage = sourceBase64;

      const res = await fetch("/api/providers/test-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; outputImageUrl?: string };
      if (data.ok && data.outputImageUrl) setResultUrl(data.outputImageUrl);
      else setError(data.message || "生成失败");
    } catch {
      setError("请求失败");
    }
    setGenerating(false);
  }

  function clearSource() {
    setSourcePreview(null);
    setSourceBase64(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="size-3 text-violet-500" />
        <span className="text-[11px] font-medium text-slate-700">测试生成效果</span>
        <span className="text-[10px] text-slate-400">— 上传商品图 + 当前提示词 → 预览</span>
      </div>

      <div className="flex items-start gap-3">
        {/* Upload area */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1.5 text-[11px] text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50"
          >
            <Upload className="size-3" />
            {sourcePreview ? "换图" : "上传商品图"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          {sourcePreview && (
            <div className="relative">
              <img src={sourcePreview} alt="" className="h-10 w-10 rounded object-cover border border-slate-200" />
              <button
                type="button"
                onClick={clearSource}
                className="absolute -right-1 -top-1 rounded-full bg-white shadow-sm border border-slate-200 p-0.5"
              >
                <X className="size-2.5 text-slate-400" />
              </button>
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !activeModel}
          className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {generating ? <LoaderCircle className="size-3 animate-spin" /> : <ImageIcon className="size-3" />}
          {generating ? "生成中..." : "测试生成"}
        </button>

        {/* Error */}
        {error && <span className="text-[10px] text-rose-600 self-center">❌ {error}</span>}
      </div>

      {/* Result preview */}
      {resultUrl && (
        <div className="mt-2 flex items-center gap-3">
          <img src={resultUrl} alt="生成结果" className="h-24 w-24 rounded-lg object-cover border border-slate-200 shadow-sm" />
          <div>
            <p className="text-[10px] text-slate-500 mb-1">生成结果预览</p>
            <a
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[11px] text-blue-600 hover:underline"
            >
              查看原图 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Delete button ──

function DeleteButton({ promptId }: { promptId: string }) {
  const [isDeleting, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("确定删除该提示词？")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", promptId);
      await deletePromptAction(initialState, fd);
    });
  };

  return (
    <button
      type="button"
      className="inline-flex items-center gap-0.5 rounded-md border border-rose-200 px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 disabled:opacity-50"
      disabled={isDeleting}
      onClick={handleDelete}
    >
      <Trash2 className="size-3" />
      {isDeleting ? "删除中..." : "删除"}
    </button>
  );
}
