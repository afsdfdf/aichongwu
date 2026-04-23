import { NextResponse } from "next/server";
import { getAdminBootstrap, saveRoutePolicy } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function GET() {
  const bootstrap = await getAdminBootstrap();
  return NextResponse.json({ ok: true, routes: bootstrap.routes, connections: bootstrap.connections });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const route = await saveRoutePolicy(body ?? {});
    return NextResponse.json({ ok: true, route });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to save route policy",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
