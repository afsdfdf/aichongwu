"use client";

import { useActionState } from "react";
import { syncHistoryAction } from "@/app/admin/(protected)/actions";

const initialState = { ok: false, message: "" };

export function HistorySyncForm() {
  const [state, formAction] = useActionState(syncHistoryAction, initialState);

  return (
    <form action={formAction} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">拉取 S3 历史生成记录</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            扫描 bucket 中的 <code className="text-slate-300">originals/</code> 与{" "}
            <code className="text-slate-300">results/</code>，按时间配对成原图/效果图历史记录。
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex w-fit items-center justify-center rounded-2xl bg-sky-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
        >
          全量同步历史
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-400">{state.message}</p>
    </form>
  );
}
