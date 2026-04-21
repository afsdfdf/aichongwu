import { PromptEditor } from "@/components/prompt-editor";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const { prompts } = await getStoreContext(getDefaultShopDomain());

  return (
    <>
      <div className="admin-panel p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Prompt Management</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">按产品绑定提示词</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
          Shopify 商品页传进来的 product type 会和这里的 key 匹配。建议统一使用
          <span className="font-medium text-slate-900"> frame / fridge-magnet / keychain </span>
          ，也可以填写你自己的 product.type 值。
        </p>
      </div>

      <div className="grid gap-5">
        {prompts.map((prompt) => (
          <PromptEditor
            key={prompt.id}
            title={prompt.displayName}
            description={`productType = ${prompt.productType}`}
            values={prompt}
          />
        ))}

        <PromptEditor title="新增产品提示词" description="为新的 Shopify 商品类型新增一套提示词规则。" />
      </div>
    </>
  );
}
