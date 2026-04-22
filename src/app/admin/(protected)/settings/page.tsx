import { ModelSettingsForm } from "@/components/model-settings-form";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const revalidate = 5;

export default async function SettingsPage() {
  const { setting, providers } = await getStoreContext(getDefaultShopDomain());

  return (
    <>
      <div className="admin-panel p-6 lg:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Storage & Model Router</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 lg:text-4xl">Unified model control center</h1>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-500 lg:text-lg">
          Connect a provider, save credentials, detect supported models, and choose the default production model from one readable workspace. This page is intentionally larger so the full provider configuration is easy to review.
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

