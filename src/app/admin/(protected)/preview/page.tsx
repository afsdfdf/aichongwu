import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const revalidate = 5;

const trustPoints = [
  "Upload a photo, see your pet as a sculpted portrait · FREE",
  "Not happy? Try another photo · no limit, no commitment",
  "Love it? We'll craft it into a High-relief keepsake",
  "Every piece is designer-reviewed before production",
];

const steps = [
  { number: "1", label: "Upload", sub: "Photo" },
  { number: "2", label: "Preview", sub: "Design" },
  { number: "3", label: "Choose", sub: "Color" },
  { number: "4", label: "Place", sub: "Order" },
];

const pluginList = [
  { id: "01", title: "Trust points", note: "Displayed above the upload button" },
  { id: "02", title: "Upload Your Pet Photo button", note: "Includes FREE PREVIEW tag" },
  { id: "03", title: "Social proof", note: "Displayed below the upload button" },
  { id: "04", title: "Mini steps", note: "4-step flow: Upload Photo / Preview Design / Choose Color / Place Order" },
  { id: "05", title: "Next / Back buttons", note: "Move to color selection and back to design" },
  { id: "06", title: "Modal entry", note: "Preview Your Custom Design + Photo tips" },
  { id: "07", title: "Processing / result state", note: "Original photo + generated design + progress + actions" },
  { id: "08", title: "Register gate", note: "Shown after the free generation limit" },
  { id: "09", title: "Unlocked product form", note: "Color selection and Add to cart after approval" },
];

