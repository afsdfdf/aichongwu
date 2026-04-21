"use client";

import { useActionState } from "react";
import { importBucketAssetsAction } from "@/app/admin/(protected)/actions";

const initialState = { ok: false, message: "" };

export function AssetImportForm() {
  const [state, formAction] = useActionState(importBucketAssetsAction, initialState);

  return (
    <form action={formAction} className="glass space-y-5 rounded-[28px] p-6">
      <div>
        <h3 className="text-xl font-semibold text-white">导入现有 S3 内容</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          首次上线时，可以把 bucket 里的已有图片资源导入到后台索引中，后续可直接在网站里展示或复用。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Prefix（可选）</label>
          <input
            name="prefix"
            placeholder="例如：results/ 或 products/"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">最多导入数</label>
          <input
            name="maxKeys"
            type="number"
            min={1}
            max={500}
            defaultValue={100}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-400">{state.message}</p>
        <button
          type="submit"
          className="rounded-2xl bg-sky-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
        >
          从 S3 导入
        </button>
      </div>
    </form>
  );
}
