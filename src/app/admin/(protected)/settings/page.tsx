import { ModelSettingsForm } from "@/components/model-settings-form";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const revalidate = 5;

export default async function SettingsPage() {
  const { setting, providers } = await getStoreContext(getDefaultShopDomain());

  return (
    <>
      <div className="admin-panel p-5 lg:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Storage & Model Router</p>
        <h1 className="mt-1.5 text-2xl font-semibold text-slate-900 lg:text-3xl">统一模型配置中心</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          选择服务商 → 填写 API Key → 配置模型。同一服务商下所有模型共享 API Key。
        </p>
      </div>

      <ModelSettingsForm
        activeModel={setting.activeModel}
        requireGeneration={setting.requireGeneration}
        widgetAccentColor={setting.widgetAccentColor}
        widgetButtonText={setting.widgetButtonText}
        providers={providers}
      />
    </>
  );
}
