import { Redis } from "@upstash/redis";
import type { AppState } from "@/lib/types";

// ── Upstash Redis cache layer ──
// Replaces in-process memory cache.
// - Survives cold starts (cross-instance)
// - Read: Redis (~5ms) → miss → S3 → write-back to Redis
// - Write: S3 (durable) + dual-write Redis (instant read-after-write)
// - TTL: 1 hour; Vercel Cron daily force-refresh

const REDIS_KEY = "app-state";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getReadOnlyRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.KV_REST_API_READ_ONLY_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/** Read cached state from Redis. Returns null on miss or unavailable. */
export async function getRedisCache(): Promise<AppState | null> {
  try {
    const redis = getReadOnlyRedis();
    if (!redis) return null;
    const raw = await redis.get<string>(REDIS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch (err) {
    // Redis unavailable → fallback to S3 (non-blocking)
    console.warn("[redis-cache] GET failed, falling back to S3:", (err as Error).message);
    return null;
  }
}

/** Write state to Redis cache (called after S3 read-miss or S3 write). */
export async function setRedisCache(data: AppState): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    // TTL 1 hour; stale entries auto-expire
    await redis.set(REDIS_KEY, JSON.stringify(data), { ex: 3600 });
  } catch (err) {
    // Cache write failure is non-critical; S3 is source of truth
    console.warn("[redis-cache] SET failed (non-critical):", (err as Error).message);
  }
}

/** Force-refresh: clear Redis so next read pulls fresh from S3. */
export async function invalidateRedisCache(): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(REDIS_KEY);
  } catch (err) {
    console.warn("[redis-cache] DEL failed (non-critical):", (err as Error).message);
  }
}

/** Check if Redis is configured and reachable. */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return false;
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
