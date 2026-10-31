import { describe, it, expect, vi } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Post } from "@/types/database";
import { withTenantContext } from "../context";

describe("Community Feed Multi-Tenant Isolation", () => {
  it("prevents Tenant A from retrieving posts created in Tenant B", async () => {
    // Tenant A request
    const reqTenantA = new Request("http://localhost:3000/api/posts", {
      headers: { "x-tenant-id": "tenant-A" },
    });

    const mockPosts: Post[] = [
      {
        id: "post-1",
        tenant_id: "tenant-B",
        author_id: "user-B",
        content: "Secret post from Tenant B",
        category: "announcement",
        media_urls: [],
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((column: string, value: string) => {
            // Emulate Postgres Row-Level Security filter: WHERE tenant_id = current_tenant
            if (column === "tenant_id") {
              const filtered = mockPosts.filter((p) => p.tenant_id === value);
              return {
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: filtered, error: null }),
                }),
              };
            }
            return { order: vi.fn() };
          }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;

    const result = await withTenantContext(
      reqTenantA,
      async (tenantId, db) => {
        const { data } = await db
          .from("posts")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at")
          .limit(20);
        return data;
      },
      mockDb
    );

    // Tenant A query returns empty array because post-1 belongs to Tenant B
    expect(result).toEqual([]);
  });

  it("fails closed when attempting to react or comment across tenant boundaries", async () => {
    const crossTenantCommentReq = new Request("http://localhost:3000/api/posts/post-B/comments", {
      headers: { "x-tenant-id": "tenant-A" },
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockImplementation((comment: { tenant_id: string }) => {
          if (comment.tenant_id !== "tenant-A") {
            return Promise.reject(new Error("RLS violation: Cross-tenant operation denied"));
          }
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id: "c-1", ...comment }, error: null }),
            }),
          };
        }),
      }),
    } as unknown as SupabaseClient<Database>;

    await expect(
      withTenantContext(
        crossTenantCommentReq,
        async (tenantId, db) => {
          // Attempting to forge comment for tenant-B while context is tenant-A
          const forgedComment = {
            tenant_id: "tenant-B",
            post_id: "post-B",
            author_id: "user-A",
            content: "Cross tenant comment",
          };
          return (db.from("post_comments").insert as unknown as (c: typeof forgedComment) => Promise<unknown>)(
            forgedComment
          );
        },
        mockDb
      )
    ).rejects.toThrow("RLS violation: Cross-tenant operation denied");
  });

  it("rejects media paths injected outside the tenant storage namespace", () => {
    const tenantId = "tenant-A";
    const validateStoragePath = (requestedPath: string, activeTenantId: string): boolean => {
      // Must match {tenant_id}/posts/...
      const parts = requestedPath.split("/");
      return parts[0] === activeTenantId && parts[1] === "posts";
    };

    const validPath = `${tenantId}/posts/uuid_photo.jpg`;
    const invalidPathTenantB = "tenant-B/posts/uuid_photo.jpg";
    const traversalPath = "../tenant-B/posts/uuid_photo.jpg";

    expect(validateStoragePath(validPath, tenantId)).toBe(true);
    expect(validateStoragePath(invalidPathTenantB, tenantId)).toBe(false);
    expect(validateStoragePath(traversalPath, tenantId)).toBe(false);
  });
});

