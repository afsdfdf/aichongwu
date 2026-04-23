import { NextResponse } from "next/server";
import { testConnection } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, message: "Missing connection id" }, { status: 400 });
    }
    const result = await testConnection(id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to validate provider" },
      { status: 500 },
    );
  }
}
