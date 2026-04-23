import type { ReactNode } from "react";
import { clsx } from "clsx";

export function AdminShell({
  sidebar,
  header,
  children,
  className,
}: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-r border-black/10 bg-white/80 px-4 py-5 dark:border-white/10 dark:bg-neutral-900">
          {sidebar}
        </aside>
        <main className={clsx("flex min-h-screen flex-col", className)}>
          <div className="border-b border-black/10 bg-white/80 px-6 py-5 backdrop-blur dark:border-white/10 dark:bg-neutral-900/80">
            {header}
          </div>
          <div className="flex-1 px-4 py-4 md:px-6 md:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
