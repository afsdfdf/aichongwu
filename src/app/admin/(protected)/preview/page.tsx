import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const revalidate = 5;

export default async function PreviewPage() {
  await getStoreContext(getDefaultShopDomain());

  return (

    <>
      <div className="admin-panel p-5 lg:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Function Preview</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-slate-900 lg:text-3xl">High-fidelity upload module preview</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          This preview recreates the real Shopify product page flow from the upload module document: upload entry, four-step flow, modal, original image vs generated design, and the gated move into color selection only after design approval.
        </p>
      </div>


      <div className="admin-panel overflow-hidden p-0">
        <div className="grid min-h-[860px] xl:grid-cols-[1.2fr_0.8fr]">
          <section className="border-b border-slate-200 bg-[#faf7f2] px-6 py-6 xl:border-b-0 xl:border-r">
            <div className="mb-4 inline-flex rounded-lg border border-[#d8cab7] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#7f6a57]">
              Shopify Product Template Mock
            </div>

            <div className="rounded-[28px] border border-[#e7d9c5] bg-[#fffdf9] p-6 shadow-[0_18px_48px_rgba(26,22,18,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eadfce] pb-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#8c7765]">Memory Mint Product Page</p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-[#1A1612] lg:text-4xl">
                    Custom Pet Memorial Keychain
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-[#6B5E54]">
                    Upload a photo, preview your design for free, then choose color and place the order only after you are happy with the result.
                  </p>
                </div>
                <div className="rounded-xl border border-[#e8dccb] bg-white px-4 py-3 text-right shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8c7765]">Integration</p>
                  <p className="mt-1 text-sm font-medium text-[#1A1612]">Our API only</p>
                  <p className="mt-1 text-xs text-[#8c7765]">UI / copy / flow follow the upload module document</p>
                </div>

              </div>

              <form action="/cart/add" className="mt-6 space-y-5">
                <div
                  id="ai-preview-root"
                  data-api-base="https://aichongwu.vercel.app"

                  data-shop-domain="demo-shop.myshopify.com"
                  data-product-id="preview-product-001"
                  data-product-title="Custom Pet Memorial Keychain"
                  data-product-type="keychain"
                  data-variant-id="preview-variant-001"
                />

                <input type="hidden" id="mm-material-url" name="properties[_Preview Design URL]" defaultValue="" />

                <div className="rounded-2xl border border-[#eadfce] bg-white p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8c7765]">Step 2 · Choose Color</p>
                    <p className="text-xs text-[#8c7765]">Design approval is required before color selection becomes available.</p>

                  </div>

                  <div className="product-detail__variant-picker grid gap-3 sm:grid-cols-3">
                    <label className="flex items-center justify-between rounded-xl border border-[#e5d8c5] bg-[#f8f2e8] px-4 py-3 text-sm font-medium text-[#4d3b2f]">
                      Walnut
                      <span className="h-4 w-4 rounded-full bg-[#8a5c3b]" />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-[#e5d8c5] bg-[#f8f2e8] px-4 py-3 text-sm font-medium text-[#4d3b2f]">
                      Cream
                      <span className="h-4 w-4 rounded-full bg-[#e8d9c2]" />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-[#e5d8c5] bg-[#f8f2e8] px-4 py-3 text-sm font-medium text-[#4d3b2f]">
                      Charcoal
                      <span className="h-4 w-4 rounded-full bg-[#55504d]" />
                    </label>
                  </div>
                </div>

                <div className="product-form__buttons rounded-2xl border border-[#eadfce] bg-white p-5">
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-[#2B473F] bg-[#2B473F] px-4 py-3 text-sm font-semibold text-white"
                  >
                    Add to cart
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="bg-white px-6 py-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Preview goals</h3>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                <li>1. Show the upload button, trust points, social proof, and four-step flow in the same structure as the source module.</li>
                <li>2. Keep the modal flow: upload guidance, processing state, result state, and design approval action.</li>
                <li>3. Write the approved design URL into hidden fields before shoppers continue to color selection.</li>
                <li>4. Preserve the real Shopify product page context instead of showing a detached demo card.</li>
              </ul>
            </div>



            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Current integration</h3>
              <div className="mt-4 grid gap-3">
                <PreviewInfo label="Preview page API base" value="https://aichongwu.vercel.app" />
                <PreviewInfo label="Widget button text" value="Upload Your Pet Photo" />
                <PreviewInfo label="Widget accent color" value="#2B473F" />
                <PreviewInfo label="Flow rule" value="Use our API only, keep the original UI and steps" />
              </div>
            </div>



            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="text-lg font-semibold text-emerald-900">Delivery checkpoints</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-800">
                <li>• Keep the upload entry, trust points, social proof, and four-step flow aligned with the document layout.</li>
                <li>• Keep the modal journey as upload guidance → processing / result → Try Again / Use This Design.</li>
                <li>• Only reveal the next step after shoppers confirm the design.</li>
                <li>• Replace only the backend integration, while keeping the hosted domain on `https://aichongwu.vercel.app`.</li>
              </ul>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className="mt-1.5 break-all text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
