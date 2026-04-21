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

      <BreakdownPanels
        productBreakdown={dashboard.productBreakdown}
        modelBreakdown={dashboard.modelBreakdown}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <RecentActivityPanel
          rows={dashboard.recent}
          title="最近生成"
          description="快速检查最新顾客提交、模型选择和图片输出是否正常。"
        />
        <RecentActivityPanel
          rows={dashboard.recentOrders}
          title="最近已下单记录"
          description="这些记录已经和 Shopify 订单绑定，可直接用于客服追踪与售后定位。"
        />
      </div>
    </>
  );
}
