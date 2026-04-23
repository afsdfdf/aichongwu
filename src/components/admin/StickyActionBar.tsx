import type { ReactNode } from "react";

export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-4 z-10 mt-4 flex items-center justify-end gap-3 rounded-2xl border border-black/10 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95">
      {children}
    </div>
  );
}
