import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const revalidate = 5;

const documentSteps = [
  "Memory Mint - 定制功能独立模块 (v3)",
  "使用方法: Shopify 后台 > 产品页模板 > Add section > Custom Liquid > 粘贴此代码",
  "放置位置: 变体选择器(颜色)上方",
  "Trust points 显示在上传按钮上方",
  "Upload Your Pet Photo 按钮带 FREE PREVIEW 标签",
  "Social proof 位于按钮下方",
  "Mini steps 为 4 步流程: Upload Photo / Preview Design / Choose Color / Place Order",
  "Next / Back 按钮用于切换到颜色选择和返回设计页",
  "Modal 包含 Photo tips、原图/效果图预览、Try Again、Use This Design",
  "订单提交依赖 line item properties + webhook 回写",
];

function getSnippet(appUrl: string) {
  return `{%- comment -%}
Memory Mint - Custom Upload Module (v3)
Install path: Shopify Admin > Product template > Add section > Custom Liquid
Placement: above the variant / color picker
{%- endcomment -%}

<div
  id="ai-preview-root"
  data-api-base="${appUrl}"
  data-shop-domain="{{ shop.permanent_domain }}"
  data-product-id="{{ product.id }}"
  data-product-title="{{ product.title | escape }}"
  data-product-type="{{ product.type | default: product.handle | escape }}"
  data-variant-id="{{ product.selected_or_first_available_variant.id }}"
></div>
<script src="${appUrl}/widget.js" defer></script>`;
}

export default async function InstallPage() {
  const appUrl = "https://aichongwu.vercel.app";
  const shopDomain = getDefaultShopDomain();
  const { setting } = await getStoreContext(shopDomain);
  const snippet = getSnippet(appUrl);

  return (
    <div className="space-y-4">
      <section className="admin-page-header">
        <p className="admin-page-header-kicker">Shopify 安装文档</p>
        <h1 className="admin-page-header-title">按文档顺序交付给客户的安装说明</h1>
        <p className="admin-page-header-description">
          这个页面用于直接交付客户。页面说明保持中文，代码块保持英文，不改变 Shopify 接入代码结构，只统一后台外层版式。
        </p>
      </section>

      <div className="admin-panel p-5 lg:p-6">
        <p className="admin-page-header-kicker">文档顺序</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">客户安装步骤</h2>
        <div className="mt-4 space-y-3">
          {documentSteps.map((step, index) => (
            <div key={step} className="admin-soft-card px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</p>
              <p className="mt-2 text-sm leading-7 text-slate-900">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-panel p-5 lg:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">嵌入代码</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">把下面这段代码粘贴到 Shopify 商品模板的 Custom Liquid，并放在变体 / 颜色选择器上方</h2>
        <pre className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-5 text-sm leading-7 text-slate-100">
          <code>{snippet}</code>
        </pre>
      </div>

      <div className="admin-panel p-5 lg:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">多店铺 / 多商品类型提示词规则</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">当前店铺</p>
            <p className="mt-2 break-all text-sm leading-7 text-slate-600">{shopDomain}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">提示词匹配方式</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              前端会把 <span className="font-medium text-slate-900">shop_domain</span> 和 <span className="font-medium text-slate-900">product.type</span> 一起传给后端。
              后端会按当前店铺、当前商品类型匹配对应提示词，所以不同店铺、不同商品类型可以使用不同提示词，而前端安装方式保持不变。
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="admin-panel p-5 lg:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">当前使用模型</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{setting.activeModel}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">这里显示的是当前启用模型。模型不是写死的，后台管理员可随时切换。</p>
        </div>

        <div className="admin-panel p-5 lg:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">按钮文案</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{setting.widgetButtonText}</p>
        </div>

        <div className="admin-panel p-5 lg:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">按钮颜色</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{setting.widgetAccentColor}</p>
        </div>

        <div className="admin-panel p-5 lg:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">订单 webhook</p>
          <p className="mt-2 break-all text-lg font-semibold text-slate-900">{appUrl}/api/shopify/orders</p>
        </div>
      </div>
    </div>
  );
}
