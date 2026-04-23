import Link from "next/link";
import { FormCard } from "@/components/admin/FormCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StickyActionBar } from "@/components/admin/StickyActionBar";
import { ModelSettingsForm } from "@/components/model-settings-form";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const shopDomain = getDefaultShopDomain();
  const { setting, providers } = await getStoreContext(shopDomain);
  const configuredProviders = providers.filter((provider) => provider.hasApiKey).length;
  const enabledModels = providers.flatMap((provider) => provider.models).filter((model) => model.isEnabled).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="模型与存储设置"
        description={`集中管理 ${shopDomain} 的模型连接、接口地址、默认生图模型与测试工作区。当前仍采用 Redis + S3 存储。`}
        actions={
          <>
            <Link
              href="/admin/blueprint"
              className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              查看蓝图
            </Link>
            <Link
              href="/admin/install"
              className="inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              安装指引
            </Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <FormCard title="当前生效模型" description="店铺生成流量会优先使用这里的模型配置。">
          <p className="break-all text-lg font-semibold text-slate-900">{setting.activeModel}</p>
          <p className="text-sm leading-6 text-slate-500">切换默认模型后，测试工作区与生成接口会同步使用新配置。</p>
        </FormCard>

        <FormCard title="已配置服务商" description="统计已保存密钥的服务商数量。">
          <p className="text-3xl font-semibold text-slate-900">{configuredProviders}</p>
          <p className="text-sm leading-6 text-slate-500">{providers.length} 个可选服务商中，已有 {configuredProviders} 个完成配置。</p>
        </FormCard>

        <FormCard title="启用模型数" description="启用状态的模型会参与后台测试与生成。">
          <p className="text-3xl font-semibold text-slate-900">{enabledModels}</p>
          <p className="text-sm leading-6 text-slate-500">建议只保留真实可用模型，避免测试面板出现无效选项。</p>
        </FormCard>
      </div>

      <ModelSettingsForm
        activeModel={setting.activeModel}
        requireGeneration={setting.requireGeneration}
        widgetAccentColor={setting.widgetAccentColor}
        widgetButtonText={setting.widgetButtonText}
        providers={providers}
      />

      <StickyActionBar>
        <span className="mr-auto text-sm text-slate-500">保存入口已内嵌在各配置卡片中，修改后可直接在当前页完成测试与保存。</span>
        <Link
          href="/admin/prompts"
          className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          去提示词页
        </Link>
      </StickyActionBar>
    </div>
  );
}
