import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getUiBlueprintSchema } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const schema = await getUiBlueprintSchema();
  return NextResponse.json({ ok: true, schema });
}
