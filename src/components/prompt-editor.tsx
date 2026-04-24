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
    <details open={!!values} className="admin-panel overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50/80 select-none sm:px-5">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{values?.displayName || title}</span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
              {values?.productType || "new"}
            </span>
            {values?.aspectRatio && (
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600">
                {values.aspectRatio}
              </span>
            )}
            {values?.isActive && (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-600">
                启用
              </span>
            )}
          </div>
          <p className="pr-6 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <form action={formAction} className="space-y-4 border-t border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
        <input type="hidden" name="id" defaultValue={values?.id ?? ""} />


        {/* Key + Name */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="admin-label">商品类型 key</label>
            <input
              name="productType"
              defaultValue={values?.productType ?? ""}
              placeholder="frame / fridge-magnet / keychain"
              className="admin-field"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">后端仍用英文 key 做匹配，避免影响现有商品类型映射。</p>
          </div>
          <div>
            <label className="admin-label">显示名称</label>
            <input
              name="displayName"
              defaultValue={values?.displayName ?? ""}
              placeholder="相框"
              className="admin-field"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">这里填写后台展示名称，前端文案可以保持中文。</p>
          </div>
        </div>

        {/* Aspect ratio selector */}
        <div>
          <label className="admin-label">输出比例</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {ASPECT_RATIOS.map((r) => (
              <label key={r.value} className="group cursor-pointer">
                <input
                  type="radio"
                  name="aspectRatio"
                  value={r.value}
                  defaultChecked={defaultRatio === r.value}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700">
                  <span
                    className="inline-block rounded-sm border border-current opacity-40"
                    style={{
                      width: r.value === "1:1" ? 8 : r.value.split(":")[0] > r.value.split(":")[1] ? 10 : 6,
                      height: r.value === "1:1" ? 8 : r.value.split(":")[0] > r.value.split(":")[1] ? 6 : 10,
                    }}
                  />
                  <span>{r.label}</span>
                  <span className="text-[10px] text-slate-400 peer-checked:text-blue-400">{r.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Positive prompt */}
        <div>
          <label className="admin-label">正向提示词</label>
          <textarea
            name="promptTemplate"
            defaultValue={values?.promptTemplate ?? ""}
            rows={5}
            className="admin-field admin-textarea"
          />
        </div>

        {/* Negative prompt */}
        <details className="admin-soft-card px-4 py-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">负向提示词（可选）</summary>
          <div className="mt-3 space-y-2">
            <p className="text-xs leading-5 text-slate-500">仅在需要排除杂色、变形或不想要元素时填写，留空则按默认策略生成。</p>
            <textarea
              name="negativePrompt"
              defaultValue={negativePrompt}
              rows={3}
              className="admin-field min-h-[96px]"
            />
          </div>
        </details>

        {/* Active + actions */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="isActive" defaultChecked={values ? values.isActive : true} className="size-4 rounded border-slate-300" />
              启用当前提示词
            </label>
            {state.message && (
              <span className={`text-xs font-medium ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>{state.message}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {values?.id && <DeleteButton promptId={values.id} />}
            <button
              type="submit"
              className="admin-compact-button bg-slate-900 px-4 text-white hover:bg-slate-800"
            >
              <Save className="size-3.5" />
              {values ? "保存配置" : "新增提示词"}
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
      const raw = await res.text();
      let data: { ok?: boolean; message?: string; outputImageUrl?: string } | null = null;

      try {
        data = raw ? (JSON.parse(raw) as { ok?: boolean; message?: string; outputImageUrl?: string }) : null;
      } catch {
        setError(
          raw.trimStart().startsWith("<")
            ? `Server returned an HTML error page (${res.status}).`
            : raw || `Request failed with status ${res.status}.`,
        );
        return;
      }

      if (data?.ok && data.outputImageUrl) setResultUrl(data.outputImageUrl);
      else setError(data?.message || `Request failed with status ${res.status}.`);
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
    <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-3.5 text-violet-500" />
        <span className="text-sm font-semibold text-slate-900">测试生成效果</span>
        <span className="text-xs text-slate-400">上传商品图并基于当前提示词快速预览结果</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="admin-soft-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">源图上传</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">支持单张商品图测试，图片大小不超过 10MB。</p>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="admin-compact-button border border-dashed border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
            >
              <Upload className="size-3.5" />
              {sourcePreview ? "重新上传" : "上传商品图"}
            </button>
          </div>

          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

          <div className="mt-4">
            {sourcePreview ? (
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                <img src={sourcePreview} alt="源图预览" className="h-52 w-full rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={clearSource}
                  className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm hover:text-slate-700"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                <div className="space-y-2 px-6">
                  <p className="text-sm font-medium text-slate-700">暂无测试图片</p>
                  <p className="text-xs leading-5 text-slate-500">先上传一张商品图，再点击右侧按钮触发测试生成。</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="admin-soft-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">结果预览</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">直接复用当前保存的提示词与激活模型，不写入正式生成记录。</p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !activeModel}
              className="admin-compact-button bg-violet-600 px-4 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? <LoaderCircle className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}
              {generating ? "生成中..." : "开始测试"}
            </button>
          </div>

          {error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

          <div className="mt-4">
            {resultUrl ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                  <img src={resultUrl} alt="生成结果" className="h-52 w-full rounded-xl object-cover" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">已完成一轮快速测试，可继续换图或微调提示词后再次生成。</p>
                  <a
                    href={resultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    查看原图 →
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                <div className="space-y-2 px-6">
                  <p className="text-sm font-medium text-slate-700">结果将在这里展示</p>
                  <p className="text-xs leading-5 text-slate-500">若未配置模型，将沿用设置页的校验结果并提示先完成配置。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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
      className="admin-compact-button border border-rose-200 bg-white px-4 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
      disabled={isDeleting}
      onClick={handleDelete}
    >
      <Trash2 className="size-3.5" />
      {isDeleting ? "删除中..." : "删除"}
    </button>
  );
}
