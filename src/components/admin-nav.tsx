"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ImageIcon,
  LayoutDashboard,
  LogOut,
  PlugZap,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/admin",
    label: "总览看板",
    description: "统计、趋势、最近活动",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/generations",
    label: "生成记录",
    description: "效果图、原图、订单映射",
    icon: ImageIcon,
  },
  {
    href: "/admin/prompts",
    label: "提示词管理",
    description: "按商品类型绑定 Prompt",
    icon: Sparkles,
  },
  {
    href: "/admin/settings",
    label: "模型与存储",
    description: "S3、API Key、Webhook",
    icon: PlugZap,
  },
  {
    href: "/admin/install",
    label: "Shopify 安装",
    description: "嵌入代码、验证与接入",
    icon: Settings,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar sticky top-0 h-screen overflow-hidden">
      <div className="flex h-full flex-col px-5 py-6">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Merchant Console</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">AI Preview</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            标准 SaaS 后台结构：左侧导航，右侧功能区。每个导航只负责一个独立功能页面。
          </p>
        </div>

        <nav className="mt-6 flex-1 space-y-2 overflow-auto pr-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-start gap-3 rounded-2xl px-4 py-4 transition",
                  active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 rounded-xl p-2.5",
                    active ? "bg-white/12 text-white" : "bg-slate-100 text-slate-600",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className={cn("mt-1 text-xs leading-5", active ? "text-slate-300" : "text-slate-500")}>
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/admin/login";
          }}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          <LogOut className="size-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
