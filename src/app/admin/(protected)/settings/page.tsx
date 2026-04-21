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

      <div className="admin-panel p-5">
        <h2 className="text-lg font-semibold text-slate-900">Feature Recipes</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Use this list as a practical reference for what to add, where to add it, and which code block or endpoint is involved.
        </p>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <RecipeCard
            title="Storefront Upload Module"
            steps={[
              "Paste the Custom Liquid snippet into the product template, ideally above the variant picker.",
              "Keep the theme structure unchanged and only add the root container plus widget.js.",
              "Verify the upload button opens the preview modal and writes line item properties after generation.",
            ]}
            code={`<div id="ai-preview-root" ...></div>\n<script src="https://aichongwu.vercel.app/widget.js" defer></script>`}
          />
          <RecipeCard
            title="Order Writeback"
            steps={[
              "Create a Shopify order webhook.",
              "Point it to the production endpoint below.",
              "Confirm order ID and customer info are written back to generated records.",
            ]}
            code={`POST https://aichongwu.vercel.app/api/shopify/orders`}
          />
          <RecipeCard
            title="Model API Connection"
            steps={[
              "Choose a known endpoint template or paste a custom endpoint.",
              "Select the compatible model or enter the exact model ID.",
              "Save the model, then run API test and image test.",
            ]}
            code={`Endpoint + API Key + Model ID -> Save current model configuration`}
          />
          <RecipeCard
            title="Fallback Routing"
            steps={[
              "Save at least two enabled models.",
              "Set a priority order and assign a primary model.",
              "If the primary model fails, the backend will automatically try the next enabled model.",
            ]}
            code={`Primary model error -> fallback to next enabled model by priority`}
          />
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

function RecipeCard({
  title,
  steps,
  code,
}: {
  title: string;
  steps: string[];
  code: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-500">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
