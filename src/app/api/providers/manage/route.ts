import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getModelOption } from "@/lib/catalog";
import { getStoreContext, saveProviderConfigs, saveStoreSettingRecord } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: "toggle" | "delete" | "priority" | "set_main";
    modelKey?: string;
    enabled?: boolean;
    priority?: number;
  };

  if (!body.action || !body.modelKey) {
    return NextResponse.json({ message: "缺少 action 或 modelKey" }, { status: 400 });
  }

  const option = getModelOption(body.modelKey);
  if (!option) {
    return NextResponse.json({ message: "未知模型" }, { status: 404 });
  }

  if (body.action === "toggle") {
    await saveProviderConfigs([
      {
        key: option.key,
        label: option.label,
        keepExistingApiKey: true,
        isEnabled: Boolean(body.enabled),
      },
    ]);
    return NextResponse.json({ ok: true, message: `${option.label} 已${body.enabled ? "启用" : "停用"}` });
  }

  if (body.action === "priority") {
    await saveProviderConfigs([
      {
        key: option.key,
        label: option.label,
        keepExistingApiKey: true,
        priority: Math.max(1, Number(body.priority || 1)),
      },
    ]);
    return NextResponse.json({ ok: true, message: `${option.label} 优先级已更新` });
  }

  if (body.action === "delete") {
    await saveProviderConfigs([
      {
        key: option.key,
        label: option.label,
        apiKey: "",
        keepExistingApiKey: false,
        webhookUrl: option.defaultEndpoint || null,
        baseUrl: null,
        modelName: option.modelName,
        isEnabled: false,
      },
    ]);
    return NextResponse.json({ ok: true, message: `${option.label} 已移除配置` });
  }

  if (body.action === "set_main") {
    const { setting } = await getStoreContext(getDefaultShopDomain());
    await saveStoreSettingRecord({
      shopDomain: getDefaultShopDomain(),
      activeModel: option.key,
      requireGeneration: setting.requireGeneration,
      widgetAccentColor: setting.widgetAccentColor,
      widgetButtonText: setting.widgetButtonText,
    });
    return NextResponse.json({ ok: true, message: `${option.label} 已设为主模型` });
  }

  return NextResponse.json({ message: "不支持的操作" }, { status: 400 });
}
