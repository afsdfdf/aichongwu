import { NextResponse } from "next/server";
import { getUiBlueprintSchema } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function GET() {
  const schema = await getUiBlueprintSchema();
  return NextResponse.json({ ok: true, schema });
}
