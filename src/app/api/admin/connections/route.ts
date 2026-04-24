import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAdminBootstrap, saveConnection } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const bootstrap = await getAdminBootstrap();
  return NextResponse.json({ ok: true, connections: bootstrap.connections, routes: bootstrap.routes });
}

export async function POST(request: Request) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const connection = await saveConnection(body ?? {});
    return NextResponse.json({ ok: true, connection });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to save connection",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
