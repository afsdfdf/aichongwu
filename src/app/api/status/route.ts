import { NextResponse } from "next/server";
import { getGenerationRecordById } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}

function getMetadataValue(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = String(searchParams.get("taskId") || "").trim();
  const imageId = String(searchParams.get("imageId") || "").trim();
  const generationId = taskId || imageId;

  if (!generationId) {
    return json({ status: "failed", error: "Missing taskId or imageId" }, 400);
  }

  try {
    const record = await getGenerationRecordById(generationId);

    if (!record) {
      return json({ status: "failed", error: "Task not found" }, 404);
    }

    if (record.status === "processing") {
      return json({ status: "processing" });
    }

    if (record.status === "failed") {
      return json({
        status: "failed",
        error: getMetadataValue(record.metadata, "error") || "Generation failed",
      });
    }

    if (record.outputImageUrl) {
      return json({
        status: "succeeded",
        resultUrl: record.outputImageUrl,
        thumbnailUrl: record.outputImageUrl,
      });
    }

    return json({ status: "processing" });
  } catch (error) {
    return json(
      {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to read task status",
      },
      500,
    );
  }
}