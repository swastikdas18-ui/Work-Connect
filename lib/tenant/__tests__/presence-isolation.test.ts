import { describe, it, expect, vi } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { getPresenceKey, getTypingChannelKey } from "@/lib/redis/presence";
import { withTenantContext } from "../context";

describe("Live Presence, Typing & Read Receipt Isolation", () => {
  it("formats presence key with strict tenant namespace", () => {
    const keyA = getPresenceKey("tenant-A", "user-1");
    const keyB = getPresenceKey("tenant-B", "user-1");

    expect(keyA).toBe("tenant:tenant-A:presence:user-1");
    expect(keyB).toBe("tenant:tenant-B:presence:user-1");
    expect(keyA).not.toBe(keyB);
  });

  it("formats typing channel with strict tenant namespace and never leaks across tenants", () => {
    const typingA = getTypingChannelKey("tenant-A", "general");
    const typingB = getTypingChannelKey("tenant-B", "general");

    expect(typingA).toBe("tenant:tenant-A:channel:general:typing");
    expect(typingB).toBe("tenant:tenant-B:channel:general:typing");
    expect(typingA).not.toBe(typingB);
  });

  it("strictly scopes channel read state queries to caller tenant and user ID", async () => {
    const req = new Request("http://localhost:3000/api/channels/general/read?userId=user-1", {
      headers: { "x-tenant-id": "tenant-A" },
    });

    const mockDb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "channel_read_states") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col1: string, val1: string) => {
                return {
                  eq: vi.fn().mockImplementation((col2: string, val2: string) => {
                    return {
                      eq: vi.fn().mockImplementation((col3: string, val3: string) => {
                        // Enforce tenant_id=tenant-A, channel_id=general, user_id=user-1
                        const matches =
                          val1 === "tenant-A" && val2 === "general" && val3 === "user-1";
                        return {
                          maybeSingle: vi.fn().mockResolvedValue({
                            data: matches
                              ? {
                                  tenant_id: "tenant-A",
                                  channel_id: "general",
                                  user_id: "user-1",
                                  last_read_at: "2026-10-31T12:00:00.000Z",
                                }
                              : null,
                          }),
                        };
                      }),
                    };
                  }),
                };
              }),
            }),
          };
        }
        if (table === "messages") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockResolvedValue({ count: 2, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient<Database>;

    await withTenantContext(
      req,
      async (tenantId, db) => {
        const { data: readState } = (await db
          .from("channel_read_states")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("channel_id", "general")
          .eq("user_id", "user-1")
          .maybeSingle()) as { data: { tenant_id: string; user_id: string } | null };

        expect(readState).not.toBeNull();
        expect(readState?.tenant_id).toBe("tenant-A");
        expect(readState?.user_id).toBe("user-1");
      },
      mockDb
    );
  });
});
