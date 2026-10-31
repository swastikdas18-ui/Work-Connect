import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;

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
      const { data, error } = (await (
        queryBuilder.update as unknown as (values: unknown) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => {
              eq: (col3: string, val3: string) => {
                select: () => {
                  single: () => Promise<{ data: unknown | null; error: { message: string } | null }>;
                };
              };
            };
          };
        }
      )({ read_at: new Date().toISOString() })
        .eq("tenant_id", tenantId)
        .eq("id", notificationId)
        .eq("recipient_id", currentUserId)
        .select()
        .single()) as { data: unknown | null; error: { message: string } | null };

      if (error || !data) {
        return NextResponse.json(
          { error: "Notification not found or unauthorized" },
          { status: 404 }
        );
      }

      return NextResponse.json({ notification: data });
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