export default async function PreviewPage() {
  const { setting } = await getStoreContext(getDefaultShopDomain());

  return (
    <div className="space-y-4">
      <section className="admin-page-header">
        <p className="admin-page-header-kicker">Function Preview</p>
        <h1 className="admin-page-header-title">店铺模块预览</h1>
        <p className="admin-page-header-description">
          这一页按上传模块文档顺序展示。仅统一后台外层壳的头部与节奏，内部前台展示样式、品牌配色与交互结构保持原样。
        </p>
      </section>

      <div className="admin-panel p-5 lg:p-6">
        <p className="admin-page-header-kicker">Plugin Order</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">模块展示顺序</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">先逐个展示插件，再按最终 storefront 的自上而下顺序展示完整模块，便于客户确认交付内容。</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {pluginList.map((item) => (
            <div key={item.id} className="admin-soft-card px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Plugin {item.id}</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      <PreviewCard title="Plugin 01 - Trust points">
        <TrustPoints />
      </PreviewCard>

      <PreviewCard title="Plugin 02 - Upload Your Pet Photo button">
        <UploadButton accent={setting.widgetAccentColor} />
      </PreviewCard>

      <PreviewCard title="Plugin 03 - Social proof">
        <p className="text-center text-sm text-[#aaa]">Join hundreds of pet parents who tried it</p>
      </PreviewCard>

      <PreviewCard title="Plugin 04 - Mini steps">
        <div className="grid grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center">
              <div className="mx-auto flex size-8 items-center justify-center rounded-full bg-[#2B473F] text-sm font-semibold text-white">
                {step.number}
              </div>
              <p className="mt-2 text-xs font-medium text-[#6B5E54]">
                {step.label}
                <br />
                {step.sub}
              </p>
              {index < steps.length - 1 ? <div className="absolute right-[-12px] top-4 h-px w-6 bg-[#C8956C]" /> : null}
            </div>
          ))}
        </div>
      </PreviewCard>

      <PreviewCard title="Plugin 05 - Next / Back buttons">
        <div className="space-y-3">
          <button className="block w-full rounded-lg bg-[#2B473F] px-4 py-3 text-sm font-bold uppercase tracking-[0.05em] text-white">
            Next: Choose Leather Color
          </button>
          <button className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-[#1A1612]">
            Back to Design
          </button>
        </div>
      </PreviewCard>

      <PreviewCard title="Plugin 06 - Modal entry">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <h3 className="text-center font-serif text-3xl font-semibold text-[#1A1612]">Preview Your Custom Design</h3>
          <div className="mt-5 rounded-2xl bg-[#F9F6F2] p-5">
            <p className="text-sm font-semibold text-[#1A1612]">📸 Photo tips for best results:</p>
            <ul className="mt-3 space-y-2 text-sm text-[#6B5E54]">
              <li>One pet per photo works best</li>
              <li>Clear, front-facing with good lighting</li>
              <li>Pet&apos;s face should be the main focus</li>
            </ul>
          </div>
          <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2B473F] px-4 py-3 text-sm font-bold text-white">
            Generate My Free Preview
          </button>
        </div>
      </PreviewCard>

      <PreviewCard title="Plugin 07 - Processing / result state">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_0.7fr_0.9fr]">
            <div className="text-center">
              <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Your Photo</span>
              <div className="aspect-square rounded-xl bg-[linear-gradient(180deg,#d9ddd1_0%,#b6b9aa_100%)]" />
              <div className="mx-auto mt-4 max-w-xs">
                <p className="text-sm text-[#6B5E54]">Uploading your photo...</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-3/4 rounded-full bg-[#4A6B4A]" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-4">
              <p className="max-w-xs text-center text-sm leading-7 text-[#6B5E54]">
                This is a style preview — your final piece will be a handcrafted raised-relief leather keychain. Your generated preview will appear to the right.
              </p>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2B473F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>

            <div className="text-center">
              <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Your Design</span>
              <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <div className="text-center">
                  <div className="mx-auto size-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#4A6B4A]" />
                  <p className="mt-3 text-sm text-[#6B5E54]">Creating your free preview...</p>
                  <p className="mt-1 text-xs text-[#aaa]">This usually takes 20–30 seconds</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-[#1A1612]">Try Again</button>
            <button className="rounded-lg bg-[#2B473F] px-4 py-3 text-sm font-semibold text-white">Use This Design</button>
          </div>
        </div>
      </PreviewCard>

      <PreviewCard title="Plugin 08 - Register gate">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-base leading-7 text-[#6B5E54]">You have used your free designs. Create an account to get more!</p>
          <a className="mt-5 block rounded-lg bg-[#2B473F] px-4 py-3 text-sm font-bold text-white">Create Free Account</a>
          <a className="mt-4 inline-block text-sm text-[#6B5E54]">Already have an account? Log in</a>
        </div>
      </PreviewCard>

      <PreviewCard title="Plugin 09 - Unlocked product form">
        <div className="rounded-[28px] border border-[#e7d9c5] bg-[#fffdf9] p-6 shadow-[0_18px_48px_rgba(26,22,18,0.08)]">
          <form className="space-y-5">
            <div
              id="ai-preview-root"
              data-api-base="https://aichongwu.vercel.app"
              data-shop-domain="demo-shop.myshopify.com"
              data-product-id="preview-product-001"
              data-product-title="Custom Pet Memorial Keychain"
              data-product-type="keychain"
              data-variant-id="preview-variant-001"
            />

            <div className="rounded-2xl border border-[#eadfce] bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8c7765]">Step 3 - Choose Color</p>
                <p className="text-xs text-[#8c7765]">Next / Back buttons control this transition</p>
              </div>
              <div className="product-detail__variant-picker grid gap-3 sm:grid-cols-3">
                <ColorChoice label="Walnut" color="#8a5c3b" />
                <ColorChoice label="Cream" color="#e8d9c2" />
                <ColorChoice label="Charcoal" color="#55504d" />
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
      </PreviewCard>

      <script src="/widget.js" defer />
    </div>
  );
}

function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="admin-panel p-5 lg:p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TrustPoints() {
  return (
    <div className="space-y-3">
      {trustPoints.map((item) => (
        <div key={item} className="flex items-start gap-3 text-sm leading-6 text-[#6B5E54]">
          <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-[#2B473F] text-white">✓</span>
          <span className="font-semibold text-[#1A1612]">{item}</span>
        </div>
      ))}
    </div>
  );
}

function UploadButton({ accent }: { accent: string }) {
  return (
    <button
      className="flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-white"
      style={{ backgroundColor: accent }}
    >
      Upload Your Pet Photo
      <span className="rounded bg-[#C8956C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">FREE PREVIEW</span>
    </button>
  );
}

function ColorChoice({ label, color }: { label: string; color: string }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-[#e5d8c5] bg-[#f8f2e8] px-4 py-3 text-sm font-medium text-[#4d3b2f]">
      {label}
      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
    </label>
  );
}
