import Link from "next/link";
import { FormCard } from "@/components/admin/FormCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StickyActionBar } from "@/components/admin/StickyActionBar";
import { PromptEditor } from "@/components/prompt-editor";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const shopDomain = getDefaultShopDomain();
  const { prompts, setting } = await getStoreContext(shopDomain);
  const activePrompts = prompts.filter((prompt) => prompt.isActive).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="按商品绑定提示词"
        description={`当前店铺 ${shopDomain} 使用英文 product type 作为匹配键，前台文案保持中文，底层继续兼容 Redis + S3。`}
        actions={
          <>
            <Link
              href="/admin/settings"
              className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              模型设置
            </Link>
            <Link
              href="/admin/preview"
              className="inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              前台预览
            </Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <FormCard title="配置原则" description="统一遵循升级文档中的 Prompt 管理约束。">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            <li>商品类型 key 继续使用英文，避免影响现有匹配逻辑。</li>
            <li>提示词编辑与测试都在后台完成，前台只读取最终生效内容。</li>
            <li>当前项目保留单版本保存逻辑，但页面结构已按模板化方向升级。</li>
          </ul>
        </FormCard>

        <FormCard title="当前状态" description="用于快速确认提示词库与模型联动情况。">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Active Model</p>
              <p className="mt-1 break-all text-sm font-medium text-slate-900">{setting.activeModel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Prompt Count</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{prompts.length}</p>
              <p className="text-sm text-slate-500">{activePrompts} 个处于启用状态。</p>
            </div>
          </div>
        </FormCard>
      </div>

      {prompts.map((prompt) => (
        <PromptEditor
          key={prompt.id}
          title={prompt.displayName}
          description={`productType = ${prompt.productType}`}
          values={prompt}
          activeModel={setting.activeModel}
        />
      ))}

      <PromptEditor title="新增产品提示词" description="为新的 Shopify 商品类型新增一套提示词规则。" />

      <StickyActionBar>
        <span className="mr-auto text-sm text-slate-500">每个提示词卡片内都可直接保存、删除和测试生成结果。</span>
        <Link
          href="/admin/settings"
          className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          返回模型设置
        </Link>
      </StickyActionBar>
    </div>
  );
}
