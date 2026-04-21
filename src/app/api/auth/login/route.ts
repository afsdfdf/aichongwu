import { NextResponse } from "next/server";
import { createAdminSession, validateAdminCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim() || "";
  const password = body?.password || "";

  if (!validateAdminCredentials(email, password)) {
    return NextResponse.json({ message: "账号或密码错误。" }, { status: 401 });
  }

  await createAdminSession(email);
  return NextResponse.json({ ok: true });
}
