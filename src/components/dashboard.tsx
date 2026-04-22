/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, Box, Clock3, Cpu, Images, ShoppingBag, Users } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type BreakdownItem = {
  label: string;
  value: number;
  share: number;
};

type TrendPoint = {
  label: string;
  value: number;
  ordered: number;
};

type DashboardSummary = {
  totalGenerations: number;
  orderedCount: number;
  pendingCount: number;
  todayCount: number;
  averageDaily: number;
  conversionRate: number;
  weekOverWeek: number;
  activeCustomers: number;
  activeModels: number;
  activeProducts: number;
};

type DashboardRecent = {
  id: string;
  productType: string;
  productTitle: string | null;
  outputImageUrl: string;
  sourceImageUrl: string;
  customerEmail: string | null;
  modelUsed: string;
  promptUsed: string;
  orderName: string | null;
  orderId: string | null;
  status: string;
  createdAt: string | Date;
};

/* ── Hero Banner ── */
export function DashboardHero({
  shopDomain,
  activeModel,
  conversionRate,
}: {
  shopDomain: string;
  activeModel: string;
  conversionRate: number;
}) {
  return (
    <section className="admin-page-header lg:flex-row lg:items-end lg:justify-between lg:gap-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Merchant Intelligence
        </div>
        <h1 className="admin-page-header-title mt-3">Shopify AI 商品效果图后台</h1>
        <p className="admin-page-header-description mt-3">
          当前店铺 <span className="font-semibold text-slate-900">{shopDomain}</span> 正在使用 <span className="font-semibold text-slate-900">{activeModel}</span>
          处理生成任务，当前转化率为 <span className="font-semibold text-slate-900">{conversionRate}%</span>。
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3">
        <Link
          href="/admin/generations"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          查看生成记录 <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/admin/preview"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          打开功能预览
        </Link>
      </div>
    </section>
  );
}

/* ── KPI Cards ── */
export function KpiGrid({
  summary,
  promptCount,
}: {
  summary: DashboardSummary;
  promptCount: number;
}) {
  const items = [
    { label: "累计生成", value: summary.totalGenerations, meta: `今天 +${summary.todayCount}`, icon: Images },
    { label: "已形成订单", value: summary.orderedCount, meta: `转化率 ${summary.conversionRate}%`, icon: ShoppingBag },
    { label: "待转化", value: summary.pendingCount, meta: "可继续营销召回", icon: Clock3 },
    { label: "活跃客户", value: summary.activeCustomers, meta: "按邮箱去重", icon: Users },
    { label: "可用模型", value: summary.activeModels, meta: "支持继续扩展", icon: Cpu },
    { label: "提示词数", value: promptCount, meta: `覆盖 ${summary.activeProducts} 个商品类型`, icon: Box },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <article key={item.label} className="admin-panel p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs text-slate-500">{item.label}</p>
                <h3 className="mt-1.5 text-2xl font-semibold text-slate-900">{item.value}</h3>
              </div>
              <div className="shrink-0 rounded-lg bg-slate-100 p-2">
                <Icon className="size-4 text-slate-600" />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">{item.meta}</p>
          </article>
        );
      })}
    </section>
  );
}

/* ── 7-Day Trend ── */
export function TrendPanel({
  summary,
  trend,
}: {
  summary: DashboardSummary;
  trend: TrendPoint[];
}) {
  const max = Math.max(...trend.map((item) => item.value), 1);

  return (
    <section className="admin-panel p-5 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">7-Day Trend</p>
          <h2 className="mt-1.5 text-lg font-semibold text-slate-900 lg:text-xl">最近 7 天生成趋势</h2>
          <p className="mt-1 text-sm text-slate-500">
            平均每日 {summary.averageDaily} 次生成，环比上周{" "}
            <span className={cn("font-medium", summary.weekOverWeek >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {summary.weekOverWeek >= 0 ? "+" : ""}
              {summary.weekOverWeek}%
            </span>
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
          当前待转化：{summary.pendingCount}
        </div>
      </div>

      <div className="mt-5 grid h-[140px] grid-cols-7 items-end gap-2 lg:h-[180px] lg:gap-3">
        {trend.map((point) => {
          const height = `${Math.max(12, Math.round((point.value / max) * 100))}%`;
          return (
            <div key={point.label} className="flex h-full flex-col items-center justify-end gap-1.5">
              <div className="text-[11px] text-slate-400">{point.value}</div>
              <div className="relative flex h-full w-full items-end justify-center rounded-md bg-slate-100 p-1">
                <div className="w-full rounded-sm bg-[linear-gradient(180deg,#60a5fa_0%,#2563eb_100%)]" style={{ height }} />
                <div
                  className="absolute bottom-1 left-1 right-1 rounded-sm bg-emerald-400"
                  style={{
                    height: point.value ? `${Math.max(4, Math.round((point.ordered / point.value) * 100))}%` : "0%",
                  }}
                />
              </div>
              <div className="text-[11px] text-slate-500">{point.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Breakdown Cards ── */
export function BreakdownPanels({
  productBreakdown,
  modelBreakdown,
}: {
  productBreakdown: BreakdownItem[];
  modelBreakdown: BreakdownItem[];
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <BreakdownCard title="商品类型分布" description="查看哪些商品类型的 AI 预览需求更高。" items={productBreakdown} />
      <BreakdownCard title="模型使用分布" description="对比当前默认模型与历史记录的分布情况。" items={modelBreakdown} />
    </section>
  );
}

function BreakdownCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: BreakdownItem[];
}) {
  return (
    <article className="admin-panel p-5 lg:p-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      <div className="mt-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">暂无数据。</div>
        ) : (
          items.slice(0, 5).map((item) => (
            <div key={item.label} className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.value} 次记录</p>
                </div>
                <span className="text-sm text-slate-700">{item.share}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200">
                <div className="h-1.5 rounded-full bg-[linear-gradient(90deg,#60a5fa_0%,#10b981_100%)]" style={{ width: `${Math.max(5, item.share)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

/* ── Recent Activity ── */
export function RecentActivityPanel({
  rows,
  title,
  description,
}: {
  rows: DashboardRecent[];
  title: string;
  description: string;
}) {
  return (
    <article className="admin-panel p-5 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
        <Link href="/admin/generations" className="shrink-0 text-sm text-sky-600">
          查看全部
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">暂无记录。</div>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <img src={item.outputImageUrl} alt={item.productType} className="aspect-square w-full rounded-lg object-cover" />
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <StatusPill status={item.orderId ? "ordered" : item.status} />
                <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] text-slate-500">{item.modelUsed}</span>
              </div>
              <h3 className="mt-2 line-clamp-1 text-sm font-medium text-slate-900">{item.productTitle || item.productType}</h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const styles =
    normalized === "ordered"
      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
      : normalized === "generated"
        ? "border-sky-200 bg-sky-50 text-sky-600"
        : "border-slate-200 bg-white text-slate-500";

  const label = normalized === "ordered" ? "已下单" : normalized === "generated" ? "已生成" : status;

  return <span className={cn("rounded-lg border px-2.5 py-0.5 text-xs", styles)}>{label}</span>;
}
