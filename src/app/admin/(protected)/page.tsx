import {
  BreakdownPanels,
  DashboardHero,
  KpiGrid,
  RecentActivityPanel,
  TrendPanel,
} from "@/components/dashboard";
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
    <>
      <DashboardHero
        shopDomain={shopDomain}
        activeModel={setting.activeModel}
        conversionRate={dashboard.summary.conversionRate}
      />

      <KpiGrid summary={dashboard.summary} promptCount={prompts.length} />

      <TrendPanel summary={dashboard.summary} trend={dashboard.trend} />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <RecentActivityPanel
          rows={dashboard.recent.slice(0, 6)}
          title="最近生成"
          description="横向一行快速查看最新效果图。"
        />
        <BreakdownPanels
          productBreakdown={dashboard.productBreakdown}
          modelBreakdown={dashboard.modelBreakdown}
        />
      </div>
    </>
  );
}
