 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ImageIcon, PlugZap, Settings } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "概览", icon: Home },
  { href: "/admin/prompts", label: "提示词", icon: Settings },
  { href: "/admin/settings", label: "模型", icon: PlugZap },
  { href: "/admin/generations", label: "生成记录", icon: ImageIcon },
  { href: "/admin/install", label: "安装", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="glass sticky top-6 h-fit rounded-[28px] p-5">
      <div className="mb-6 space-y-1">
        <p className="text-xs uppercase tracking-[0.25em] text-sky-300/70">Merchant Console</p>
        <h2 className="text-xl font-semibold text-white">AI Preview 后台</h2>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                active
                  ? "bg-sky-400 text-slate-950"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-6">
        <LogoutButton />
      </div>
    </aside>
  );
}
