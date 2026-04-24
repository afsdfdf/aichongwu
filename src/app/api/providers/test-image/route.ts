import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { generateTestImage } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      modelKey?: string;
      prompt?: string;
      mode?: "text2img" | "img2img" | "combined";
      sourceImage?: string;
      aspectRatio?: string;
    };

    if (!body.modelKey) {
      return NextResponse.json({ ok: false, message: "Missing modelKey" }, { status: 400 });
    }

    if (!body.prompt && body.mode !== "img2img") {
      return NextResponse.json({ ok: false, message: "Missing prompt" }, { status: 400 });
    }

    const mode = body.mode || "text2img";

    let sourceImageBuffer: Buffer | undefined;
    let sourceImageContentType: string | undefined;

    if (body.sourceImage) {
      const dataUriMatch = body.sourceImage.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUriMatch) {
        sourceImageContentType = dataUriMatch[1];
        sourceImageBuffer = Buffer.from(dataUriMatch[2], "base64");
      } else {
        sourceImageContentType = "image/png";
        sourceImageBuffer = Buffer.from(body.sourceImage, "base64");
      }

      if (sourceImageBuffer.length > 10 * 1024 * 1024) {
        return NextResponse.json({ ok: false, message: "Source image must be under 10MB" }, { status: 400 });
      }
    }

    const result = await generateTestImage({
      modelKey: body.modelKey,
      prompt: body.prompt || "",
      sourceImageBuffer,
      sourceImageContentType,
      aspectRatio: body.aspectRatio,
    });

    return NextResponse.json({
      ok: true,
      message: "Image test completed",
      outputImageUrl: result.outputImageUrl,
      mode,
      usedModelKey: result.usedModelKey,
      metadata: result.metadata ?? null,
      sourceImageForwarded: Boolean((result.metadata as Record<string, unknown> | null)?.sourceImageForwarded),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image test failed";
    console.error("[providers/test-image]", message);
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? ((error as { status: number }).status || 500)
        : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
