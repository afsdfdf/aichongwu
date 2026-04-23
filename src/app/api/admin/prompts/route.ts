import { NextResponse } from "next/server";
import { getPromptEditorModel, savePromptTemplateWithVersion } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get("templateId") || undefined;
  const payload = await getPromptEditorModel(templateId);
  return NextResponse.json({ ok: true, ...payload });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = await savePromptTemplateWithVersion(body ?? {});
    return NextResponse.json({ ok: true, prompt });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to save prompt",
      },
      { status: 500 },
    );
  }
}
