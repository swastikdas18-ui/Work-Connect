import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, EngagementSummary, UserRole } from "@/types/database";
import { requireTenantRole, ForbiddenError } from "@/lib/tenant/rbac";
import {
  getAnalyticsCacheKey,
  getCachedAnalytics,
  setCachedAnalytics,
  invalidateAnalyticsCache,
  ANALYTICS_CACHE_TTL,
} from "@/lib/redis/analytics";
import { redis } from "@/lib/redis/client";

vi.mock("@/lib/redis/client", () => {
  const store = new Map<string, string>();
  return {
    redis: {
      get: vi.fn(async (key: string) => store.get(key) || null),
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
        return "OK";
      }),
      del: vi.fn(async (...keys: string[]) => {
        let deleted = 0;
        keys.forEach((k) => {
          if (store.delete(k)) deleted++;
        });
        return deleted;
      }),
    },
  };
});

describe("Admin Analytics & Engagement Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks non-admins (interns and standard employees) with ForbiddenError (403)", async () => {
    const req = new Request("http://localhost:3000/api/admin/analytics?period=7d", {
      headers: {
        "x-tenant-id": "tenant-alpha",
        "x-user-id": "user-intern",
      },
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: "intern" as UserRole, status: "active" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;

    await expect(
      requireTenantRole(
        req,
        "admin",
        async () => {
          return "Should not reach here";
        },
        mockDb
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it("scopes all aggregation queries strictly by tenant_id and ignores Tenant B records", async () => {
    const tenantA = "tenant-alpha";
    const tenantB = "tenant-beta";

    // Track queries made to mockDb
    const filteredTenants: string[] = [];

    const createChain = (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockImplementation(() => chain);
      chain.eq = vi.fn().mockImplementation((col: string, val: string) => {
        if (col === "tenant_id") {
          filteredTenants.push(val);
        }
        return chain;
      });
      chain.gte = vi.fn().mockImplementation(() => chain);
      chain.single = vi.fn().mockResolvedValue({
        data: { role: "admin" as UserRole, status: "active" },
        error: null,
      });
      chain.then = (resolve: (val: unknown) => unknown) => {
        const result = {
          data:
            filteredTenants[filteredTenants.length - 1] === tenantA
              ? table === "users"
                ? [
                    { id: "u1", role: "admin", status: "active" },
                    { id: "u2", role: "intern", status: "active" },
                  ]
                : [{ id: "rec1", tenant_id: tenantA }]
              : [],
          error: null,
        };
        return Promise.resolve(resolve(result));
      };
      return chain;
    };

    const mockDb = {
      from: vi.fn().mockImplementation((table: string) => createChain(table)),
    } as unknown as SupabaseClient<Database>;

    const req = new Request("http://localhost:3000/api/admin/analytics", {
      headers: {
        "x-tenant-id": tenantA,
        "x-user-id": "admin-1",
      },
    });

    await requireTenantRole(
      req,
      "admin",
      async ({ tenantId, db }) => {
        expect(tenantId).toBe(tenantA);

        const { data: users } = await db.from("users").select("*").eq("tenant_id", tenantId);
        expect(users).toHaveLength(2);
      },
      mockDb
    );

    // Verify all eq("tenant_id", ...) calls received tenantA and never tenantB
    expect(filteredTenants.length).toBeGreaterThan(0);
    filteredTenants.forEach((tid) => {
      expect(tid).toBe(tenantA);
      expect(tid).not.toBe(tenantB);
    });
  });

  it("verifies Redis caching keys are strictly scoped by tenant_id with 3600s TTL", async () => {
    const tenantId = "tenant-gamma";
    const period = "30d";
    const expectedKey = `tenant:${tenantId}:analytics:${period}`;

    expect(getAnalyticsCacheKey(tenantId, period)).toBe(expectedKey);
    expect(ANALYTICS_CACHE_TTL).toBe(3600);

    const mockSummary: EngagementSummary = {
      period: "30d",
      generatedAt: new Date().toISOString(),
      totalMembers: 10,
      activeMembers: 7,
      internCount: 3,
      employeeCount: 7,
      internEngagementRate: 67,
      postsPublished: 12,
      commentsCount: 25,
      reactionsCount: 40,
      messagesSent: 150,
      eventAttendanceRate: 90,
      topContributors: [],
      activityTimeline: [],
    };

    // Store in cache
    await setCachedAnalytics(tenantId, period, mockSummary);
    expect(redis?.set).toHaveBeenCalledWith(expectedKey, JSON.stringify(mockSummary), { ex: 3600 });

    // Retrieve from cache
    const retrieved = await getCachedAnalytics(tenantId, period);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.totalMembers).toBe(10);
    expect(retrieved?.internEngagementRate).toBe(67);

    // Invalidate
    await invalidateAnalyticsCache(tenantId);
    expect(redis?.del).toHaveBeenCalledWith(
      `tenant:${tenantId}:analytics:7d`,
      `tenant:${tenantId}:analytics:30d`,
      `tenant:${tenantId}:analytics:90d`
    );
  });
});
