import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import {
  getAdminBootstrap,
  getPromptEditorModel,
  removeConnection,
  removePromptTemplate,
  saveConnection,
  savePromptTemplateWithVersion,
  saveRoutePolicy,
} from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: string;
    modelKey?: string;
    modelId?: string;
    providerId?: string;
    enabled?: boolean;
    priority?: number;
    adapter?: string;
    endpoint?: string;
    modelName?: string;
    apiKey?: string;
    baseUrl?: string;
    productType?: string;
    displayName?: string;
    promptTemplate?: string;
    negativePrompt?: string;
    aspectRatio?: string;
    isActive?: boolean;
    promptId?: string;
  };

  if (!body.action) {
    return NextResponse.json({ message: "缺少 action" }, { status: 400 });
  }

  async function getConnectionForModel(modelId: string) {
    const { connections } = await getAdminBootstrap();
    return connections.find((item) => item.modelCode === modelId || item.id === modelId) ?? null;
  }

  if (body.action === "toggle_model" || body.action === "toggle") {
    const modelId = body.modelId || body.modelKey;
    if (!modelId) return NextResponse.json({ message: "缺少 modelId" }, { status: 400 });

    const connection = await getConnectionForModel(modelId);
    if (connection) {
      await saveConnection({
        id: connection.id,
        enabled: Boolean(body.enabled),
      });
    }

    return NextResponse.json({ ok: true, message: `${modelId} 已${body.enabled ? "启用" : "停用"}` });
  }

  if (body.action === "set_main") {
    const modelId = body.modelId || body.modelKey;
    if (!modelId) return NextResponse.json({ message: "缺少 modelId" }, { status: 400 });

    await saveRoutePolicy({
      id: "generate:*",
      name: "Default Generate Route",
      scene: "generate",
      productType: "*",
      enabled: true,
      primaryConnectionId: modelId,
    });
    return NextResponse.json({ ok: true, message: `${modelId} 已设为默认路由模型` });
  }

  if (body.action === "delete_model" || body.action === "delete") {
    const modelId = body.modelId || body.modelKey;
    if (!modelId) return NextResponse.json({ message: "缺少 modelId" }, { status: 400 });

    await removeConnection(modelId);
    return NextResponse.json({ ok: true, message: `${modelId} 已移除` });
  }

  if (body.action === "priority") {
    const modelId = body.modelId || body.modelKey;
    if (!modelId) return NextResponse.json({ message: "缺少 modelId" }, { status: 400 });

    const connection = await getConnectionForModel(modelId);
    if (connection) {
      await saveConnection({
        id: connection.id,
        priority: Math.max(1, Number(body.priority || 1)),
      });
    }

    return NextResponse.json({ ok: true, message: `${modelId} 优先级已更新` });
  }

  if (body.action === "add_model") {
    const providerId = body.providerId;
    const modelId = body.modelId || body.modelKey;
    if (!providerId || !modelId) {
      return NextResponse.json({ message: "缺少 providerId 或 modelId" }, { status: 400 });
    }
    if (providerId !== "google" && providerId !== "custom") {
      return NextResponse.json({ message: "仅支持 Google 和自定义模型" }, { status: 400 });
    }

    await saveConnection({
      legacyProviderId: providerId,
      modelCode: modelId,
      modelDisplayName: body.modelName || modelId,
      adapter: body.adapter || "openai-chat-image",
      endpointPath: body.endpoint || "/chat/completions",
      baseUrl: body.baseUrl || null,
      secret: body.apiKey || undefined,
      enabled: true,
      priority: 1,
    });

    await saveRoutePolicy({
      id: "generate:*",
      name: "Default Generate Route",
      scene: "generate",
      productType: "*",
      enabled: true,
      primaryConnectionId: modelId,
    });

    return NextResponse.json({ ok: true, message: `${modelId} 已添加并设为默认路由模型` });
  }

  if (body.action === "save_prompt") {
    const { productType, displayName, promptTemplate, negativePrompt, aspectRatio, isActive } = body;
    if (!productType || !displayName || !promptTemplate) {
      return NextResponse.json({ message: "缺少 productType、displayName 或 promptTemplate" }, { status: 400 });
    }

    await savePromptTemplateWithVersion({
      name: displayName,
      productType,
      displayName,
      promptTemplate,
      negativePrompt: negativePrompt || null,
      aspectRatio: aspectRatio || null,
      publish: isActive !== false,
    });
    return NextResponse.json({ ok: true, message: `提示词“${displayName}”已保存` });
  }

  if (body.action === "list_prompts") {
    const payload = await getPromptEditorModel();
    const prompts = await Promise.all(
      payload.templates.map(async (template) => {
        const detail = await getPromptEditorModel(template.id);
        const version = detail.versions[0];
        return {
          id: template.id,
          productType: template.productType,
          displayName: version?.displayName || template.name,
          promptTemplate: version?.promptTemplate || "",
          negativePrompt: version?.negativePrompt || null,
          aspectRatio: version?.aspectRatio || null,
          isActive: template.status === "published",
        };
      }),
    );
    return NextResponse.json({ ok: true, prompts });
  }

  if (body.action === "delete_prompt") {
    const promptId = body.promptId as string | undefined;
    if (!promptId) {
      return NextResponse.json({ message: "缺少 promptId" }, { status: 400 });
    }
    await removePromptTemplate(promptId);
    return NextResponse.json({ ok: true, message: "提示词已删除" });
  }

  if (body.action === "update_prompt") {
    const promptId = body.promptId as string | undefined;
    if (!promptId) {
      return NextResponse.json({ message: "缺少 promptId" }, { status: 400 });
    }

    const detail = await getPromptEditorModel(promptId);
    const template = detail.templates.find((item) => item.id === promptId);
    const version = detail.versions[0];
    if (!template || !version) {
      return NextResponse.json({ message: "未找到该提示词" }, { status: 404 });
    }

    await savePromptTemplateWithVersion({
      templateId: promptId,
      name: (body.displayName as string | undefined) || template.name,
      productType: template.productType,
      displayName: (body.displayName as string | undefined) || version.displayName,
      promptTemplate: (body.promptTemplate as string | undefined) || version.promptTemplate,
      negativePrompt: body.negativePrompt !== undefined ? (body.negativePrompt as string | null) : version.negativePrompt,
      aspectRatio: body.aspectRatio !== undefined ? (body.aspectRatio as string | null) : version.aspectRatio,
      publish: body.isActive !== undefined ? Boolean(body.isActive) : template.status === "published",
    });
    return NextResponse.json({ ok: true, message: "提示词已更新" });
  }

  return NextResponse.json({ message: "不支持的操作" }, { status: 400 });
}
