/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  ArrowRight,
  Box,
  ChartNoAxesColumn,
  CircleDashed,
  Clock3,
  Cpu,
  Images,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
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
    <section className="admin-panel p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase tracking-[0.25em] text-slate-500">
            Merchant Intelligence
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Shopify AI 商品效果图后台
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
            当前店铺 <span className="font-medium text-slate-900">{shopDomain}</span> 正在使用{" "}
            <span className="font-medium text-slate-900">{activeModel}</span> 处理生成任务。你可以在这里查看转化率、
            生成趋势、商品分布和最近订单记录。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/generations"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              查看生成记录 <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/admin/install"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              打开 Shopify 安装页
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SpotlightCard icon={Sparkles} label="下单转化率" value={`${conversionRate}%`} meta="按已生成记录计算" />
          <SpotlightCard icon={Cpu} label="当前默认模型" value={activeModel} meta="后台可随时切换" />
          <SpotlightCard icon={ChartNoAxesColumn} label="订单链路" value="Webhook Ready" meta="订单自动回写关联" />
          <SpotlightCard icon={Images} label="媒体留存" value="S3 Archive" meta="原图与效果图长期可查" />
        </div>
      </div>
    </section>
  );
}

function SpotlightCard({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <Icon className="size-5 text-slate-700" />
      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{value}</h2>
      <p className="mt-2 text-xs text-slate-400">{meta}</p>
    </article>
  );
}

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
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <article key={item.label} className="admin-panel p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <h3 className="mt-3 text-4xl font-semibold text-slate-900">{item.value}</h3>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <Icon className="size-5 text-slate-700" />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">{item.meta}</p>
          </article>
        );
      })}
    </section>
  );
}

export function TrendPanel({
  summary,
  trend,
}: {
  summary: DashboardSummary;
  trend: TrendPoint[];
}) {
  const max = Math.max(...trend.map((item) => item.value), 1);

  return (
    <section className="admin-panel p-6 lg:p-7">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">7-Day Trend</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">最近 7 天生成趋势</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">
            平均每日 {summary.averageDaily} 次生成，环比上周{" "}
            <span className={cn("font-medium", summary.weekOverWeek >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {summary.weekOverWeek >= 0 ? "+" : ""}
              {summary.weekOverWeek}%
            </span>
            。
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          提示：观察生成量和订单回写是否同步增长。
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="grid h-[280px] grid-cols-7 items-end gap-3">
          {trend.map((point) => {
            const height = `${Math.max(18, Math.round((point.value / max) * 100))}%`;
            return (
              <div key={point.label} className="flex h-full flex-col items-center justify-end gap-3">
                <div className="text-xs text-slate-400">{point.value}</div>
                <div className="relative flex h-full w-full items-end justify-center rounded-full bg-slate-100 p-1">
                  <div className="w-full rounded-full bg-[linear-gradient(180deg,#60a5fa_0%,#2563eb_100%)]" style={{ height }} />
                  <div
                    className="absolute bottom-1 left-1 right-1 rounded-full bg-emerald-400"
                    style={{
                      height: point.value ? `${Math.max(4, Math.round((point.ordered / point.value) * 100))}%` : "0%",
                    }}
                  />
                </div>
                <div className="text-xs text-slate-500">{point.label}</div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <InsightTile icon={TrendingUp} title="趋势变化" value={`${summary.weekOverWeek >= 0 ? "+" : ""}${summary.weekOverWeek}%`} description="对比前 7 天的生成变化" />
          <InsightTile icon={CircleDashed} title="待转化" value={`${summary.pendingCount}`} description="尚未形成订单的生成记录" />
          <InsightTile icon={ShoppingBag} title="已回写订单" value={`${summary.orderedCount}`} description="已绑定 Shopify 订单号" />
        </div>
      </div>
    </section>
  );
}

function InsightTile({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white p-3">
          <Icon className="size-4 text-slate-700" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">{value}</h3>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{description}</p>
    </article>
  );
}

export function BreakdownPanels({
  productBreakdown,
  modelBreakdown,
}: {
  productBreakdown: BreakdownItem[];
  modelBreakdown: BreakdownItem[];
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <BreakdownCard title="商品类型分布" description="看哪些 SKU 的 AI 预览需求更高，方便优化商品页与 Prompt。" items={productBreakdown} />
      <BreakdownCard title="模型使用分布" description="比较当前默认模型与历史记录的分布情况。" items={modelBreakdown} />
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
    <article className="admin-panel p-6">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            暂无数据，先完成几次生成后这里会自动出现分布分析。
          </div>
        ) : (
          items.map((item) => (
            <div key={item.label} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.value} 次记录</p>
                </div>
                <span className="text-sm text-slate-700">{item.share}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-[linear-gradient(90deg,#60a5fa_0%,#10b981_100%)]" style={{ width: `${Math.max(5, item.share)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

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
    <article className="admin-panel p-6">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>

      <div className="mt-6 space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">暂无记录。</div>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[76px_1fr_auto]">
              <img src={item.outputImageUrl} alt={item.productType} className="aspect-square h-[76px] w-[76px] rounded-2xl object-cover" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={item.orderId ? "ordered" : item.status} />
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">{item.modelUsed}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">{item.productType}</span>
                </div>
                <h3 className="mt-3 text-base font-medium text-slate-900">{item.productTitle || item.productType}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.customerEmail || "未记录邮箱"} · {formatDate(item.createdAt)}</p>
              </div>
              <div className="flex flex-col items-start gap-2 lg:items-end">
                {item.orderName ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-600">{item.orderName}</span>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">未下单</span>
                )}
                <a href={item.outputImageUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-600">
                  打开效果图
                </a>
              </div>
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

  return <span className={cn("rounded-full border px-3 py-1 text-xs", styles)}>{label}</span>;
}
