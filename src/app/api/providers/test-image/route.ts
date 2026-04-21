import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { generateTestImage } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ message: "未登录" }, { status: 401 });
    }

    const body = (await request.json()) as { modelKey?: string; prompt?: string };
    if (!body.modelKey || !body.prompt) {
      return NextResponse.json({ message: "缺少 modelKey 或 prompt" }, { status: 400 });
    }

    const result = await generateTestImage({
      modelKey: body.modelKey,
      prompt: body.prompt,
    });

    return NextResponse.json({
      ok: true,
      message: "生图测试完成",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "生图测试失败" },
      { status: 500 },
    );
  }
}
