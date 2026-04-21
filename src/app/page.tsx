import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Database,
  ImagePlus,
  Layers3,
  Settings2,
  ShoppingBag,
  WandSparkles,
} from "lucide-react";

const features = [
  {
    icon: ImagePlus,
    title: "顾客上传即生成",
    description: "在 Shopify 商品页上传照片，一键生成相框、冰箱贴、钥匙扣等产品效果图。",
  },
  {
    icon: WandSparkles,
    title: "按商品自动匹配提示词",
    description: "系统根据当前商品类型自动调用对应 prompt，无需顾客手动选择复杂参数。",
  },
  {
    icon: Settings2,
    title: "后台切模型、改 prompt",
    description: "独立控制台里管理提示词、默认模型、按钮文案和前端小组件行为。",
  },
  {
    icon: Database,
    title: "S3 与数据库永久留存",
    description: "原图、效果图、模型、提示词、订单号全部留档，方便复盘与售后。",
  },
];

const flows = [
  "顾客在商品页上传照片并点击【生成效果图】",
  "系统按当前商品类型自动匹配提示词",
  "AI 输出效果图并即时展示给顾客",
  "下单时把 preview URL、generation ID、模型、提示词写进订单属性",
  "Shopify webhook 把订单号、客户邮箱回写到你的独立后台",
];

const metrics = [
  { label: "前台体验", value: "上传 → 预览 → 下单" },
  { label: "后台能力", value: "提示词 / 模型 / 记录 / 安装" },
  { label: "存储链路", value: "S3 + Postgres + Shopify" },
];

export default function HomePage() {
  return (
    <main className="pb-20">
      <section className="container-shell flex min-h-screen flex-col justify-center gap-10 py-16">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-sky-200">
          Shopify × Vercel × S3 × AI Preview
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.32em] text-sky-300/70">Shopify 可快速接入</p>
              <h1 className="max-w-4xl text-5xl font-semibold leading-tight text-white md:text-7xl">
                给你的 Shopify 店铺，
                <span className="text-sky-300"> 加一套 AI 商品效果图系统</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                顾客上传照片后自动生成商品预览图，商家后台统一管理提示词、模型、生成记录与订单映射。
                整套方案走原生 Vercel 轻后端，可接 S3，也方便后续扩展。
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-6 py-3 font-medium text-slate-950 transition hover:bg-sky-300"
              >
                打开商家后台 <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/admin/install"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-medium text-white/90 transition hover:bg-white/5"
              >
                查看 Shopify 安装代码
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {metrics.map((item) => (
                <div key={item.label} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-3 text-lg font-medium text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass relative overflow-hidden rounded-[36px] p-6 shadow-2xl shadow-sky-950/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_36%)]" />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">顾客侧实时流程</span>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-300">
                  可嵌入商品页
                </span>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-medium text-white">金属钥匙扣</p>
                    <p className="text-sm text-slate-400">上传宠物照片后，直接生成商品效果图预览</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 px-3 py-1 text-xs text-sky-200">
                    model: gpt-image-1
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4">
                    <p className="text-sm text-slate-300">上传原图</p>
                    <div className="mt-4 rounded-[24px] bg-slate-900/80 p-8 text-center text-sm text-slate-500">
                      JPG / PNG
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-slate-300">生成效果图</p>
                    <div className="mt-4 aspect-square rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.25),transparent_42%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] p-4">
                      <div className="h-full rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_100%)]" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                  <span>下单时自动写入订单属性：preview_url / generation_id / model / prompt</span>
                  <Layers3 className="size-4 text-sky-300" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <PreviewStat label="累计生成" value="1,284" />
                <PreviewStat label="订单转化" value="38.6%" />
                <PreviewStat label="S3 留档" value="100%" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-6 py-10 md:grid-cols-2 xl:grid-cols-4">
        {features.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="glass rounded-[28px] p-6">
              <Icon className="mb-5 size-9 text-sky-300" />
              <h2 className="text-xl font-semibold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="container-shell grid gap-8 py-12 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300/70">完整流程</p>
          <h2 className="text-3xl font-semibold text-white md:text-5xl">三端联动：顾客页、独立后台、Shopify 订单</h2>
          <p className="max-w-xl text-base leading-8 text-slate-300">
            顾客端负责上传与预览，Shopify 负责下单与订单展示，独立后台负责提示词、模型、生成记录和业务统计。
          </p>
        </div>

        <div className="glass rounded-[32px] p-6">
          <ol className="space-y-4">
            {flows.map((step, index) => (
              <li key={step} className="flex gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sm font-semibold text-sky-200">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-slate-200">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-shell grid gap-6 py-6 lg:grid-cols-[1fr_1fr]">
        <article className="glass rounded-[32px] p-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="size-5 text-sky-300" />
            <h2 className="text-2xl font-semibold text-white">后台新增统计仪表盘</h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            现在后台不仅能看记录，还能看 7 天趋势、下单转化、模型分布、产品分布和最近订单映射。
          </p>
        </article>
        <article className="glass rounded-[32px] p-6">
          <div className="flex items-center gap-3">
            <ShoppingBag className="size-5 text-sky-300" />
            <h2 className="text-2xl font-semibold text-white">订单端信息完整回写</h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            每个订单都可带上 AI 效果图链接、使用模型、提示词和 generation ID，售后与复查更高效。
          </p>
        </article>
      </section>
    </main>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
