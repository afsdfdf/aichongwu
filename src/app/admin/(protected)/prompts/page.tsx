import { PromptEditor } from "@/components/prompt-editor";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const revalidate = 5;

export default async function PromptsPage() {
  const shopDomain = getDefaultShopDomain();
  const { prompts, setting } = await getStoreContext(shopDomain);

  return (
    <div className="space-y-2.5">
      <div className="px-4 pb-1 pt-3">
        <h1 className="text-base font-semibold text-slate-900">按产品绑定提示词</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          当前店铺：<span className="font-medium text-slate-700">{shopDomain}</span>
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          product type 匹配 key，建议使用 frame / fridge-magnet / keychain
        </p>
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
    </div>
  );
}
