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
      <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.02)_100%)] p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-sky-300/70">Generations Gallery</p>
            <h1 className="mt-4 text-4xl font-semibold text-white">效果图画廊</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              默认显示生成后的效果图，保留“查看原图”入口。浏览体验尽量接近你给的历史图库风格，但接口已改为你的当前 S3 / Shopify 流程。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="当前结果数" value={filteredRows.length} />
            <MetricCard label="已下单" value={orderedCount} />
            <MetricCard label="待转化" value={filteredRows.length - orderedCount} />
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-[#dbe3ef] bg-[#f8fafc] p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <form>
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_auto]">
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
          </div>
        </form>

        <div className="mt-4">
          <HistorySyncForm />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="glass rounded-[28px] p-6 text-sm text-slate-400">没有匹配的记录。</div>
      ) : (
        <GenerationGallery rows={filteredRows} />
      )}
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <h2 className="mt-2 text-3xl font-semibold text-white">{value}</h2>
    </article>
  );
}
