import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { dispatchTyping } from "@/lib/redis/presence";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params;
    const body = await request.json();
    const { userId, name, isTyping } = body;

    if (!channelId || !userId) {
      return NextResponse.json({ error: "channelId and userId required" }, { status: 400 });
    }

    return await withTenantContext(request, async (tenantId) => {
      // Dispatches typing event strictly to the tenant's Redis channel without writing to PostgreSQL
      await dispatchTyping(tenantId, channelId, {
        userId,
        name: name || "Member",
        isTyping: Boolean(isTyping),
      });

      return NextResponse.json({ success: true });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

