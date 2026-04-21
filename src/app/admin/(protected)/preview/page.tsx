import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PreviewPage() {
  const { setting } = await getStoreContext(getDefaultShopDomain());

  return (
    <>
      <div className="admin-panel p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Store Module Preview</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Live Shopify Module Preview</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          This page renders the actual embedded upload module in a mock Shopify product section. It is not just a visual
          mock. You can click the button, upload an image, generate a preview, and validate the same widget flow that
          will be used on the storefront.
        </p>
      </div>

      <div className="admin-panel overflow-hidden p-0">
        <div className="grid min-h-[860px] lg:grid-cols-[1.1fr_0.9fr]">
          <section className="border-b border-slate-200 bg-[#faf7f2] px-8 py-8 lg:border-b-0 lg:border-r">
            <div className="mb-4 inline-flex rounded-full border border-[#d8cab7] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[#7f6a57]">
              Mock Shopify Product Area
            </div>
            <h2 className="font-serif text-4xl font-semibold leading-tight text-[#1A1612]">Preview Your Custom Design</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#6B5E54]">
              This section simulates the real storefront placement. The widget below is mounted using the same script and
              root container you will paste into Shopify.
            </p>

            <form action="/cart/add" className="mt-8 space-y-6">
              <div className="rounded-[18px] border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Product Info</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">Custom Pet Memorial Keychain</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Upload a photo, generate a preview, and only order once the customer loves the result.
                </p>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white p-5">
                <p className="mb-4 text-xs uppercase tracking-[0.18em] text-slate-400">Variant Picker Mock</p>
                <div className="product-detail__variant-picker grid gap-3 sm:grid-cols-3">
                  <label className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">Walnut</label>
                  <label className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">Cream</label>
                  <label className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">Charcoal</label>
                </div>
              </div>

              <div
                id="ai-preview-root"
                data-api-base="http://localhost:3001"
                data-shop-domain="demo-shop.myshopify.com"
                data-product-id="preview-product-001"
                data-product-title="Custom Pet Memorial Keychain"
                data-product-type="keychain"
                data-variant-id="preview-variant-001"
              />

              <div className="product-form__buttons rounded-[18px] border border-slate-200 bg-white p-5">
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                >
                  Add to cart
                </button>
              </div>
            </form>
          </section>

          <section className="bg-white px-8 py-8">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Current Widget Configuration</h3>
              <div className="mt-4 grid gap-3">
                <PreviewInfo label="Default model" value={setting.activeModel} />
                <PreviewInfo label="Button text" value={setting.widgetButtonText} />
                <PreviewInfo label="Button color" value={setting.widgetAccentColor} />
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Validation Checklist</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
                <li>1. Click the upload button and make sure the modal opens.</li>
                <li>2. Upload an image and confirm the preview request reaches the current backend.</li>
                <li>3. After generation, confirm hidden line item properties are attached to the form.</li>
                <li>4. Ensure the add-to-cart button unlocks only after a successful generation if required.</li>
              </ul>
            </div>

            <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Integration Goal</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                The final storefront integration should keep the theme layout intact and only inject this module using a
                root container plus the widget script.
              </p>
            </div>
          </section>
        </div>
      </div>

      <script src="/widget.js" defer />
    </>
  );
}

function PreviewInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
