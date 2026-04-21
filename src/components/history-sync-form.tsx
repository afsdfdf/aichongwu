"use client";

import { useActionState } from "react";
import { RefreshCcw } from "lucide-react";
import { syncHistoryAction } from "@/app/admin/(protected)/actions";

const initialState = { ok: false, message: "" };

export function HistorySyncForm() {
  const [state, formAction, pending] = useActionState(syncHistoryAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-600"
      >
        <RefreshCcw className={`size-4 ${pending ? "animate-spin" : ""}`} />
        全量同步历史
      </button>
      <p className="text-xs text-slate-500">{state.message || "扫描 originals/ 与 results/ 自动回填历史记录"}</p>
    </form>
  );
}
