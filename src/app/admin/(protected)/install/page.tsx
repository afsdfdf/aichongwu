import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

const requiredStructure = [
  "Trust points 显示在上传按钮上方",
  "主按钮文案保持 Upload Your Pet Photo，并带 FREE PREVIEW 标签",
  "Social proof 显示在主按钮下方",
  "Mini steps 必须保持 4 步：Upload Photo / Preview Design / Choose Color / Place Order",
  "弹窗必须包含 Photo tips、Your Photo、Your Design、Try Again、Use This Design",
  "Use This Design 点击前，颜色选择与 Add to cart 必须保持锁定",
  "确认设计后才写入 _AI Design Confirmed 与 _AI Design Confirmed At",
  "最终订单必须携带 line item properties 供 webhook 回写关联",
];

const deliverySteps = [
  {
    title: "步骤 1 · 打开正确的商品模板",
    body:
      "进入 Shopify 后台 > Online Store > Themes > Customize，打开目标商品实际正在使用的 product template。必须确认你编辑的模板，就是线上商品页当前绑定的模板。",
  },
  {
    title: "步骤 2 · 在商品信息区域添加 Custom Liquid",
    body:
      "在 product information 区域新增一个 Custom Liquid 区块。这个区块只负责挂载上传组件，不要把代码拆散到主题其他文件里。",
  },
  {
    title: "步骤 3 · 原样粘贴安装代码",
    body:
      "把下方完整代码整段复制到 Custom Liquid。不要删掉 data-* 属性，不要删 script 标签，也不要改 root id。",
  },
  {
    title: "步骤 4 · 把区块移动到颜色选择器上方",
    body:
      "把这个 Custom Liquid 区块放在 variant / color selector 上方。这个顺序是文档标准的一部分，不能改。",
  },
  {
    title: "步骤 5 · 保存后检查页面顺序",
    body:
      "保存主题并打开目标商品页。页面顺序必须是：Trust points > Upload button > Social proof > Mini steps > Upload / Preview flow > Color selection > Add to cart。",
  },
  {
    title: "步骤 6 · 走完整个客户流程",
    body:
      "上传宠物照片，生成预览，点击 Use This Design，然后确认颜色选择与 Add to cart 只会在设计确认后解锁。",
  },
  {
    title: "步骤 7 · 检查订单追踪字段",
    body:
      "提交测试订单后，检查订单 line item properties 中是否包含 _AI Generation ID、_AI Preview URL、_AI Model、_AI Prompt、_AI Design Confirmed、_AI Design Confirmed At。",
  },
];

const acceptanceChecklist = [
  "按钮仍显示英文 Upload Your Pet Photo，且可见 FREE PREVIEW 标签",
  "组件整体位于 variant / color selector 上方",
  "弹窗里能看到 Photo tips、Your Photo、Your Design、Try Again、Use This Design",
  "未点击 Use This Design 前，Choose Color 与 Add to cart 不能提前开放",
  "点击 Use This Design 后，才写入 _AI Design Confirmed = yes",
  "测试订单中能看到完整 AI line item properties",
  "页面从上到下的结构与参考文档一致，没有额外插入主题原生模块打断流程",
];

const trackedProperties = [
  "properties[_AI Generation ID]",
  "properties[_AI Preview URL]",
  "properties[_AI Model]",
  "properties[_AI Prompt]",
  "properties[_AI Design Confirmed]",
  "properties[_AI Design Confirmed At]",
];

function getSnippet(appUrl: string) {
  return `{%- comment -%}
Memory Mint Compatible Widget
Install path: Shopify Admin > Online Store > Themes > Customize > Product template > Add section > Custom Liquid
Recommended placement: directly above the variant / color picker
Do not remove the data attributes or modify the root id
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
        <p className="admin-page-header-kicker">Shopify 安装标准</p>
        <h1 className="admin-page-header-title">按参考文档交付的标准安装页</h1>
        <p className="admin-page-header-description">
          这里不是简化教程，而是可直接交付给客户的标准安装文档。页面说明用中文，安装代码、前台按钮与追踪字段继续保持英文，确保海外店铺可直接上线。
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="admin-panel p-5 lg:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">安装目标</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">这次安装必须满足的文档标准</h2>
          <div className="mt-5 space-y-3">
            {requiredStructure.map((item, index) => (
              <div key={item} className="admin-soft-card flex gap-3 px-4 py-4">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel p-5 lg:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">交付基线</p>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">参考 storefront</p>
              <p className="mt-2 break-all text-sm leading-7 text-slate-600">
                https://getmemorymint.com/products/custom-3d-pet-portrait-keychain-premium-leather-metal
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">当前店铺</p>
              <p className="mt-2 break-all text-sm leading-7 text-slate-600">{shopDomain}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">当前使用模型</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{setting.activeModel}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">订单 webhook</p>
              <p className="mt-2 break-all text-sm leading-7 text-slate-600">{appUrl}/api/shopify/orders</p>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-panel p-5 lg:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">标准安装代码</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">只允许粘贴这段代码，不要改结构</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          把下面这段代码完整粘贴到 Shopify 商品模板的 Custom Liquid，并放在变体 / 颜色选择器上方。代码内注释与属性保持英文，避免客户或主题开发者二次修改时破坏挂载逻辑。
        </p>
        <pre className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-5 text-sm leading-7 text-slate-100">
          <code>{snippet}</code>
        </pre>
      </section>

      <section className="admin-panel p-5 lg:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">安装步骤</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">给客户的完整安装与验收流程</h2>
        <div className="mt-5 space-y-3">
          {deliverySteps.map((step, index) => (
            <div key={step.title} className="admin-soft-card px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#2B473F] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="admin-panel p-5 lg:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">验收清单</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">交付前必须逐项核对</h2>
          <div className="mt-5 space-y-3">
            {acceptanceChecklist.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
                <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2B473F] text-[11px] font-bold text-white">
                  ✓
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel p-5 lg:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">订单追踪字段</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">这些字段必须出现在订单里</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            widget 会把下列 line item properties 写入商品表单。Shopify 订单创建后，webhook 依赖这些字段把订单和生成记录重新关联起来。
          </p>
          <div className="mt-5 space-y-3">
            {trackedProperties.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm leading-7 text-slate-100">
                <code>{item}</code>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-sm font-semibold text-amber-900">注意</p>
            <p className="mt-2 text-sm leading-7 text-amber-800">
              不要把安装页理解成“复制代码就结束”。真正的交付标准还包括前台模块顺序、按钮英文文案、Use This Design 解锁逻辑，以及订单追踪字段完整性。
            </p>
          </div>
        </section>
      </div>

      <section className="admin-panel p-5 lg:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">补充说明</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">提示词匹配</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              前端会同时传 shop_domain 与 product.type，后端据此匹配当前店铺、当前商品类型对应的提示词，安装方式本身不需要因店铺变化而修改。
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">按钮文案</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{setting.widgetButtonText}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">按钮颜色</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{setting.widgetAccentColor}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
