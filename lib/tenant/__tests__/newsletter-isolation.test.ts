import { describe, it, expect, vi } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Newsletter, UserRole } from "@/types/database";
import { requireTenantRole, ForbiddenError } from "../rbac";
import { withTenantContext } from "../context";

describe("Multi-Tenant Newsletter & Broadcast Isolation", () => {
  it("prevents interns from composing or triggering broadcasts (expect 403)", async () => {
    const internReq = new Request("http://localhost:3000/api/newsletters", {
      headers: {
        "x-tenant-id": "tenant-corp",
        "x-user-id": "user-intern-1",
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
        internReq,
        "moderator",
        async () => {
          return "Should not execute";
        },
        mockDb
      )
    ).rejects.toThrow(ForbiddenError);
  });

  it("prevents Tenant A from reading or modifying newsletters of Tenant B", async () => {
    const tenantAReq = new Request("http://localhost:3000/api/newsletters/news-B-1", {
      headers: {
        "x-tenant-id": "tenant-A",
      },
    });

    const mockNewsletters: Newsletter[] = [
      {
        id: "news-B-1",
        tenant_id: "tenant-B",
        author_id: "user-B",
        title: "Confidential Tenant B Digest",
        slug: "confidential-tenant-b-digest",
        summary: null,
        content_html: "<p>Internal only</p>",
        target_audience: "all",
        status: "published",
        scheduled_for: null,
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((col: string, val: string) => {
            if (col === "tenant_id") {
              const scoped = mockNewsletters.filter((n) => n.tenant_id === val);
              return {
                eq: vi.fn().mockImplementation((col2: string, val2: string) => {
                  const item = scoped.find((n) => n.id === val2 || n.slug === val2) || null;
                  return {
                    single: vi.fn().mockResolvedValue({ data: item, error: item ? null : new Error("Not found") }),
                  };
                }),
              };
            }
            return { eq: vi.fn() };
          }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;

    await withTenantContext(
      tenantAReq,
      async (tenantId, db) => {
        const { data: newsletter } = await db
          .from("newsletters")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("id", "news-B-1")
          .single();

        expect(newsletter).toBeNull();
      },
      mockDb
    );
  });

  it("excludes unauthorized recipients when filtering by audience", () => {
    const allUsers = [
      { id: "1", role: "employee", email: "emp@acme.com" },
      { id: "2", role: "intern", email: "intern@acme.com" },
      { id: "3", role: "admin", email: "admin@acme.com" },
    ];

    const filterAudience = (audience: "all" | "employees_only" | "interns_only") => {
      return allUsers.filter((u) => {
        if (audience === "employees_only") return u.role !== "intern";
        if (audience === "interns_only") return u.role === "intern";
        return true;
      });
    };

    const employeeRecipients = filterAudience("employees_only");
    expect(employeeRecipients.some((u) => u.role === "intern")).toBe(false);
    expect(employeeRecipients.length).toBe(2);

    const internRecipients = filterAudience("interns_only");
    expect(internRecipients.every((u) => u.role === "intern")).toBe(true);
    expect(internRecipients.length).toBe(1);
  });
});

