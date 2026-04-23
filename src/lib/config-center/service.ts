import { slugifyProductType } from "@/lib/utils";
import {
  createPromptVersion,
  exposeSecret,
  getConnectionById,
  getEffectiveRoute,
  getEffectiveSystemSetting,
  getRouteById,
  listConnections,
  listPromptBindings,
  listPromptTemplates,
  listPromptVersions,
  listRoutePolicies,
  publishPromptVersion,
  resolveEffectivePrompt,
  upsertConnection,
  upsertPromptTemplate,
  upsertRoutePolicy,
  upsertSystemSetting,
} from "@/lib/config-center/repository";
import { syncConnectionToBucket, syncPromptToBucket, syncSystemSettingToBucket } from "@/lib/config-center/sync";
import type {
  ConnectionRecord,
  EffectivePrompt,
  EffectiveRoute,
  PromptTemplateRecord,
  RoutePolicyRecord,
  SystemSetting,
} from "@/lib/config-center/types";

export async function getAdminBootstrap() {
  const [settings, connections, routes, templates, bindings] = await Promise.all([
    getEffectiveSystemSetting(),
    listConnections(),
    listRoutePolicies(),
    listPromptTemplates(),
    listPromptBindings(),
  ]);

  return {
    settings,
    connections: connections.map(exposeSecret),
    routes,
    templates,
    bindings,
  };
}

export async function saveSystemSettings(input: Partial<SystemSetting>) {
  const next = await upsertSystemSetting(input);
  const selectedRoute = next.defaultRouteId ? await getRouteById(next.defaultRouteId) : null;
  const primaryConnection = selectedRoute ? await getConnectionById(selectedRoute.primaryConnectionId) : null;
  await syncSystemSettingToBucket(next, selectedRoute, primaryConnection?.modelCode ?? null);
  return next;
}

export async function saveConnection(input: Partial<ConnectionRecord> & { secret?: string | null }) {
  const next = await upsertConnection(input);
  await syncConnectionToBucket(next);
  return exposeSecret(next);
}

export async function saveRoutePolicy(input: Partial<RoutePolicyRecord>) {
  return upsertRoutePolicy(input);
}

export async function savePromptTemplateWithVersion(input: {
  templateId?: string;
  name: string;
  productType: string;
  scene?: PromptTemplateRecord["scene"];
  displayName: string;
  promptTemplate: string;
  negativePrompt?: string | null;
  aspectRatio?: string | null;
  routePolicyId?: string | null;
  publish?: boolean;
}) {
  const template = await upsertPromptTemplate({
    id: input.templateId,
    name: input.name,
    productType: slugifyProductType(input.productType || "frame"),
    scene: input.scene || "generate",
    status: input.publish ? "published" : "draft",
  });

  const version = await createPromptVersion({
    templateId: template.id,
    displayName: input.displayName,
    promptTemplate: input.promptTemplate,
    negativePrompt: input.negativePrompt ?? null,
    aspectRatio: input.aspectRatio ?? null,
    isActive: true,
  });

  let effective: EffectivePrompt = {
    template,
    version,
    binding: null,
  };

  if (input.publish) {
    const routePolicyId = input.routePolicyId || (await ensureDefaultPromptRoute()).id;
    const binding = await publishPromptVersion({
      templateId: template.id,
      routePolicyId,
      version: version.version,
    });
    effective = { template: { ...template, status: "published" }, version, binding };
  }

  await syncPromptToBucket(effective);
  return effective;
}

export async function ensureDefaultPromptRoute() {
  const routes = await listRoutePolicies();
  const first = routes.find((item) => item.scene === "generate" && item.enabled);
  if (first) return first;

  const connections = await listConnections();
  const firstConnection = connections[0];
  if (!firstConnection) {
    throw new Error("No connection configured yet. Please create one API connection first.");
  }

  return saveRoutePolicy({
    name: "默认生图路由",
    scene: "generate",
    productType: "*",
    enabled: true,
    primaryConnectionId: firstConnection.id,
    fallbackConnectionIds: [],
    promptBindingId: null,
  });
}

export async function resolveRuntimeRouteAndPrompt(input: {
  scene: RoutePolicyRecord["scene"];
  productType: string;
}): Promise<{ settings: SystemSetting; route: EffectiveRoute | null; prompt: EffectivePrompt | null }> {
  const settings = await getEffectiveSystemSetting();
  const normalized = slugifyProductType(input.productType || "frame");
  const route = await getEffectiveRoute(input.scene, normalized);
  const prompt = await resolveEffectivePrompt({
    scene: input.scene === "process" ? "process" : "generate",
    productType: normalized,
    routePolicyId: route?.route.id ?? settings.defaultRouteId,
  });

  return { settings, route, prompt };
}

export async function getPromptEditorModel(templateId?: string) {
  const [templates, routes] = await Promise.all([listPromptTemplates(), listRoutePolicies()]);
  if (!templateId) {
    return {
      templates,
      routes,
      versions: [],
    };
  }

  return {
    templates,
    routes,
    versions: await listPromptVersions(templateId),
  };
}

export async function testConnection(id: string) {
  const record = await getConnectionById(id);
  if (!record) {
    throw new Error("Connection not found.");
  }

  const secret = exposeSecret(record).secret as string | null;
  const resolvedEndpoint =
    record.providerKind === "openai_official"
      ? "https://api.openai.com/v1"
      : record.submitUrl || record.baseUrl || record.endpointPath || null;

  const ok = Boolean(
    record.providerKind === "openai_official"
      ? secret
      : record.providerKind === "openai_compatible"
        ? secret && record.baseUrl
        : record.providerKind.startsWith("custom_webhook")
          ? record.submitUrl
          : secret || record.submitUrl || record.baseUrl,
  );

  return {
    ok,
    resolvedEndpoint,
    providerKind: record.providerKind,
    message: ok ? "configuration validated" : "missing key field for this provider kind",
  };
}

export async function getUiBlueprintSchema() {
  return {
    shell: {
      sidebarWidth: 248,
      contentMaxWidth: 1440,
      pagePadding: { mobile: 16, desktop: 24 },
      sectionGap: 16,
      stickyActionBarHeight: 64,
    },
    tokens: {
      radius: { card: 16, input: 12, button: 12 },
      spacing: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
      elevation: { base: "shadow-sm", panel: "shadow-md" },
      border: "border border-black/10 dark:border-white/10",
    },
    pagePatterns: [
      {
        key: "settings",
        title: "系统设置",
        structure: ["PageHeader", "SummaryCards", "FormSections", "StickyActionBar"],
      },
      {
        key: "connections",
        title: "API 设置",
        structure: ["PageHeader", "FilterBar", "EntityTable", "DetailEditor", "TestPanel"],
      },
      {
        key: "prompts",
        title: "提示词设置",
        structure: ["PageHeader", "TemplateList", "VersionTabs", "EditorPane", "PreviewPane", "StickyActionBar"],
      },
    ],
    rules: [
      "店铺端永远只改域名，不感知 provider / prompt / route 内部结构。",
      "官方 OpenAI 不显示 Base URL；中转才显示 Base URL；Webhook 才显示 submit/status URL。",
      "表单保存必须先校验 provider kind 对应必填项，再允许保存。",
      "提示词编辑器必须有 Draft / Published 两层，不允许直接覆盖线上版本。",
      "页面内组件间距统一使用 8/12/16/24/32，不允许页面各自定义随机 spacing。",
    ],
  };
}

