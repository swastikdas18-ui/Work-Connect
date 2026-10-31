import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { EventRsvp, RsvpStatus } from "@/types/database";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const body = await req.json().catch(() => ({}));
    const requestedStatus: RsvpStatus = body.status || "attending";
    const headerUserId = req.headers.get("x-user-id");

    return await withTenantContext(req, async (tenantId, db) => {
      let finalUserId = headerUserId;
      if (!finalUserId) {
        const {
          data: { user },
        } = await db.auth.getUser();
        finalUserId = user?.id || null;
      }

      if (!finalUserId) {
        return NextResponse.json({ error: "User authentication required" }, { status: 401 });
      }

      // 1. Fetch event capacity
      const { data: event, error: eventErr } = (await db
        .from("events")
        .select("capacity")
        .eq("tenant_id", tenantId)
        .eq("id", eventId)
        .single()) as { data: { capacity: number | null } | null; error: unknown };

      if (eventErr || !event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      let finalStatus: RsvpStatus = requestedStatus;

      // 2. Compute waitlist transition if capped
      if (requestedStatus === "attending" && event.capacity) {
        const { count } = await db
          .from("event_rsvps")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("event_id", eventId)
          .eq("status", "attending");

        if ((count || 0) >= event.capacity) {
          finalStatus = "waitlisted";
        }
      }

      // 3. Upsert RSVP
      const rsvpPayload = {
        tenant_id: tenantId,
        event_id: eventId,
        user_id: finalUserId,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      };

      const { data: rsvp, error } = await (
        db.from("event_rsvps").upsert as unknown as (values: typeof rsvpPayload) => {
          select: () => {
            single: () => Promise<{ data: EventRsvp | null; error: { message: string } | null }>;
          };
        }
      )(rsvpPayload)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ rsvp });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

