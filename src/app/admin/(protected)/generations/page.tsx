/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { StatusPill } from "@/components/dashboard";
import { listGenerationRecords } from "@/lib/store";
import { formatDate, getDefaultShopDomain } from "@/lib/utils";

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
      <div className="glass rounded-[36px] p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-sky-300/70">Generations Explorer</p>
            <h1 className="mt-4 text-4xl font-semibold text-white">生成记录中心</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              这里汇总顾客上传、AI 输出、提示词、模型、订单映射与客户邮箱。支持按状态、商品类型、模型和关键词快速筛选。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="当前结果数" value={filteredRows.length} />
            <MetricCard label="已下单" value={orderedCount} />
            <MetricCard label="待转化" value={filteredRows.length - orderedCount} />
          </div>
        </div>
      </div>

      <form className="glass rounded-[32px] p-5">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              name="q"
              defaultValue={query}
              placeholder="搜索邮箱 / 商品 / 提示词 / 订单号"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-white"
            />
          </label>

          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white"
          >
            <option value="">全部状态</option>
            <option value="ordered">已下单</option>
            <option value="generated">仅已生成</option>
          </select>

          <select
            name="productType"
            defaultValue={params.productType ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white"
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
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white"
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
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
          >
            <SlidersHorizontal className="size-4" />
            筛选
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {filteredRows.length === 0 ? (
          <div className="glass rounded-[28px] p-6 text-sm text-slate-400">没有匹配的记录。</div>
        ) : (
          filteredRows.map((item) => (
            <article key={item.id} className="glass rounded-[30px] p-5">
              <div className="grid gap-5 2xl:grid-cols-[180px_1fr]">
                <img
                  src={item.outputImageUrl}
                  alt={item.productType}
                  className="aspect-square w-full rounded-[28px] object-cover"
                />

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={item.orderId ? "ordered" : item.status} />
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{item.productType}</span>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{item.modelUsed}</span>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                      {item.orderName || "未下单"}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {item.productTitle || item.productType}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {item.customerEmail || "未记录邮箱"} · {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-3">
                    <InfoTile label="客户邮箱" value={item.customerEmail || "等待订单 webhook 回写"} />
                    <InfoTile label="订单号" value={item.orderName || "尚未关联订单"} />
                    <InfoTile label="Generation ID" value={item.id} />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-sm text-slate-500">提示词</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                        {item.promptUsed}
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-sm text-slate-500">操作</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <a
                          href={item.outputImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950"
                        >
                          打开效果图
                        </a>
                        <a
                          href={item.sourceImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200"
                        >
                          打开原图
                        </a>
                        <Link
                          href="/admin/install"
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200"
                        >
                          查看安装页
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.02] p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm leading-7 text-slate-200">{value}</p>
    </div>
  );
}
