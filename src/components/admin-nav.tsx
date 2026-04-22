"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Eye,
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
    href: "/admin/preview",
    label: "功能预览",
    description: "店铺按钮、生成流程、测试展示",
    icon: Eye,
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
      <div className="flex h-full flex-col px-4 py-6">
        {/* ── Brand ── */}
        <div className="px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Merchant Console</p>
          <h1 className="mt-1.5 text-lg font-bold text-slate-900">AI Preview</h1>
        </div>

        <div className="mt-5 h-px bg-slate-200" />

        {/* ── Nav ── */}
        <nav className="mt-4 flex-1 space-y-1 overflow-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    active ? "text-white" : "text-slate-400",
                  )}
                />
                <div className="min-w-0">
                  <div>{item.label}</div>
                  <div className={cn("mt-0.5 text-xs leading-4", active ? "text-slate-300" : "text-slate-400")}>
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ── Logout ── */}
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/admin/login";
          }}
          className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="size-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
