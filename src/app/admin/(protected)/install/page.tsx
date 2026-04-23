import { FormCard } from "@/components/admin/FormCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StickyActionBar } from "@/components/admin/StickyActionBar";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

const requiredStructure = [
  "Trust points 显示在上传按钮上方",
  "主按钮文案保持 Upload Your Pet Photo，并带 FREE PREVIEW 标签",
  "Social proof 显示在主按钮下方",
  "Mini steps 保持 4 步：Upload Photo / Preview Design / Choose Color / Place Order",
  "弹窗必须包含 Photo tips、your Photo、your Design、Try Again、Use This Design",
  "Use This Design 点击前，颜色选择与 Add to cart 保持锁定",
  "确认设计后才写入 _AI Design Confirmed 与 _AI Design Confirmed At",
  "最终订单必须携带 line item properties 供 webhook 回写关联",
];

const deliverySteps = [
  "打开正确的 Shopify product template。",
  "在 product information 区域新增一个 Custom Liquid 区块。",
  "完整粘贴安装代码，不删除 data-* 属性和根节点 id。",
  "将区块移动到 variant / color selector 上方。",
  "保存主题后，检查前台模块顺序是否正确。",
  "上传图片并走完整个生成确认流程。",
  "提交测试订单并核对 AI line item properties。",
];

const acceptanceChecklist = [
  "按钮显示 Upload Your Pet Photo 且可见 FREE PREVIEW 标签",
  "组件位于 variant / color selector 上方",
  "弹窗里能看到 Photo tips、your Photo、your Design、Try Again、Use This Design",
  "未点击 Use This Design 前，Choose Color 与 Add to cart 不可提前开放",
  "点击 Use This Design 后才写入 _AI Design Confirmed = yes",
  "测试订单中能看到完整 AI line item properties",
  "页面顺序与参考文档一致，没有被主题原生模块打断",
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
      <PageHeader
        title="标准安装文档"
        description="按升级文档整理成可直接交付客户的安装与验收说明，说明文字中文，安装代码保持英文。"
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <FormCard title="安装目标" description="这次安装必须满足的标准。">
          <div className="space-y-3">
            {requiredStructure.map((item, index) => (
              <div key={item} className="admin-soft-card flex gap-3 px-4 py-4">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </FormCard>

        <FormCard title="交付基线" description="本次安装涉及的关键信息。">
          <div className="space-y-4">
            <Info label="参考 storefront" value="https://getmemorymint.com/products/custom-3d-pet-portrait-keychain-premium-leather-metal" />
            <Info label="当前店铺" value={shopDomain} />
            <Info label="当前使用模型" value={setting.activeModel} />
            <Info label="订单 webhook" value={`${appUrl}/api/shopify/orders`} />
          </div>
        </FormCard>
      </div>

      <FormCard title="标准安装代码" description="只允许复制这段代码，不要调整结构。">
        <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-5 text-sm leading-7 text-slate-100">
          <code>{snippet}</code>
        </pre>
      </FormCard>

      <FormCard title="安装步骤" description="给客户的完整安装与验收流程。">
        <div className="space-y-3">
          {deliverySteps.map((step, index) => (
            <div key={step} className="admin-soft-card px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#2B473F] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-slate-900">{step}</p>
              </div>
            </div>
          ))}
        </div>
      </FormCard>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <FormCard title="验收清单" description="交付前必须逐项核对。">
          <div className="space-y-3">
            {acceptanceChecklist.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
                <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2B473F] text-[11px] font-bold text-white">
                  OK
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </FormCard>

        <FormCard title="订单追踪字段" description="这些字段必须出现在 Shopify 订单里。">
          <div className="space-y-3">
            {trackedProperties.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm leading-7 text-slate-100">
                <code>{item}</code>
              </div>
            ))}
          </div>
        </FormCard>
      </div>

      <StickyActionBar>
        <span className="mr-auto text-sm text-slate-500">安装页不是只复制代码，还包含前台顺序、解锁逻辑和订单追踪字段验收。</span>
      </StickyActionBar>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-2 break-all text-sm leading-7 text-slate-600">{value}</p>
    </div>
  );
}
