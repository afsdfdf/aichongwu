import { ModelSettingsForm } from "@/components/model-settings-form";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { setting, providers } = await getStoreContext(getDefaultShopDomain());

  return (
    <>
      <section className="admin-page-header">
        <p className="admin-page-header-kicker">Settings Center</p>
        <h1 className="admin-page-header-title">模型与存储设置</h1>
        <p className="admin-page-header-description">
          集中管理模型服务商、接口地址、默认生产模型和测试区。界面显示中文，底层字段、接口参数与保存逻辑继续保持英文。
        </p>
      </section>

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

