import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { generateTestImage } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
    }

    const body = (await request.json()) as {
      modelKey?: string;
      prompt?: string;
      mode?: "text2img" | "img2img" | "combined";
      sourceImage?: string; // base64 data URI or raw base64
      aspectRatio?: string;
    };

    if (!body.modelKey) {
      return NextResponse.json({ ok: false, message: "缺少 modelKey" }, { status: 400 });
    }

    if (!body.prompt && body.mode !== "img2img") {
      return NextResponse.json({ ok: false, message: "缺少提示词" }, { status: 400 });
    }

    const mode = body.mode || "text2img";

    // Decode source image if provided
    let sourceImageBuffer: Buffer | undefined;
    let sourceImageContentType: string | undefined;

    if (body.sourceImage) {
      // Handle data URI: "data:image/png;base64,xxxxx"
      const dataUriMatch = body.sourceImage.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUriMatch) {
        sourceImageContentType = dataUriMatch[1];
        sourceImageBuffer = Buffer.from(dataUriMatch[2], "base64");
      } else {
        // Raw base64 — assume PNG
        sourceImageContentType = "image/png";
        sourceImageBuffer = Buffer.from(body.sourceImage, "base64");
      }

      // Limit source image to 10MB
      if (sourceImageBuffer.length > 10 * 1024 * 1024) {
        return NextResponse.json({ ok: false, message: "上传图片不能超过 10MB" }, { status: 400 });
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
      message: "生图测试完成",
      outputImageUrl: result.outputImageUrl,
      mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生图测试失败";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
