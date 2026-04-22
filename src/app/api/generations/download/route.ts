import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listGenerationRecords } from "@/lib/store";
import { getDefaultShopDomain } from "@/lib/utils";

export const runtime = "nodejs";

async function addRemoteFile(zip: JSZip, folder: string, filename: string, url: string) {
  const response = await fetch(url);
  if (!response.ok) return;
  const buffer = Buffer.from(await response.arrayBuffer());
  zip.folder(folder)?.file(filename, buffer);
}

function extFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop();
    return ext && ext.length <= 5 ? ext : "png";
  } catch {
    return "png";
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const body = (await request.json()) as {
    ids?: string[];
    includeOriginals?: boolean;
  };

  const ids = body.ids ?? [];
  if (!ids.length) {
    return NextResponse.json({ message: "请选择至少一条记录" }, { status: 400 });
  }
  if (ids.length > 30) {
    return NextResponse.json({ message: "单次最多下载 30 条记录，请减少选择" }, { status: 400 });
  }

  const rows = await listGenerationRecords(getDefaultShopDomain());
  const selected = rows.filter((item) => ids.includes(item.id));
  if (!selected.length) {
    return NextResponse.json({ message: "没有找到匹配记录" }, { status: 404 });
  }

  const zip = new JSZip();
  for (const item of selected) {
    const base = `${item.createdAt.slice(0, 19).replace(/[:T]/g, "-")}_${item.id.slice(0, 8)}`;
    await addRemoteFile(zip, "效果图", `${base}_result.${extFromUrl(item.outputImageUrl)}`, item.outputImageUrl);
    if (body.includeOriginals) {
      await addRemoteFile(zip, "原图", `${base}_source.${extFromUrl(item.sourceImageUrl)}`, item.sourceImageUrl);
    }
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="generations-batch.zip"`,
    },
  });
}
