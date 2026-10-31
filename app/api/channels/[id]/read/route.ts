import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params;
    const body = await request.json().catch(() => ({}));
    const { userId, lastReadMessageId } = body;

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    return await withTenantContext(request, async (tenantId, db) => {
      let finalUserId = userId;
      if (!finalUserId) {
        const {
          data: { user },
        } = await db.auth.getUser();
        finalUserId = user?.id;
      }

      if (!finalUserId) {
        return NextResponse.json({ error: "User identity required" }, { status: 401 });
      }

      const now = new Date().toISOString();

      // Upsert read state in channel_read_states
      const upsertPayload = {
        tenant_id: tenantId,
        channel_id: channelId,
        user_id: finalUserId,
        last_read_message_id: lastReadMessageId || null,
        last_read_at: now,
      };

      await (
        db.from("channel_read_states").upsert as unknown as (values: typeof upsertPayload) => {
          select: () => Promise<unknown>;
        }
      )(upsertPayload).select();

      // Query unread count for this channel after last_read_at
      const { count: unreadCount, error: countErr } = await db
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("channel_id", channelId)
        .gt("created_at", now);

      if (countErr) {
        return NextResponse.json({ error: countErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        channelId,
        lastReadAt: now,
        unreadCount: unreadCount || 0,
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    return await withTenantContext(request, async (tenantId, db) => {
      let finalUserId = userId || null;
      if (!finalUserId) {
        const {
          data: { user },
        } = await db.auth.getUser();
        finalUserId = user?.id || null;
      }

      if (!finalUserId) {
        return NextResponse.json({ error: "User identity required" }, { status: 401 });
      }

      const { data: readState } = (await db
        .from("channel_read_states")
        .select("last_read_at, last_read_message_id")
        .eq("tenant_id", tenantId)
        .eq("channel_id", channelId)
        .eq("user_id", finalUserId)
        .maybeSingle()) as { data: { last_read_at: string; last_read_message_id: string | null } | null };

      const lastReadAt = readState?.last_read_at || new Date(0).toISOString();

      const { count: unreadCount } = await db
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("channel_id", channelId)
        .gt("created_at", lastReadAt);

      return NextResponse.json({
        channelId,
        unreadCount: unreadCount || 0,
        lastReadAt: readState?.last_read_at || null,
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
