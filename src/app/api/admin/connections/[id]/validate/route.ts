import { NextResponse } from "next/server";
import { testConnection } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const result = await testConnection(params.id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to validate connection",
      },
      { status: 500 },
    );
  }
}
