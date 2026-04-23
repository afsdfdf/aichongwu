import { FormCard } from "@/components/admin/FormCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StickyActionBar } from "@/components/admin/StickyActionBar";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

const trustPoints = [
  "Upload a photo, see your pet as a sculpted portrait - FREE",
  "Not happy? Try another photo - no limit, no commitment",
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
  "Trust points",
  "Upload Your Pet Photo button",
  "Social proof",
  "Mini steps",
  "Next / Back buttons",
  "Modal entry",
  "Processing / result state",
  "Register gate",
  "Unlocked product form",
];

export default async function PreviewPage() {
  const { setting } = await getStoreContext(getDefaultShopDomain());

  return (
    <div className="space-y-4">
      <PageHeader
        title="店铺模块预览"
        description="按升级文档要求展示 storefront 模块顺序。后台外层骨架统一，内部前台展示风格保持原样。"
      />

      <FormCard title="Plugin Order" description="先逐个展示插件，再按 storefront 从上到下展示完整模块。">
        <div className="grid gap-3 lg:grid-cols-2">
          {pluginList.map((item, index) => (
            <div key={item} className="admin-soft-card px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Plugin {String(index + 1).padStart(2, "0")}</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{item}</p>
            </div>
          ))}
        </div>
      </FormCard>

      <PreviewCard title="Plugin 01 - Trust points">
        <div className="space-y-3">
          {trustPoints.map((item) => (
            <div key={item} className="flex items-start gap-3 text-sm leading-6 text-[#6B5E54]">
              <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-[#2B473F] text-white">OK</span>
              <span className="font-semibold text-[#1A1612]">{item}</span>
            </div>
          ))}
        </div>
      </PreviewCard>

      <PreviewCard title="Plugin 02 - Upload button">
        <button
          className="flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-white"
          style={{ backgroundColor: setting.widgetAccentColor }}
        >
          Upload Your Pet Photo
          <span className="rounded bg-[#C8956C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">FREE PREVIEW</span>
        </button>
      </PreviewCard>

      <PreviewCard title="Plugin 04 - Mini steps">
        <div className="grid grid-cols-4 gap-4">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="mx-auto flex size-8 items-center justify-center rounded-full bg-[#2B473F] text-sm font-semibold text-white">
                {step.number}
              </div>
              <p className="mt-2 text-xs font-medium text-[#6B5E54]">
                {step.label}
                <br />
                {step.sub}
              </p>
            </div>
          ))}
        </div>
      </PreviewCard>

      <PreviewCard title="Plugin 09 - Unlocked product form">
        <div className="rounded-[28px] border border-[#e7d9c5] bg-[#fffdf9] p-6 shadow-[0_18px_48px_rgba(26,22,18,0.08)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#eadfce] bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#8c7765]">Step 3 - Choose Color</p>
                <p className="text-xs text-[#8c7765]">Unlocked after Design Selected + Use This Design</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ColorChoice label="Walnut" color="#8a5c3b" />
                <ColorChoice label="Cream" color="#e8d9c2" />
                <ColorChoice label="Charcoal" color="#55504d" />
              </div>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-white p-5">
              <button
                type="button"
                className="w-full rounded-xl border border-[#2B473F] bg-[#2B473F] px-4 py-3 text-sm font-semibold text-white"
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      </PreviewCard>

      <StickyActionBar>
        <span className="mr-auto text-sm text-slate-500">预览页主要用于对照升级文档验证前台结构顺序和关键交互节点。</span>
      </StickyActionBar>
    </div>
  );
}

function PreviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <FormCard title={title} description="按 storefront 插件顺序展示。">
      {children}
    </FormCard>
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
