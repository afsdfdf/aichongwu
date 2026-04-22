import { PromptEditor } from "@/components/prompt-editor";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const shopDomain = getDefaultShopDomain();
  const { prompts, setting } = await getStoreContext(shopDomain);

  return (
    <div className="space-y-4">
      <section className="admin-page-header">
        <p className="admin-page-header-kicker">Prompt Library</p>
        <h1 className="admin-page-header-title">按产品绑定提示词</h1>
        <p className="admin-page-header-description">
          当前店铺 <span className="font-semibold text-slate-900">{shopDomain}</span>。前端显示中文说明，后端仍按英文 product type 作为匹配 key，建议使用 frame / fridge-magnet / keychain。
        </p>
      </section>

      <section className="admin-panel p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="admin-soft-card px-4 py-3.5">
            <p className="text-sm font-semibold text-slate-900">配置原则</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              每个商品类型使用独立提示词模板，前端显示中文描述，但数据库 key、productType 和模型调用字段继续保持英文，避免影响现有匹配逻辑。
            </p>
          </div>
          <div className="admin-soft-card px-4 py-3.5">
            <p className="text-sm font-semibold text-slate-900">当前生产模型</p>
            <p className="mt-2 break-all text-sm font-medium text-slate-900">{setting.activeModel}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">保存后会沿用当前模型进行测试生成。</p>
          </div>
        </div>
      </section>

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
    </div>
  );
}
