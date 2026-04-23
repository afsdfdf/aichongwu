import Link from "next/link";
import {
  BreakdownPanels,
  DashboardHero,
  KpiGrid,
  RecentActivityPanel,
  TrendPanel,
} from "@/components/dashboard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StickyActionBar } from "@/components/admin/StickyActionBar";
import { getDashboardData } from "@/lib/dashboard";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const shopDomain = getDefaultShopDomain();
  const [{ prompts, setting }, dashboard] = await Promise.all([
    getStoreContext(shopDomain),
    getDashboardData(shopDomain),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="后台总览"
        description={`当前店铺 ${shopDomain} 的生成概览、模型使用情况与近期活动。页面骨架已按升级文档统一。`}
        actions={
          <>
            <Link
              href="/admin/settings"
              className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              模型设置
            </Link>
            <Link
              href="/admin/prompts"
              className="inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              提示词管理
            </Link>
          </>
        }
      />

      <DashboardHero
        shopDomain={shopDomain}
        activeModel={setting.activeModel}
        conversionRate={dashboard.summary.conversionRate}
      />

      <KpiGrid summary={dashboard.summary} promptCount={prompts.length} />

      <TrendPanel summary={dashboard.summary} trend={dashboard.trend} />

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <RecentActivityPanel
          rows={dashboard.recent.slice(0, 6)}
          title="最近生成"
          description="横向一览最近生成记录与结果图。"
        />
        <BreakdownPanels
          productBreakdown={dashboard.productBreakdown}
          modelBreakdown={dashboard.modelBreakdown}
        />
      </div>

      <StickyActionBar>
        <span className="mr-auto text-sm text-slate-500">总览页以读为主，配置变更请前往模型设置或提示词管理。</span>
        <Link
          href="/admin/generations"
          className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          查看记录
        </Link>
      </StickyActionBar>
    </div>
  );
}
