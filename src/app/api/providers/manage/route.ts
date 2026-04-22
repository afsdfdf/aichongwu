import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getModelDefById } from "@/lib/catalog";
import { deletePromptRecord, getStoreContext, saveProviderRecord, savePromptRecord, saveStoreSettingRecord } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";
import { invalidateRedisCache } from "@/lib/redis-cache";

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
    // Prompt save fields
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

  // Resolve the provider for a given model
  async function getProviderForModel(modelId: string) {
    const modelDef = getModelDefById(modelId);
    const providerId = modelDef?.provider.id || body.providerId || "custom";
    const { providers } = await getStoreContext(getDefaultShopDomain());
    return providers.find((p) => p.id === providerId || p.providerDefId === providerId);
  }

  // ── Toggle model (v3) ──
  if (body.action === "toggle_model" || body.action === "toggle") {
    const modelId = body.modelId || body.modelKey;
    if (!modelId) return NextResponse.json({ message: "缺少 modelId" }, { status: 400 });

    const modelDef = getModelDefById(modelId);
    const provider = await getProviderForModel(modelId);

    if (provider) {
      const models = provider.models.map((m) => ({
        id: m.id,
        modelName: m.modelName,
        endpoint: m.endpoint,
        isEnabled: m.id === modelId ? Boolean(body.enabled) : m.isEnabled,
        priority: m.priority,
      }));

      await saveProviderRecord({
        providerId: provider.id,
        keepExistingApiKey: true,
        models,
      });
      await invalidateRedisCache();
    }

    const label = modelDef?.model.label || modelId;
    return NextResponse.json({ ok: true, message: `${label} 已${body.enabled ? "启用" : "停用"}` });
  }

  // ── Set main model ──
  if (body.action === "set_main") {
    const modelId = body.modelId || body.modelKey;
    if (!modelId) return NextResponse.json({ message: "缺少 modelId" }, { status: 400 });

    const modelDef = getModelDefById(modelId);
    const label = modelDef?.model.label || modelId;
    const { setting } = await getStoreContext(getDefaultShopDomain());

    await saveStoreSettingRecord({
      shopDomain: getDefaultShopDomain(),
      activeModel: modelId,
      requireGeneration: setting.requireGeneration,
      widgetAccentColor: setting.widgetAccentColor,
      widgetButtonText: setting.widgetButtonText,
    });
    await invalidateRedisCache();
    return NextResponse.json({ ok: true, message: `${label} 已设为主模型` });
  }

  // ── Delete model (v3) ──
  if (body.action === "delete_model" || body.action === "delete") {
    const modelId = body.modelId || body.modelKey;
    if (!modelId) return NextResponse.json({ message: "缺少 modelId" }, { status: 400 });

    const modelDef = getModelDefById(modelId);
    const provider = await getProviderForModel(modelId);

    if (provider) {
      const models = provider.models
        .filter((m) => m.id !== modelId)
        .map((m) => ({
          id: m.id,
          modelName: m.modelName,
          endpoint: m.endpoint,
          isEnabled: m.isEnabled,
          priority: m.priority,
        }));

      await saveProviderRecord({
        providerId: provider.id,
        keepExistingApiKey: true,
        models,
      });
      await invalidateRedisCache();
    }

    const label = modelDef?.model.label || modelId;
    return NextResponse.json({ ok: true, message: `${label} 已移除` });
  }

  // ── Priority ──
  if (body.action === "priority") {
    const modelId = body.modelKey;
    if (!modelId) return NextResponse.json({ message: "缺少 modelKey" }, { status: 400 });

    const modelDef = getModelDefById(modelId);
    const provider = await getProviderForModel(modelId);

    if (provider) {
      const models = provider.models.map((m) => ({
        id: m.id,
        modelName: m.modelName,
        endpoint: m.endpoint,
        isEnabled: m.isEnabled,
        priority: m.id === modelId ? Math.max(1, Number(body.priority || 1)) : m.priority,
      }));

      await saveProviderRecord({
        providerId: provider.id,
        keepExistingApiKey: true,
        models,
      });
      await invalidateRedisCache();
    }

    const label = modelDef?.model.label || modelId;
    return NextResponse.json({ ok: true, message: `${label} 优先级已更新` });
  }

  // ── Add model from detected list (v3) ──
  if (body.action === "add_model") {
    const providerId = body.providerId;
    const modelId = body.modelId || body.modelKey;
    if (!providerId || !modelId) {
      return NextResponse.json({ message: "缺少 providerId 或 modelId" }, { status: 400 });
    }

    const { providers } = await getStoreContext(getDefaultShopDomain());
    const provider = providers.find((p) => p.id === providerId || p.providerDefId === providerId);

    if (!provider) {
      return NextResponse.json({ message: "未找到该 Provider" }, { status: 400 });
    }

    // Check if model already exists
    const alreadyExists = provider.models.some(
      (m) => m.id === modelId || m.modelName === modelId
    );
    if (alreadyExists) {
      // Update API Key / baseUrl if provided, then set as main model
      if (body.apiKey || body.baseUrl) {
        await saveProviderRecord({
          providerId: provider.id,
          apiKey: body.apiKey || undefined,
          baseUrl: body.baseUrl || provider.baseUrl || undefined,
          keepExistingApiKey: !body.apiKey,
          models: provider.models.map((m) => ({
            id: m.id,
            modelName: m.modelName,
            endpoint: m.endpoint,
            isEnabled: m.isEnabled,
            priority: m.priority,
          })),
        });
      }

      const { setting } = await getStoreContext(getDefaultShopDomain());
      await saveStoreSettingRecord({
        shopDomain: getDefaultShopDomain(),
        activeModel: provider.models.find((m) => m.id === modelId || m.modelName === modelId)?.id || modelId,
        requireGeneration: setting.requireGeneration,
        widgetAccentColor: setting.widgetAccentColor,
        widgetButtonText: setting.widgetButtonText,
      });
      await invalidateRedisCache();
      return NextResponse.json({ ok: true, message: `${modelId} 已设为主模型` });
    }

    // Add the new model
    const adapter = body.adapter || "openai-chat-image";
    const endpoint = body.endpoint || "/chat/completions";
    const modelName = body.modelName || modelId;

    const models = [
      ...provider.models.map((m) => ({
        id: m.id,
        modelName: m.modelName,
        endpoint: m.endpoint,
        isEnabled: m.isEnabled,
        priority: m.priority,
      })),
      {
        id: modelId,
        modelName,
        endpoint,
        isEnabled: true,
        priority: provider.models.length + 1,
      },
    ];

    await saveProviderRecord({
      providerId: provider.id,
      keepExistingApiKey: !body.apiKey,
      apiKey: body.apiKey || undefined,
      baseUrl: body.baseUrl || provider.baseUrl || undefined,
      models,
    });

    // Set as main model
    const { setting } = await getStoreContext(getDefaultShopDomain());
    await saveStoreSettingRecord({
      shopDomain: getDefaultShopDomain(),
      activeModel: modelId,
      requireGeneration: setting.requireGeneration,
      widgetAccentColor: setting.widgetAccentColor,
      widgetButtonText: setting.widgetButtonText,
    });

    await invalidateRedisCache();
    return NextResponse.json({ ok: true, message: `${modelId} 已添加并设为主模型` });
  }

  // ── Save prompt ──
  if (body.action === "save_prompt") {
    const { productType, displayName, promptTemplate, negativePrompt, aspectRatio, isActive } = body;
    if (!productType || !displayName || !promptTemplate) {
      return NextResponse.json({ message: "缺少 productType、displayName 或 promptTemplate" }, { status: 400 });
    }

    await savePromptRecord({
      shopDomain: getDefaultShopDomain(),
      productType,
      displayName,
      promptTemplate,
      negativePrompt: negativePrompt || null,
      aspectRatio: aspectRatio || null,
      isActive: isActive !== false,
    });
    await invalidateRedisCache();
    return NextResponse.json({ ok: true, message: `提示词「${displayName}」已保存` });
  }

  // ── Read current prompts ──
  if (body.action === "list_prompts") {
    const { prompts } = await getStoreContext(getDefaultShopDomain());
    return NextResponse.json({ ok: true, prompts });
  }

  // ── Delete prompt ──
  if (body.action === "delete_prompt") {
    const promptId = body.promptId as string | undefined;
    if (!promptId) {
      return NextResponse.json({ message: "缺少 promptId" }, { status: 400 });
    }
    await deletePromptRecord(promptId);
    await invalidateRedisCache();
    return NextResponse.json({ ok: true, message: "提示词已删除" });
  }

  // ── Update prompt ──
  if (body.action === "update_prompt") {
    const promptId = body.promptId as string | undefined;
    const displayName = body.displayName as string | undefined;
    const promptTemplate = body.promptTemplate as string | undefined;
    if (!promptId) {
      return NextResponse.json({ message: "缺少 promptId" }, { status: 400 });
    }

    const { prompts } = await getStoreContext(getDefaultShopDomain());
    const existing = prompts.find((p) => p.id === promptId);
    if (!existing) {
      return NextResponse.json({ message: "未找到该提示词" }, { status: 404 });
    }

    await savePromptRecord({
      id: promptId,
      shopDomain: getDefaultShopDomain(),
      productType: existing.productType,
      displayName: displayName || existing.displayName,
      promptTemplate: promptTemplate || existing.promptTemplate,
      negativePrompt: body.negativePrompt !== undefined ? (body.negativePrompt as string | null) : existing.negativePrompt,
      aspectRatio: body.aspectRatio !== undefined ? (body.aspectRatio as string | null) : existing.aspectRatio,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
    });
    await invalidateRedisCache();
    return NextResponse.json({ ok: true, message: "提示词已更新" });
  }

  return NextResponse.json({ message: "不支持的操作" }, { status: 400 });
}
