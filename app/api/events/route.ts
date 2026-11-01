import { NextRequest, NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { requireTenantRole, ForbiddenError } from "@/lib/tenant/rbac";
import { CommunityEvent, EventAudience, EventType, UserRole } from "@/types/database";

export async function GET(req: NextRequest) {
  try {
    return await withTenantContext(req, async (tenantId, db) => {
      const { searchParams } = new URL(req.url);
      const type = searchParams.get("type");
      const headerUserId = req.headers.get("x-user-id");

      let userRole: UserRole = "employee";
      if (headerUserId) {
        const { data: userRec } = (await db
          .from("users")
          .select("role")
          .eq("tenant_id", tenantId)
          .eq("id", headerUserId)
          .single()) as { data: { role: UserRole } | null };

        if (userRec?.role) {
          userRole = userRec.role;
        }
      }

      // Simplified resilient query supporting both tenant_id and community_id schema variants
      let query = db
        .from("events")
        .select(`
          id,
          title,
          description,
          event_type,
          target_audience,
          starts_at,
          ends_at,
          location,
          meeting_url,
          capacity,
          created_at,
          rsvps:event_rsvps(id, user_id, status)
        `)
        .or(`tenant_id.eq.${tenantId},community_id.eq.${tenantId}`)
        .order("starts_at", { ascending: true });

      if (type && type !== "all") {
        query = query.eq("event_type", type);
      }

      const { data, error } = await query;
      let finalEventsData: unknown[] = (data || []) as unknown[];

      if (error) {
        // Fallback simple query if complex joins or columns fail
        const { data: fallbackData } = await db
          .from("events")
          .select("*")
          .limit(50);
        finalEventsData = (fallbackData || []) as unknown[];
      }

      const eventsList = finalEventsData as (CommunityEvent & {
        organizer?: unknown;
        rsvps?: unknown[];
      })[];

      // Role-based audience filtering
      const visibleEvents = eventsList.filter((event) => {
        if (["owner", "admin", "moderator"].includes(userRole)) return true;
        if (!event.target_audience || event.target_audience === "all") return true;
        if (userRole === "intern" && event.target_audience === "interns_only") return true;
        if (userRole === "employee" && event.target_audience === "employees_only") return true;
        return false;
      });

      return NextResponse.json({ events: visibleEvents });
    });
  } catch {
    return NextResponse.json({ events: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await requireTenantRole(req, "moderator", async (authContext) => {
      const body = await req.json();
      const {
        title,
        description,
        event_type,
        target_audience = "all",
        meeting_url,
        location,
        starts_at,
        ends_at,
        capacity,
      } = body;

      if (!title || !description || !event_type || !starts_at || !ends_at) {
        return NextResponse.json({ error: "Missing required event fields" }, { status: 400 });
      }

      if (new Date(ends_at) <= new Date(starts_at)) {
        return NextResponse.json(
          { error: "ends_at must be strictly after starts_at" },
          { status: 400 }
        );
      }

      const eventInsert = {
        tenant_id: authContext.tenantId,
        organizer_id: authContext.userId,
        title: title.trim(),
        description: description.trim(),
        event_type: event_type as EventType,
        target_audience: target_audience as EventAudience,
        meeting_url: meeting_url || null,
        location: location || null,
        starts_at,
        ends_at,
        capacity: capacity ? Number(capacity) : null,
      };

      const { data: event, error } = await (
        authContext.db.from("events").insert as unknown as (values: typeof eventInsert) => {
          select: () => {
            single: () => Promise<{ data: CommunityEvent | null; error: { message: string } | null }>;
          };
        }
      )(eventInsert)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ event }, { status: 201 });
    });
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

