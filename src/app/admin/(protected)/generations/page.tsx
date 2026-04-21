import { Search, SlidersHorizontal } from "lucide-react";
import { GenerationGallery } from "@/components/generation-gallery";
import { HistorySyncForm } from "@/components/history-sync-form";
import { listGenerationRecords } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
      <div className="admin-panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Generations Gallery</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">效果图画廊</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              默认显示效果图，支持查看原图、批量勾选下载与历史记录同步。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="当前结果数" value={filteredRows.length} />
            <MetricCard label="已下单" value={orderedCount} />
            <MetricCard label="待转化" value={filteredRows.length - orderedCount} />
          </div>
        </div>
      </div>

      <div className="admin-panel p-4">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_auto_auto]">
          <form className="contents">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={query}
                placeholder="搜索邮箱 / 商品 / 提示词 / 订单号"
                className="w-full rounded-2xl border border-[#d7dfeb] bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none"
              />
            </label>

            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="w-full rounded-2xl border border-[#d7dfeb] bg-white px-4 py-3 text-sm text-slate-700"
            >
              <option value="">全部状态</option>
              <option value="ordered">已下单</option>
              <option value="generated">仅已生成</option>
            </select>

            <select
              name="productType"
              defaultValue={params.productType ?? ""}
              className="w-full rounded-2xl border border-[#d7dfeb] bg-white px-4 py-3 text-sm text-slate-700"
            >
              <option value="">全部商品类型</option>
              {productTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              name="model"
              defaultValue={params.model ?? ""}
              className="w-full rounded-2xl border border-[#d7dfeb] bg-white px-4 py-3 text-sm text-slate-700"
            >
              <option value="">全部模型</option>
              {models.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <SlidersHorizontal className="size-4" />
              筛选
            </button>
          </form>
          <div className="xl:col-span-1 xl:justify-self-end">
            <HistorySyncForm />
          </div>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="admin-panel p-6 text-sm text-slate-500">没有匹配的记录。</div>
      ) : (
        <GenerationGallery rows={filteredRows} />
      )}
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm text-slate-500">{label}</p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-900">{value}</h2>
    </article>
  );
}
