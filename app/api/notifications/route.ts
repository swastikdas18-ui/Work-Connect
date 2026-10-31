import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { AppNotification } from "@/types/database";

export async function GET(req: NextRequest) {
  try {
    return await withTenantContext(req, async (tenantId, db) => {
      const headerUserId = req.headers.get("x-user-id");
      let currentUserId = headerUserId;

      if (!currentUserId) {
        const {
          data: { user },
        } = await db.auth.getUser();
        currentUserId = user?.id || null;
      }

      if (!currentUserId) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }

      const { searchParams } = new URL(req.url);
      const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
      const cursor = searchParams.get("cursor");
      const unreadOnly = searchParams.get("unread_only") === "true";

      let query = db
        .from("notifications")
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
        .eq("tenant_id", tenantId)
        .eq("recipient_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.is("read_at", null);
      }

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const notifications = (data || []) as unknown as AppNotification[];

      return NextResponse.json({ notifications });
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    return await withTenantContext(req, async (tenantId, db) => {
      const headerUserId = req.headers.get("x-user-id");
      let currentUserId = headerUserId;

      if (!currentUserId) {
        const {
          data: { user },
        } = await db.auth.getUser();
        currentUserId = user?.id || null;
      }

      if (!currentUserId) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }

      const queryBuilder = db.from("notifications");
      const { data, error } = await (
        queryBuilder.update as unknown as (values: unknown) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => {
              is: (col3: string, val3: unknown) => {
                select: () => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
              };
            };
          };
        }
      )({ read_at: new Date().toISOString() })
        .eq("tenant_id", tenantId)
        .eq("recipient_id", currentUserId)
        .is("read_at", null)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: data?.length || 0 });
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
