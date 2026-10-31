import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, AppNotification } from "@/types/database";
import { withTenantContext } from "@/lib/tenant/context";
import {
  getNotificationChannelKey,
  dispatchNotification,
  getUnreadNotificationCount,
} from "@/lib/redis/notifications";
import { redis } from "@/lib/redis/client";
import { createAdminSupabaseClient } from "@/lib/db/client";

vi.mock("@/lib/redis/client", () => {
  return {
    redis: {
      publish: vi.fn(async () => 1),
    },
  };
});

vi.mock("@/lib/db/client", () => {
  return {
    createAdminSupabaseClient: vi.fn(),
  };
});

describe("Notification Center & Real-Time Alerts Multi-Tenant Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("strictly enforces Redis notification channels: tenant:{tenant_id}:notifications:{recipient_id}", () => {
    const tenantId = "tenant-alpha";
    const recipientId = "user-alice";

    const channel = getNotificationChannelKey(tenantId, recipientId);
    expect(channel).toBe("tenant:tenant-alpha:notifications:user-alice");

    expect(() => getNotificationChannelKey("", recipientId)).toThrow();
    expect(() => getNotificationChannelKey(tenantId, "")).toThrow();
  });

  it("verifies User A in Tenant 1 cannot access or view notifications belonging to Tenant 2 or User B", async () => {
    const tenant1 = "tenant-1";
    const tenant2 = "tenant-2";
    const userA = "user-a";
    const userB = "user-b";

    const filteredTenants: string[] = [];
    const filteredRecipients: string[] = [];

    const mockDb = {
      from: vi.fn().mockImplementation((table: string) => {
        expect(table).toBe("notifications");
        const chain: Record<string, unknown> = {};
        chain.select = vi.fn().mockImplementation(() => chain);
        chain.eq = vi.fn().mockImplementation((col: string, val: string) => {
          if (col === "tenant_id") filteredTenants.push(val);
          if (col === "recipient_id") filteredRecipients.push(val);
          return chain;
        });
        chain.order = vi.fn().mockImplementation(() => chain);
        chain.limit = vi.fn().mockImplementation(() => chain);
        chain.then = (resolve: (val: unknown) => unknown) => {
          const currentTenant = filteredTenants[filteredTenants.length - 1];
          const currentRecipient = filteredRecipients[filteredRecipients.length - 1];

          const isLegitimate = currentTenant === tenant1 && currentRecipient === userA;

          return Promise.resolve(
            resolve({
              data: isLegitimate
                ? [
                    {
                      id: "notif-1",
                      tenant_id: tenant1,
                      recipient_id: userA,
                      payload: { title: "Welcome" },
                    },
                  ]
                : [],
              error: null,
            })
          );
        };
        return chain;
      }),
    } as unknown as SupabaseClient<Database>;

    const reqUserA = new Request("http://localhost:3000/api/notifications", {
      headers: {
        "x-tenant-id": tenant1,
        "x-user-id": userA,
      },
    });

    await withTenantContext(
      reqUserA,
      async (tenantId, db) => {
        const { data } = await db
          .from("notifications")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("recipient_id", userA);

        const list = (data || []) as AppNotification[];
        expect(list).toHaveLength(1);
        expect(list[0].recipient_id).toBe(userA);
        expect(list[0].tenant_id).toBe(tenant1);
      },
      mockDb
    );

    // If User A attempts to target Tenant 2's data
    const reqCrossTenant = new Request("http://localhost:3000/api/notifications", {
      headers: {
        "x-tenant-id": tenant2,
        "x-user-id": userA,
      },
    });

    await withTenantContext(
      reqCrossTenant,
      async (tenantId, db) => {
        const { data } = await db
          .from("notifications")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("recipient_id", userB);

        const list = (data || []) as AppNotification[];
        expect(list).toHaveLength(0);
      },
      mockDb
    );
  });

  it("dispatches notification record to DB and publishes to scoped Redis channel", async () => {
    const tenantId = "tenant-gamma";
    const recipientId = "user-charlie";
    const actorId = "user-bob";

    const mockAdminDb = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "notif-99",
                tenant_id: tenantId,
                recipient_id: recipientId,
                actor_id: actorId,
                type: "post_comment",
                resource_id: "post-123",
                payload: { title: "New Comment", url: "/feed" },
                read_at: null,
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createAdminSupabaseClient).mockReturnValue(
      mockAdminDb as unknown as SupabaseClient<Database>
    );

    const result = await dispatchNotification(tenantId, {
      recipientId,
      actorId,
      type: "post_comment",
      resourceId: "post-123",
      payload: { title: "New Comment", url: "/feed" },
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("notif-99");

    // Verify Redis channel isolation
    expect(redis?.publish).toHaveBeenCalledWith(
      `tenant:${tenantId}:notifications:${recipientId}`,
      expect.stringContaining("New Comment")
    );
  });

  it("queries unread count scoped strictly to tenant and recipient", async () => {
    const mockAdminDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({
                count: 4,
                error: null,
              }),
            }),
          }),
        }),
      }),
    };

    vi.mocked(createAdminSupabaseClient).mockReturnValue(
      mockAdminDb as unknown as SupabaseClient<Database>
    );

    const count = await getUnreadNotificationCount("tenant-x", "user-y");
    expect(count).toBe(4);
  });
});

