import { NextResponse } from "next/server";
import { updateGenerationStatus } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { generationId?: string; shopDomain?: string };
    const generationId = String(body.generationId || "").trim();
    const shopDomain = String(body.shopDomain || process.env.DEFAULT_SHOP_DOMAIN || "").trim();

    if (!generationId || !shopDomain) {
      return NextResponse.json({ message: "Missing generationId or shopDomain" }, { status: 400 });
    }

    const designConfirmedAt = new Date().toISOString();
    const updated = await updateGenerationStatus({
      generationId,
      shopDomain,
      status: "confirmed",
      designConfirmedAt,
    });

    if (!updated) {
      return NextResponse.json({ message: "Generation record not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, status: "confirmed", designConfirmedAt });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to confirm design" },
      { status: 500 },
    );
  }
}
