import { NextResponse } from "next/server";
import { updateGenerationOrderData } from "@/lib/store";
import { verifyShopifyWebhook } from "@/lib/shopify";

type ShopifyOrderPayload = {
  id: number | string;
  order_number?: number | string;
  name?: string;
  contact_email?: string;
  customer?: { id?: number | string; email?: string };
  line_items?: Array<{
    properties?: Array<{ name?: string; value?: string }>;
  }>;
};

export const runtime = "nodejs";

function getProperty(properties: Array<{ name?: string; value?: string }> | undefined, key: string) {
  return properties?.find((item) => item.name === key)?.value;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ message: "Invalid webhook signature" }, { status: 401 });
  }

  const shopDomain = request.headers.get("x-shopify-shop-domain") || process.env.DEFAULT_SHOP_DOMAIN || "";
  const payload = JSON.parse(rawBody) as ShopifyOrderPayload;
  const lineItems = payload.line_items ?? [];

  for (const item of lineItems) {
    const generationId = getProperty(item.properties, "_AI Generation ID");
    if (!generationId) continue;

    await updateGenerationOrderData({
      generationId,
      shopDomain,
      orderId: String(payload.id),
      orderNumber: payload.order_number ? String(payload.order_number) : null,
      orderName: payload.name || null,
      customerEmail: payload.contact_email || payload.customer?.email || null,
      customerId: payload.customer?.id ? String(payload.customer.id) : null,
      status: "ordered",
    });
  }

  return NextResponse.json({ ok: true });
}
