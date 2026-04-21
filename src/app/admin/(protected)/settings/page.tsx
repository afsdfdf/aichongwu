/* eslint-disable @next/next/no-img-element */
import { AssetImportForm } from "@/components/asset-import-form";
import { ModelSettingsForm } from "@/components/model-settings-form";
import { MODEL_OPTIONS } from "@/lib/catalog";
import { getS3Summary, getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { setting, providers, importedAssets } = await getStoreContext(getDefaultShopDomain());
  const s3 = getS3Summary();

  return (
    <>
      <div className="admin-panel p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Storage & Model Router</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">S3 存储与模型路由</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          当前方案使用 S3 存储图片、配置与生成记录。这里可以独立管理模型选择、API Key、Webhook 与历史资源导入。
        </p>
      </div>

      <ModelSettingsForm
        activeModel={setting.activeModel}
        requireGeneration={setting.requireGeneration}
        widgetAccentColor={setting.widgetAccentColor}
        widgetButtonText={setting.widgetButtonText}
        providers={providers}
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AssetImportForm />

        <div className="admin-panel p-6">
          <h2 className="text-xl font-semibold text-slate-900">当前 S3 配置</h2>
          <div className="mt-4 grid gap-3">
            <InfoRow label="Bucket" value={s3.bucket} />
            <InfoRow label="Public Base URL" value={s3.publicBaseUrl} />
            <InfoRow label="State JSON" value={s3.stateKey} />
            <InfoRow label="已导入资源数" value={`${importedAssets.length}`} />
          </div>
        </div>
      </div>

      <div className="admin-panel p-6">
        <h2 className="text-2xl font-semibold text-slate-900">最近导入的 S3 资源</h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          这部分是从你现有 AWS bucket 导入的资源索引，方便后续在网站上复用已有图片与历史内容。
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {importedAssets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              还没有导入对象，先点击上方“从 S3 导入”。
            </div>
          ) : (
            importedAssets.slice(0, 12).map((asset) => (
              <a
                key={asset.key}
                href={asset.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white">
                  {/\.(png|jpg|jpeg|webp|gif)$/i.test(asset.key) ? (
                    <img src={asset.url} alt={asset.key} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">{asset.key}</div>
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-700">{asset.key}</p>
                <p className="mt-1 text-xs text-slate-500">{Math.round(asset.size / 1024)} KB</p>
              </a>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {MODEL_OPTIONS.map((model) => (
          <article key={model.key} className="admin-panel p-5">
            <h2 className="text-lg font-semibold text-slate-900">{model.label}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">{model.description}</p>
            <p className="mt-3 text-xs text-slate-400">model key: {model.key}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm leading-7 text-slate-800">{value}</p>
    </div>
  );
}
