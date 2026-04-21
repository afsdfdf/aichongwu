import crypto from "node:crypto";

export function verifyShopifyWebhook(rawBody: string, receivedHmac: string | null) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!receivedHmac) return false;

  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(receivedHmac));
}
