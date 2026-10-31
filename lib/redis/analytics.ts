import { redis } from "./client";
import { EngagementSummary } from "@/types/database";

export const ANALYTICS_CACHE_TTL = 3600; // 1 hour

/**
 * Generates the tenant-scoped Redis key for analytics caching:
 * Convention: tenant:{tenantId}:analytics:{period}
 */
export function getAnalyticsCacheKey(tenantId: string, period: string): string {
  if (!tenantId || !tenantId.trim()) {
    throw new Error("tenantId is required for analytics caching");
  }
  return `tenant:${tenantId}:analytics:${period}`;
}

/**
 * Retrieves cached EngagementSummary for a given tenant and period from Redis.
 */
export async function getCachedAnalytics(
  tenantId: string,
  period: string
): Promise<EngagementSummary | null> {
  if (!redis) return null;

  try {
    const key = getAnalyticsCacheKey(tenantId, period);
    const cached = await redis.get<EngagementSummary | string>(key);
    if (!cached) return null;

    if (typeof cached === "string") {
      return JSON.parse(cached) as EngagementSummary;
    }
    return cached as EngagementSummary;
  } catch {
    return null;
  }
}

/**
 * Stores EngagementSummary in Redis with 1-hour TTL under tenant isolation.
 */
export async function setCachedAnalytics(
  tenantId: string,
  period: string,
  data: EngagementSummary
): Promise<void> {
  if (!redis) return;

  try {
    const key = getAnalyticsCacheKey(tenantId, period);
    await redis.set(key, JSON.stringify(data), { ex: ANALYTICS_CACHE_TTL });
  } catch {
    // Fail-open if Redis encounters connection issues
  }
}

/**
 * Invalidates all cached analytics periods for a tenant.
 */
export async function invalidateAnalyticsCache(tenantId: string): Promise<void> {
  if (!redis) return;

  try {
    const periods = ["7d", "30d", "90d"];
    const keys = periods.map((p) => getAnalyticsCacheKey(tenantId, p));
    await redis.del(...keys);
  } catch {
    // Fail-open
  }
}

