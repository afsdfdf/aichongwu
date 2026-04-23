"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Eye,
  FileStack,
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
    description: "统计、趋势与最近活动",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/generations",
    label: "生成记录",
    description: "效果图、原图与订单映射",
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
    description: "S3、API Key 与接口配置",
    icon: PlugZap,
  },
  {
    href: "/admin/preview",
    label: "功能预览",
    description: "前台按钮、生成流程与测试展示",
    icon: Eye,
  },
  {
    href: "/admin/blueprint",
    label: "界面蓝图",
    description: "升级模板与统一后台骨架",
    icon: FileStack,
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
      <div className="flex h-full flex-col px-4 py-5 lg:px-5 lg:py-6">
        <div className="admin-soft-card px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Merchant Console</p>
          <h1 className="mt-2 text-lg font-bold text-slate-900">AI Preview</h1>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">统一管理生成记录、提示词、模型配置与交付文档。</p>
        </div>

        <nav className="mt-5 flex-1 space-y-1.5 overflow-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-sm transition",
                  active
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl transition",
                    active ? "bg-white/12 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold">{item.label}</div>
                  <div className={cn("mt-1 text-xs leading-5", active ? "text-slate-300" : "text-slate-400")}>{item.description}</div>
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
          className="admin-soft-card mt-4 flex items-center gap-2 px-3.5 py-3 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-700"
        >
          <LogOut className="size-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
