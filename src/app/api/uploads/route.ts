import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { uploadBufferToS3 } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Please choose an image file." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, message: "Only image uploads are supported." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, message: "Image must be 10MB or smaller." }, { status: 400 });
    }

    const uploaded = await uploadBufferToS3({
      buffer: Buffer.from(await file.arrayBuffer()),
      folder: "admin-uploads",
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({
      ok: true,
      url: uploaded.url,
      key: uploaded.key,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}
