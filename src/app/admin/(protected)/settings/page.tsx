import Link from "next/link";
import { FormCard } from "@/components/admin/FormCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StickyActionBar } from "@/components/admin/StickyActionBar";
import { ModelSettingsForm } from "@/components/model-settings-form";
import { getAdminBootstrap } from "@/lib/config-center/service";
import { getStoreContext } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const shopDomain = getDefaultShopDomain();
  const [{ setting }, bootstrap] = await Promise.all([
    getStoreContext(shopDomain),
    getAdminBootstrap(),
  ]);

  const activeRoute =
    bootstrap.routes.find((route) => route.id === "generate:*") ||
    bootstrap.routes.find((route) => route.id === bootstrap.settings.defaultRouteId) ||
    null;
  const activeConnection = activeRoute
    ? bootstrap.connections.find((connection) => connection.id === activeRoute.primaryConnectionId)
    : null;
  const activeProvider = activeConnection?.legacyProviderId === "google" ? "google" : "custom";
  const activeModel = activeConnection?.modelCode || setting.activeModel;
  const activeModelName = activeConnection?.modelDisplayName || setting.modelName || activeModel;
  const activeBaseUrl = activeConnection?.baseUrl || setting.modelBaseUrl;
  const activeEndpoint = activeConnection?.endpointPath || activeConnection?.submitUrl || setting.modelEndpoint;
  const activeEndpointDisplay = activeProvider === "google"
    ? activeBaseUrl || "-"
    : activeEndpoint || activeBaseUrl || "-";
  const hasActiveApiKey = Boolean(activeConnection?.metadata?.hasLegacySecret || setting.modelApiKeyEncrypted);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Model Settings"
        description={`Keep one Google route and one GPT / Compatible route for ${shopDomain}. Save updates the active configuration.`}
        actions={
          <Link
            href="/admin/install"
            className="inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Install Guide
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <FormCard title="Current Route" description="Only the active route is used at runtime.">
          <p className="break-all text-lg font-semibold text-slate-900">
            {activeProvider === "google" ? "Google SDK" : "GPT / Compatible"}
          </p>
          <p className="text-sm leading-6 text-slate-500">
            {hasActiveApiKey ? "API key is saved." : "No API key saved yet."}
          </p>
        </FormCard>

        <FormCard title="Current Model" description="Runtime always uses this single model configuration.">
          <p className="text-3xl font-semibold text-slate-900">{activeModel}</p>
          <p className="text-sm leading-6 text-slate-500">{activeModelName}</p>
        </FormCard>

        <FormCard
          title="Current Endpoint"
          description="Google uses the official SDK. GPT / Compatible uses raw HTTP with your saved endpoint."
        >
          <p className="break-all text-sm font-medium text-slate-900">{activeEndpointDisplay}</p>
          <p className="text-sm leading-6 text-slate-500">Saving a route updates the active configuration.</p>
        </FormCard>
      </div>

      <ModelSettingsForm
        activeModel={activeModel}
        modelProvider={activeProvider}
        modelName={activeModelName}
        modelBaseUrl={activeBaseUrl}
        modelEndpoint={activeEndpoint}
        hasApiKey={hasActiveApiKey}
        widgetAccentColor={setting.widgetAccentColor}
        widgetButtonText={setting.widgetButtonText}
      />

      <StickyActionBar>
        <span className="mr-auto text-sm text-slate-500">
          Keep the UI simple. Use Google for the official SDK route, or GPT / Compatible for raw HTTP compatible gateways.
        </span>
        <Link
          href="/admin/prompts"
          className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Prompts
        </Link>
      </StickyActionBar>
    </div>
  );
}