import { CheckCircle2, Copy, ShieldCheck, Webhook } from "lucide-react";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getSnippet(appUrl: string) {
  return `{%- comment -%}
Memory Mint Compatible Widget
接入原则：
1. 放到 product template / Custom Liquid 中
2. 建议放在变体选择器上方
3. 不重写主题结构，只追加 root 容器和脚本
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

const tasks = [
  {
    icon: Copy,
    title: "粘贴到 Custom Liquid",
    description: "放在商品页现有结构中，尽量不改 Shopify 原有布局。",
  },
  {
    icon: Webhook,
    title: "配置订单 webhook",
    description: "订单创建后自动回写效果图链接、Generation ID 与客户信息。",
  },
  {
    icon: ShieldCheck,
    title: "配置环境变量",
    description: "确保管理员账号、S3、模型端点与 API Key 已在 Vercel 中正确配置。",
  },
];

export default async function InstallPage() {
  const appUrl = "https://aichongwu.vercel.app";
  const { setting } = await getStoreContext(getDefaultShopDomain());
  const snippet = getSnippet(appUrl);

  return (
    <>
      <div className="admin-panel p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Install & Launch</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Shopify 最小改动接入</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          我已经按你给的上传模块文档整理成“最小改动接入”方案：尽量不动主题结构，只增加一个容器和脚本，
          并把上传、预览、回写逻辑接到 <span className="font-medium text-slate-900">https://aichongwu.vercel.app</span>。
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="admin-panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Custom Liquid 代码片段</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                直接放到 Shopify 商品页模板里，推荐位置：变体选择器上方。
              </p>
            </div>
            <div className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-500">widget.js</div>
          </div>

          <pre className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-sm leading-7 text-slate-100">
            <code>{snippet}</code>
          </pre>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="size-4" />
              店铺代码规则说明
            </div>
            <ul className="mt-3 space-y-2 leading-7 text-slate-500">
              <li>• 不强制你重做商品页结构</li>
              <li>• 只需要在现有主题里插入 root 容器和脚本</li>
              <li>• 商品类型继续通过 product.type 与后台 Prompt 绑定</li>
              <li>• 后续可再按你上传模块文档进一步做 1:1 样式兼容版</li>
            </ul>
          </div>
        </div>

        <div className="space-y-5">
          <div className="admin-panel p-6">
            <h2 className="text-xl font-semibold text-slate-900">上线待办</h2>
            <div className="mt-5 space-y-4">
              {tasks.map((task) => {
                const Icon = task.icon;
                return (
                  <article key={task.title} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-3">
                        <Icon className="size-4 text-slate-700" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-slate-900">{task.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{task.description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="admin-panel p-6">
            <h2 className="text-xl font-semibold text-slate-900">当前 Widget 配置</h2>
            <div className="mt-5 grid gap-3">
              <ConfigRow label="默认模型" value={setting.activeModel} />
              <ConfigRow label="按钮文案" value={setting.widgetButtonText} />
              <ConfigRow label="按钮颜色" value={setting.widgetAccentColor} />
              <ConfigRow label="订单 webhook" value={`${appUrl}/api/shopify/orders`} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm leading-7 text-slate-900">{value}</p>
    </div>
  );
}
