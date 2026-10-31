import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { generateIcsFile } from "@/lib/calendar/sync";
import { CommunityEvent } from "@/types/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    return await withTenantContext(req, async (tenantId, db) => {
      const { data: event, error } = (await db
        .from("events")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", eventId)
        .single()) as { data: CommunityEvent | null; error: unknown };

      if (error || !event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      const icsContent = generateIcsFile({
        title: event.title,
        description: event.description,
        location: event.location,
        meetingUrl: event.meeting_url,
        startsAt: event.starts_at,
        endsAt: event.ends_at,
      });

      return new Response(icsContent, {
        status: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="${event.title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")}.ics"`,
        },
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

