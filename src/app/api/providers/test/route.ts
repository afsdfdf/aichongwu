import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { validateProviderSetup } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ message: "未登录" }, { status: 401 });
    }

    const body = (await request.json()) as { modelKey?: string };
    if (!body.modelKey) {
      return NextResponse.json({ message: "缺少 modelKey" }, { status: 400 });
    }

    const result = await validateProviderSetup(body.modelKey);
    return NextResponse.json({
      ok: result.ok,
      message: result.ok
        ? `${result.option.label} 配置可用，已读取到端点${result.hasApiKey ? "和 API Key" : ""}。`
        : `${result.option.label} 配置不完整，请检查端点或 API Key。`,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "测试失败" },
      { status: 500 },
    );
  }
}
