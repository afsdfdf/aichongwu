import { AssetImportForm } from "@/components/asset-import-form";
import { ModelSettingsForm } from "@/components/model-settings-form";
import { getS3Summary, getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { setting, providers, importedAssets } = await getStoreContext(getDefaultShopDomain());
  const s3 = getS3Summary();

  return (
    <>
      <div className="admin-panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Storage & Model Router</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">统一模型配置中心</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          集中管理 API 端点、模型 Key、店铺按钮样式与生图测试。按模型逐个配置，避免信息堆叠。
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

        <div className="admin-panel p-5">
          <h2 className="text-lg font-semibold text-slate-900">当前 S3 配置</h2>
          <div className="mt-4 grid gap-3">
            <InfoRow label="Bucket" value={s3.bucket} />
            <InfoRow label="Public Base URL" value={s3.publicBaseUrl} />
            <InfoRow label="State JSON" value={s3.stateKey} />
            <InfoRow label="已导入资源数" value={`${importedAssets.length}`} />
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm leading-7 text-slate-800">{value}</p>
    </div>
  );
}
