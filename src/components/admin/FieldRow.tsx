import type { ReactNode } from "react";

export function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-black/5 pb-4 last:border-b-0 last:pb-0 md:grid-cols-[220px_minmax(0,1fr)] dark:border-white/5">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description ? <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
