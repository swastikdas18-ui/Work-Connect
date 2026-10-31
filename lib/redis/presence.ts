import { redis } from "./client";
import { PresenceStatus } from "@/types/database";

export interface PresenceRecord {
  userId: string;
  status: PresenceStatus;
  lastSeen: number;
}

export interface TypingPayload {
  userId: string;
  name: string;
  isTyping: boolean;
}

/**
 * Returns presence key namespace: tenant:{tenant_id}:presence:{user_id}
 */
export function getPresenceKey(tenantId: string, userId: string): string {
  if (!tenantId || !userId) {
    throw new Error("tenantId and userId are required for presence key");
  }
  return `tenant:${tenantId}:presence:${userId}`;
}

/**
 * Returns typing pub/sub channel: tenant:{tenant_id}:channel:{channel_id}:typing
 */
export function getTypingChannelKey(tenantId: string, channelId: string): string {
  if (!tenantId || !channelId) {
    throw new Error("tenantId and channelId are required for typing channel key");
  }
  return `tenant:${tenantId}:channel:${channelId}:typing`;
}

/**
 * Updates user presence heartbeat with 45-second TTL in Redis
 */
export async function heartbeat(
  tenantId: string,
  userId: string,
  status: PresenceStatus = "online"
): Promise<void> {
  const key = getPresenceKey(tenantId, userId);
  const payload: PresenceRecord = {
    userId,
    status,
    lastSeen: Date.now(),
  };

  if (redis) {
    // Set presence value with 45 seconds TTL
    await redis.set(key, JSON.stringify(payload), { ex: 45 });
  }
}

/**
 * Fetches online user IDs for a given tenant
 */
export async function getOnlineUsers(tenantId: string): Promise<PresenceRecord[]> {
  if (!redis) {
    return [];
  }

  try {
    const pattern = `tenant:${tenantId}:presence:*`;
    const keys = await redis.keys(pattern);

    if (!keys || keys.length === 0) {
      return [];
    }

    const records: PresenceRecord[] = [];
    for (const key of keys) {
      const data = await redis.get<string | PresenceRecord>(key);
      if (data) {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        records.push(parsed);
      }
    }
    return records;
  } catch {
    return [];
  }
}

/**
 * Dispatches an ephemeral typing indicator event to Redis Pub/Sub
 */
export async function dispatchTyping(
  tenantId: string,
  channelId: string,
  payload: TypingPayload
): Promise<number | null> {
  const channelKey = getTypingChannelKey(tenantId, channelId);

  if (!redis) {
    return null;
  }

  return redis.publish(channelKey, JSON.stringify(payload));
}

