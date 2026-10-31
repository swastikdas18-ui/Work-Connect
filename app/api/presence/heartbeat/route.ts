import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { heartbeat, getOnlineUsers } from "@/lib/redis/presence";
import { PresenceStatus } from "@/types/database";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { status = "online", userId } = body;

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

      await heartbeat(tenantId, finalUserId, status as PresenceStatus);

      return NextResponse.json({ success: true });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    return await withTenantContext(request, async (tenantId) => {
      const onlineUsers = await getOnlineUsers(tenantId);
      return NextResponse.json({ onlineUsers });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

