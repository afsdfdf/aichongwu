import { ModelSettingsForm } from "@/components/model-settings-form";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const revalidate = 5;

export default async function SettingsPage() {
  const { setting, providers } = await getStoreContext(getDefaultShopDomain());

  return (
    <>
      <section className="admin-page-header">
        <p className="admin-page-header-kicker">Model Settings</p>
        <h1 className="admin-page-header-title">模型与存储设置</h1>
        <p className="admin-page-header-description">
          统一管理模型服务商、接口地址、默认生产模型和测试工作区。只整理前台显示结构，底层字段、英文参数与保存逻辑保持不变。
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

