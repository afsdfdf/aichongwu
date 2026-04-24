import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAdminBootstrap, saveSystemSettings } from "@/lib/config-center/service";

export const runtime = "nodejs";

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const bootstrap = await getAdminBootstrap();
  return NextResponse.json({ ok: true, settings: bootstrap.settings });
}

export async function PUT(request: Request) {
  try {
    if (!(await getAdminSession())) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const settings = await saveSystemSettings(body ?? {});
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to save settings",
      },
      { status: 500 },
    );
  }
}
