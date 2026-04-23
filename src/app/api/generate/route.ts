import { NextResponse } from "next/server";
import { normalizeGenerationRequest, runSynchronousGeneration } from "@/lib/generation-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const normalized = await normalizeGenerationRequest(request, {
      entrypoint: "generate",
      mode: "sync",
      fileField: "file",
      maxFileSizeMb: 10,
      defaultProductType: "frame",
      defaultTitle: "",
    });

    const { record } = await runSynchronousGeneration(normalized);

    return NextResponse.json({
      ok: true,
      generationId: record.id,
      outputImageUrl: record.outputImageUrl,
      promptUsed: record.promptUsed,
      modelUsed: record.modelUsed,
      metadata: record.metadata ?? null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "生成失败。",
      },
      { status: 500 },
    );
  }
}
