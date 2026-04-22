import { forceRefreshCache } from "@/lib/store";

/**
 * Vercel Cron — hits this endpoint daily to force-refresh the in-memory
 * S3 state cache so data never goes stale beyond 1 hour.
 *
 * Protected by CRON_SECRET: Vercel sends the x-vercel-cron-secret header
 * automatically. Manual calls must pass ?secret=<CRON_SECRET>.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const headerSecret = request.headers.get("x-vercel-cron-secret");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    // No secret configured — allow in dev, block in prod
    if (process.env.NODE_ENV === "production") {
      return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
  } else if (headerSecret !== expected && querySecret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await forceRefreshCache();

  return Response.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    summary: {
      prompts: state.prompts.length,
      settings: state.settings.length,
      providers: state.providers.length,
      generations: state.generations.length,
      importedAssets: state.importedAssets.length,
    },
  });
}
