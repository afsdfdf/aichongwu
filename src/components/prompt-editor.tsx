"use client";

import { useActionState, useMemo } from "react";
import { deletePromptAction, savePromptAction } from "@/app/admin/(protected)/actions";

type PromptRow = {
  id: string;
  productType: string;
  displayName: string;
  promptTemplate: string;
  negativePrompt: string | null;
  isActive: boolean;
};

const initialState = { ok: false, message: "" };

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
    >
      {label}
    </button>
  );
}

export function PromptEditor({
  title,
  description,
  values,
}: {
  title: string;
  description: string;
  values?: PromptRow;
}) {
  const [state, formAction] = useActionState(savePromptAction, initialState);
  const negativePrompt = useMemo(() => values?.negativePrompt ?? "", [values?.negativePrompt]);

  return (
    <form action={formAction} className="admin-panel space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {values?.id ? (
          <button
            type="submit"
            formAction={deletePromptAction}
            name="id"
            value={values.id}
            className="rounded-2xl border border-rose-200 px-4 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
          >
            删除
          </button>
        ) : null}
      </div>

      <input type="hidden" name="id" defaultValue={values?.id ?? ""} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-slate-600">商品类型 key</label>
          <input
            name="productType"
            defaultValue={values?.productType ?? ""}
            placeholder="frame / fridge-magnet / keychain"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">后台显示名称</label>
          <input
            name="displayName"
            defaultValue={values?.displayName ?? ""}
            placeholder="相框"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-slate-600">正向提示词</label>
        <textarea
          name="promptTemplate"
          defaultValue={values?.promptTemplate ?? ""}
          rows={7}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-slate-600">负向提示词（可选）</label>
        <textarea
          name="negativePrompt"
          defaultValue={negativePrompt}
          rows={3}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={values ? values.isActive : true}
          className="size-4"
        />
        启用该商品提示词
      </label>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{state.message}</p>
        <SubmitButton label={values ? "保存修改" : "新增提示词"} />
      </div>
    </form>
  );
}
