import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { FormCard } from "@/components/admin/FormCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StickyActionBar } from "@/components/admin/StickyActionBar";
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
    <div className="space-y-4">
      <PageHeader
        title="效果图画廊"
        description="默认显示效果图，支持查看原图、批量下载、历史记录同步与多条件筛选。"
        actions={
          <>
            <Link
              href="/admin"
              className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              返回总览
            </Link>
            <HistorySyncForm />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <FormCard title="当前结果数" description="按当前筛选条件统计。">
          <p className="text-3xl font-semibold text-slate-900">{filteredRows.length}</p>
        </FormCard>
        <FormCard title="已下单" description="已经关联 Shopify 订单的记录。">
          <p className="text-3xl font-semibold text-slate-900">{orderedCount}</p>
        </FormCard>
        <FormCard title="待转化" description="已生成但尚未形成订单。">
          <p className="text-3xl font-semibold text-slate-900">{filteredRows.length - orderedCount}</p>
        </FormCard>
      </div>

      <FormCard title="筛选与同步" description="按状态、商品类型、模型和关键词缩小结果范围。">
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
      </FormCard>

      {filteredRows.length === 0 ? (
        <FormCard title="暂无结果" description="没有匹配当前筛选条件的记录。">
          <p className="text-sm text-slate-500">可以清空筛选条件，或者先去前台生成新的效果图。</p>
        </FormCard>
      ) : (
        <GenerationGallery rows={filteredRows} />
      )}

      <StickyActionBar>
        <span className="mr-auto text-sm text-slate-500">需要补历史记录时，可点击顶部“同步历史”按钮重新从 S3 导入。</span>
        <Link
          href="/admin/install"
          className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          查看安装文档
        </Link>
      </StickyActionBar>
    </div>
  );
}
