import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Lazily initialize Redis client if environment variables are provided
export const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

/**
 * Returns the tenant-isolated Redis channel namespace
 * Convention: tenant:{tenant_id}:channel:{channel_id}
 */
export function getTenantChannelKey(tenantId: string, channelId: string): string {
  if (!tenantId || !tenantId.trim()) {
    throw new Error("Cannot generate Redis key without a valid tenant_id");
  }
  if (!channelId || !channelId.trim()) {
    throw new Error("Cannot generate Redis key without a valid channel_id");
  }
  return `tenant:${tenantId}:channel:${channelId}`;
}

/**
 * Publishes a message payload to Upstash Redis under tenant isolation
 */
export async function publishTenantMessage<T>(
  tenantId: string,
  channelId: string,
  payload: T
): Promise<number | null> {
  const channelKey = getTenantChannelKey(tenantId, channelId);

  if (!redis) {
    // In local development/test environments without Redis configured, log cleanly
    return null;
  }

  return redis.publish(channelKey, JSON.stringify(payload));
}

