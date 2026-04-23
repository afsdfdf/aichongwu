import { NextResponse } from "next/server";
import { savePromptTemplateWithVersion } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const prompt = await savePromptTemplateWithVersion({
      ...body,
      templateId: params.templateId,
      publish: true,
    });
    return NextResponse.json({ ok: true, prompt });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to publish prompt",
      },
      { status: 500 },
    );
  }
}
