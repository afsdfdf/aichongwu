import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { testConnection } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

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
