import type { ReactNode } from "react";
import { clsx } from "clsx";

export function FormCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900", className)}>
      <div className="mb-4 space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
