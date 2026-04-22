import { CheckCircle2, Code2, Globe, Link2, ShieldCheck } from "lucide-react";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const revalidate = 5;

function getSnippet(appUrl: string) {
  return `{%- comment -%}
Memory Mint - Custom Upload Module (v3)
Install path: Shopify Admin > Online Store > Themes > Customize > Product template > Add section > Custom Liquid
Recommended placement: directly above the variant / color picker
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
    "Open Shopify Admin > Online Store > Themes > Customize.",
    "Open the product template where you want the upload experience to appear.",
    "In the product information area, click Add section.",
    "Add a Custom Liquid block.",
    "Paste the full code snippet below exactly as shown.",
    "Place the block directly above the variant / color picker.",
    "Save the template, then test: upload photo → preview design → use design → choose color → add to cart.",
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
        <h1 className="mt-1.5 text-2xl font-semibold text-slate-900 lg:text-3xl">Install the upload widget on your Shopify product page</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          This page is the client-ready install guide. Copy the code exactly as shown, place it above the variant picker, and the upload flow will be ready with our hosted API already connected.
        </p>
      </div>


      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="admin-panel p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 lg:text-xl">Complete Custom Liquid snippet</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Paste this into the Product Template Custom Liquid block. Recommended placement: directly above the variant or color picker.
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
              Important rules
            </div>
            <ul className="mt-3 space-y-2 leading-7 text-emerald-800">
              <li>• Keep `id="ai-preview-root"` exactly as shown. It is the widget mount point.</li>
              <li>• Keep `id="mm-material-url"` exactly as shown. It stores the approved design URL.</li>
              <li>• `data-api-base` must stay on our hosted domain: <span className="font-medium">{appUrl}</span></li>
              <li>• Keep `product.type` unchanged so the correct prompt mapping continues to work.</li>
            </ul>
          </div>

        </div>

        <div className="space-y-5">
          <div className="admin-panel p-5 lg:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Install steps</h2>
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
            <h2 className="text-lg font-semibold text-slate-900">Key integration details</h2>
            <div className="mt-4 space-y-3">
              <ConfigItem icon={Globe} label="App domain" value={appUrl} />
              <ConfigItem icon={Code2} label="Script URL" value={`${appUrl}/widget.js`} />
              <ConfigItem icon={Link2} label="Order callback" value={`${appUrl}/api/shopify/orders`} />
              <ConfigItem icon={ShieldCheck} label="Default model" value={setting.activeModel} />
            </div>
          </div>

          <div className="admin-panel p-5 lg:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Pre-launch checklist</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-500">
              <li>1. Confirm the Custom Liquid block sits above the variant / color picker.</li>
              <li>2. Confirm the approved design URL is written into the hidden field after preview approval.</li>
              <li>3. Confirm shoppers can only continue to color selection after clicking Use This Design.</li>
              <li>4. If the theme uses a custom variant layout, run one final selector compatibility check before launch.</li>
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
