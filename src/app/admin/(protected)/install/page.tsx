import { CheckCircle2, Code2, Globe, Link2, ShieldCheck } from "lucide-react";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const revalidate = 5;

function getSnippet(appUrl: string) {
  return `{%- comment -%}
Memory Mint - Custom Upload Module (v3)
使用方法：Shopify 后台 > 产品页模板 > Add section > Custom Liquid > 粘贴此代码
放置位置：变体选择器（颜色）上方
{%- endcomment -%}

<div id="ai-preview-root"
  data-api-base="${appUrl}"
  data-shop-domain="{{ shop.permanent_domain }}"
  data-product-id="{{ product.id }}"
  data-product-title="{{ product.title | escape }}"
  data-product-type="{{ product.type | default: product.handle | escape }}"
  data-variant-id="{{ product.selected_or_first_available_variant.id }}"
></div>

<input type="hidden" id="mm-material-url" name="properties[_Preview Design URL]" value="">

<script src="${appUrl}/widget.js" defer></script>`;
}

function getInstallSteps() {
  return [
    "Shopify 后台进入 Online Store > Themes > Customize。",
    "打开目标商品模板（Product template）。",
    "在产品信息区域点击 Add section。",
    "添加 Custom Liquid。",
    "把下面完整代码原样粘贴进去，不要改 Liquid 变量名。",
    "把模块放在颜色/variant picker 上方。",
    "保存后回到商品页，先走上传和预览，再确认设计后进入选色与下单。",
  ];
}

export default async function InstallPage() {
  const appUrl = "https://aichongwu.vercel.app";
  const { setting } = await getStoreContext(getDefaultShopDomain());
  const snippet = getSnippet(appUrl);
  const steps = getInstallSteps();

  return (
    <>
      <div className="admin-panel p-5 lg:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Shopify Install Guide</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-slate-900 lg:text-3xl">按上传模块文档安装到 Shopify</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          这一页不再是“最小改动接入”说明，而是按你给的上传模块文档来组织安装引导：位置、格式、代码块、域名配置都固定，用户只需要照着复制粘贴即可。
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="admin-panel p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 lg:text-xl">Custom Liquid 完整代码</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                严格按文档的编辑方式放到 Product Template 的 Custom Liquid 中，推荐位置：变体选择器上方。
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500">widget.js</div>
          </div>

          <pre className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-5 text-sm leading-7 text-slate-100">
            <code>{snippet}</code>
          </pre>

          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4" />
              代码使用规则
            </div>
            <ul className="mt-3 space-y-2 leading-7 text-emerald-800">
              <li>• 不要删掉 `id="ai-preview-root"`，这是 widget 挂载点。</li>
              <li>• 不要删掉 `id="mm-material-url"`，这是设计确认后的隐藏字段。</li>
              <li>• `data-api-base` 必须是我们的域名：<span className="font-medium">{appUrl}</span></li>
              <li>• `product.type` 会和后台 Prompt 管理页做绑定，名称不要乱改。</li>
            </ul>
          </div>
        </div>

        <div className="space-y-5">
          <div className="admin-panel p-5 lg:p-6">
            <h2 className="text-lg font-semibold text-slate-900">安装步骤</h2>
            <div className="mt-4 space-y-3">
              {steps.map((step, index) => (
                <article key={step} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{step}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="admin-panel p-5 lg:p-6">
            <h2 className="text-lg font-semibold text-slate-900">关键配置核对</h2>
            <div className="mt-4 space-y-3">
              <ConfigItem icon={Globe} label="应用域名" value={appUrl} />
              <ConfigItem icon={Code2} label="脚本地址" value={`${appUrl}/widget.js`} />
              <ConfigItem icon={Link2} label="订单回调" value={`${appUrl}/api/shopify/orders`} />
              <ConfigItem icon={ShieldCheck} label="当前默认模型" value={setting.activeModel} />
            </div>
          </div>

          <div className="admin-panel p-5 lg:p-6">
            <h2 className="text-lg font-semibold text-slate-900">上线前检查</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-500">
              <li>1. Custom Liquid 是否放在颜色选择器上方。</li>
              <li>2. 上传预览成功后，隐藏字段是否写入设计图 URL。</li>
              <li>3. 点击 Use This Design 后，才允许进入颜色与 Add to cart。</li>
              <li>4. 店铺主题如有特殊 variant DOM，需要再做一轮选择器适配。</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

function ConfigItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-white p-2">
          <Icon className="size-4 text-slate-700" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 break-all text-sm font-medium leading-6 text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
