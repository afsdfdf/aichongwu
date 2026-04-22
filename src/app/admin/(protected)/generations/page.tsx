import { Search, SlidersHorizontal } from "lucide-react";
import { GenerationGallery } from "@/components/generation-gallery";
import { HistorySyncForm } from "@/components/history-sync-form";
import { listGenerationRecords } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const revalidate = 5;

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    productType?: string;
    model?: string;
    q?: string;
  }>;
};

function matchesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

export default async function GenerationsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rows = await listGenerationRecords(getDefaultShopDomain());
  const query = params.q?.trim() ?? "";
  const productTypes = [...new Set(rows.map((item) => item.productType))];
  const models = [...new Set(rows.map((item) => item.modelUsed))];

  const filteredRows = rows.filter((item) => {
    if (params.status === "ordered" && !item.orderId) return false;
    if (params.status === "generated" && item.orderId) return false;
    if (params.productType && params.productType !== item.productType) return false;
    if (params.model && params.model !== item.modelUsed) return false;
    if (
      query &&
      ![
        item.productType,
        item.productTitle ?? "",
        item.customerEmail ?? "",
        item.modelUsed,
        item.promptUsed,
        item.orderName ?? "",
      ].some((value) => matchesQuery(value, query))
    ) {
      return false;
    }
    return true;
  });

  const orderedCount = filteredRows.filter((item) => item.orderId).length;

  return (
    <>
      <section className="admin-page-header">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="admin-page-header-kicker">Generations Gallery</p>
            <h1 className="admin-page-header-title mt-2">效果图画廊</h1>
            <p className="admin-page-header-description mt-2">
              默认显示效果图，支持查看原图、批量勾选下载与历史记录同步。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="当前结果数" value={filteredRows.length} note="按当前筛选条件统计" />
            <MetricCard label="已下单" value={orderedCount} note="已关联订单的记录" />
            <MetricCard label="待转化" value={filteredRows.length - orderedCount} note="尚未形成订单" />
          </div>
        </div>
      </section>

      <div className="admin-panel p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-slate-900">筛选与同步</p>
          <p className="admin-muted-note">支持按状态、商品类型、模型和关键词快速缩小结果范围。</p>
        </div>

        <form className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative block lg:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={query}
                placeholder="搜索邮箱 / 商品 / 提示词 / 订单号"
                className="admin-field pl-11"
              />
            </label>
            <button
              type="submit"
              className="admin-compact-button shrink-0 bg-slate-900 px-4 text-white hover:bg-slate-800"
            >
              <SlidersHorizontal className="size-4" />
              应用筛选
            </button>
            <HistorySyncForm />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <label>
              <span className="admin-label">状态</span>
              <select name="status" defaultValue={params.status ?? ""} className="admin-field">
                <option value="">全部状态</option>
                <option value="ordered">已下单</option>
                <option value="generated">仅已生成</option>
              </select>
            </label>

            <label>
              <span className="admin-label">商品类型</span>
              <select name="productType" defaultValue={params.productType ?? ""} className="admin-field">
                <option value="">全部商品类型</option>
                {productTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="admin-label">模型</span>
              <select name="model" defaultValue={params.model ?? ""} className="admin-field">
                <option value="">全部模型</option>
                {models.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>
      </div>

      {filteredRows.length === 0 ? (
        <div className="admin-panel p-6 text-sm text-slate-500">没有匹配的记录。</div>
      ) : (
        <GenerationGallery rows={filteredRows} />
      )}
    </>
  );
}

function MetricCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="admin-soft-card px-4 py-3.5">
      <p className="text-sm text-slate-500">{label}</p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-900">{value}</h2>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </article>
  );
}
