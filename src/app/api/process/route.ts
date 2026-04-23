import { after, NextResponse } from "next/server";
import {
  createPendingGeneration,
  normalizeGenerationRequest,
  runAsyncGenerationJob,
} from "@/lib/generation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const normalized = await normalizeGenerationRequest(request, {
      entrypoint: "process",
      mode: "async",
      fileField: "image",
      maxFileSizeMb: 20,
      defaultProductType: "keychain",
      defaultTitle: "Custom Pet Memorial Keychain",
    });

    const pending = await createPendingGeneration(normalized);
    const taskId = pending.id;
    const imageId = pending.id;

    after(async () => {
      await runAsyncGenerationJob({
        ...normalized,
        generationId: pending.id,
        imageId,
      });
    });

    return json({ taskId, imageId });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to create task",
      },
      500,
    );
  }
}
