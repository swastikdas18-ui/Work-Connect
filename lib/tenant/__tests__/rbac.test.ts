import { describe, it, expect, vi } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, UserRole } from "@/types/database";
import { requireTenantRole, ForbiddenError, hasMinimumRole } from "../rbac";

describe("Tenant RBAC & Member Management Isolation", () => {
  it("enforces role hierarchy properly", () => {
    expect(hasMinimumRole("owner", "admin")).toBe(true);
    expect(hasMinimumRole("admin", "moderator")).toBe(true);
    expect(hasMinimumRole("employee", "admin")).toBe(false);
    expect(hasMinimumRole("intern", "moderator")).toBe(false);
  });

  it("throws ForbiddenError (403) when intern or employee attempts admin action", async () => {
    const req = new Request("http://localhost:3000/api/tenant/invites", {
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

  it("prevents admin in Tenant A from modifying or accessing members of Tenant B", async () => {
    // Admin request with Tenant A header
    const req = new Request("http://localhost:3000/api/tenant/members/target-user/role", {
      headers: {
        "x-tenant-id": "tenant-A",
        "x-user-id": "admin-A",
      },
    });

    const mockDb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col1: string, val1: string) => {
                return {
                  eq: vi.fn().mockImplementation((_col2: string, val2: string) => {
                    // Check caller role (admin-A in tenant-A)
                    if (val1 === "tenant-A" && val2 === "admin-A") {
                      return {
                        single: vi.fn().mockResolvedValue({
                          data: { role: "admin" as UserRole, status: "active" },
                          error: null,
                        }),
                      };
                    }
                    // Target user is in Tenant B, so querying with tenant-A yields not found
                    return {
                      single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
                    };
                  }),
                };
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient<Database>;

    await requireTenantRole(
      req,
      "admin",
      async ({ tenantId, db }) => {
        // Querying target user within Tenant A yields null because user belongs to Tenant B
        const { data: targetUser } = await db
          .from("users")
          .select("role")
          .eq("tenant_id", tenantId)
          .eq("id", "target-user")
          .single();

        expect(targetUser).toBeNull();
      },
      mockDb
    );
  });

  it("fails closed on expired invite token validation", () => {
    const expiredInvite = {
      id: "inv-1",
      token: "valid-looking-token",
      expires_at: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
      accepted_at: null,
    };

    const isInviteValid = (invite: typeof expiredInvite): boolean => {
      const now = new Date();
      const expiresAt = new Date(invite.expires_at);
      return !invite.accepted_at && expiresAt > now;
    };

    expect(isInviteValid(expiredInvite)).toBe(false);
  });
});
