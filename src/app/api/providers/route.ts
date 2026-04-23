import { NextResponse } from "next/server";
import { getAdminBootstrap, saveConnection } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function GET() {
  const bootstrap = await getAdminBootstrap();
  return NextResponse.json({
    ok: true,
    providers: bootstrap.connections,
    routes: bootstrap.routes,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const connection = await saveConnection(body ?? {});
    return NextResponse.json({ ok: true, provider: connection });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to save provider" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
