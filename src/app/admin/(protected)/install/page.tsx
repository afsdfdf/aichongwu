import { CheckCircle2, Copy, ExternalLink, ShieldCheck, Webhook } from "lucide-react";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getSnippet(appUrl: string) {
  return `{%- comment -%}
AI Preview Widget Snippet
1. 放到 product template / section 中
2. 确保 product.type 对应后台 productType key
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
    title: "粘贴商品页 snippet",
    description: "将脚本和容器复制到 Shopify 商品模板或 product section。",
  },
  {
    icon: Webhook,
    title: "配置订单 webhook",
    description: "订单创建后通知你的 Vercel 后端，自动把订单号回写到生成记录。",
  },
  {
    icon: ShieldCheck,
    title: "填写 Vercel 环境变量",
    description: "数据库、S3、管理员账号、OpenAI 或自定义模型网关都需要配置。",
  },
];

export default async function InstallPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-vercel-app.vercel.app";
  const { setting } = await getStoreContext(getDefaultShopDomain());
  const snippet = getSnippet(appUrl);

  return (
    <>
      <div className="glass rounded-[36px] p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300/70">Install & Launch</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Shopify 安装与上线步骤</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          这页就是你的交付说明台。复制 snippet、绑定 webhook、填环境变量后，就能在 Shopify 商品页正式启用 AI 效果图流程。
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-[32px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">可直接复制的 Shopify snippet</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                将下面代码贴入你的商品模板。上线后，顾客即可在商品页上传照片并触发 AI 生成。
              </p>
            </div>
            <div className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300">
              widget.js
            </div>
          </div>

          <pre className="mt-5 overflow-x-auto rounded-[28px] border border-white/8 bg-slate-950/80 p-5 text-sm leading-7 text-slate-200">
            <code>{snippet}</code>
          </pre>

          <div className="mt-5 rounded-[28px] border border-white/8 bg-white/[0.02] p-5 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="size-4" />
              使用说明
            </div>
            <ul className="mt-3 space-y-2 leading-7 text-slate-400">
              <li>• `product.type` 要与后台提示词的 `productType` 对应</li>
              <li>• 如果你的主题有 AJAX 加购，也同样可使用隐藏属性写入订单</li>
              <li>• 小组件按钮颜色与文案会读取后台设置</li>
            </ul>
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass rounded-[32px] p-6">
            <h2 className="text-2xl font-semibold text-white">上线待办</h2>
            <div className="mt-5 space-y-4">
              {tasks.map((task) => {
                const Icon = task.icon;
                return (
                  <article key={task.title} className="rounded-[24px] border border-white/8 bg-white/[0.02] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-sky-400/10 p-3">
                        <Icon className="size-4 text-sky-300" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-white">{task.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-400">{task.description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-[32px] p-6">
            <h2 className="text-2xl font-semibold text-white">当前 Widget 配置</h2>
            <div className="mt-5 grid gap-3">
              <ConfigRow label="默认模型" value={setting.activeModel} />
              <ConfigRow label="按钮文案" value={setting.widgetButtonText} />
              <ConfigRow label="按钮颜色" value={setting.widgetAccentColor} />
              <ConfigRow label="订单 webhook" value={`${appUrl}/api/shopify/orders`} />
            </div>

            <a
              href={`${appUrl}/widget.js`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm text-sky-300"
            >
              打开 widget.js <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.02] p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm leading-7 text-slate-200">{value}</p>
    </div>
  );
}
