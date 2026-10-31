import { redis } from "./client";
import { createAdminSupabaseClient } from "@/lib/db/client";
import { AppNotification, NotificationType } from "@/types/database";

export interface DispatchNotificationParams {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  resourceId: string;
  payload: {
    title: string;
    snippet?: string;
    url: string;
  };
}

/**
 * Returns the isolated Redis channel for recipient notifications:
 * Convention: tenant:{tenant_id}:notifications:{recipient_id}
 */
export function getNotificationChannelKey(tenantId: string, recipientId: string): string {
  if (!tenantId || !tenantId.trim()) {
    throw new Error("tenantId is required for notification channel");
  }
  if (!recipientId || !recipientId.trim()) {
    throw new Error("recipientId is required for notification channel");
  }
  return `tenant:${tenantId}:notifications:${recipientId}`;
}

/**
 * Records notification in PostgreSQL and publishes to Redis Pub/Sub for live delivery
 */
export async function dispatchNotification(
  tenantId: string,
  params: DispatchNotificationParams
): Promise<AppNotification | null> {
  const adminDb = createAdminSupabaseClient();

  const queryBuilder = adminDb.from("notifications");
  const { data, error } = (await (
    queryBuilder.insert as unknown as (values: unknown) => {
      select: (query: string) => {
        single: () => Promise<{ data: AppNotification | null; error: unknown }>;
      };
    }
  )({
    tenant_id: tenantId,
    recipient_id: params.recipientId,
    actor_id: params.actorId,
    type: params.type,
    resource_id: params.resourceId,
    payload: params.payload,
  })
    .select(
      `
      *,
      actor:users!actor_id (
        full_name,
        avatar_url,
        role
      )
    `
    )
    .single()) as { data: AppNotification | null; error: unknown };

  if (error || !data) {
    return null;
  }

  // Publish to Redis Pub/Sub for real-time delivery
  if (redis) {
    try {
      const channel = getNotificationChannelKey(tenantId, params.recipientId);
      await redis.publish(channel, JSON.stringify(data));
    } catch {
      // Fail-open: Notification is safely recorded in PostgreSQL even if Redis is unreachable
    }
  }

  return data;
}

/**
 * Returns unread notification count scoped to recipient and tenant
 */
export async function getUnreadNotificationCount(
  tenantId: string,
  recipientId: string
): Promise<number> {
  const adminDb = createAdminSupabaseClient();

  const { count, error } = await adminDb
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("recipient_id", recipientId)
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}
