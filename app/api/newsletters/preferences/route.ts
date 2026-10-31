import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { NewsletterSubscriber } from "@/types/database";

export async function GET(request: Request) {
  try {
    return await withTenantContext(request, async (tenantId, db) => {
      const headerUserId = request.headers.get("x-user-id");
      let currentUserId = headerUserId;

      if (!currentUserId) {
        const {
          data: { user },
        } = await db.auth.getUser();
        currentUserId = user?.id || null;
      }

      if (!currentUserId) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
      }

      const { data: subscriber } = await db
        .from("newsletter_subscribers")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      return NextResponse.json({
        preferences: subscriber || {
          receives_weekly_digest: true,
          receives_urgent_broadcasts: true,
        },
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { receivesWeeklyDigest, receivesUrgentBroadcasts } = body;

    return await withTenantContext(request, async (tenantId, db) => {
      const headerUserId = request.headers.get("x-user-id");
      let currentUserId = headerUserId;

      if (!currentUserId) {
        const {
          data: { user },
        } = await db.auth.getUser();
        currentUserId = user?.id || null;
      }

      if (!currentUserId) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
      }

      // Fetch user email if not in subscriber record
      const { data: userRec } = (await db
        .from("users")
        .select("email")
        .eq("tenant_id", tenantId)
        .eq("id", currentUserId)
        .single()) as { data: { email: string } | null };

      const userEmail = userRec?.email || "";

      const upsertPayload = {
        tenant_id: tenantId,
        user_id: currentUserId,
        email: userEmail,
        receives_weekly_digest: receivesWeeklyDigest ?? true,
        receives_urgent_broadcasts: receivesUrgentBroadcasts ?? true,
      };

      const { data: updated, error } = await (
        db.from("newsletter_subscribers").upsert as unknown as (values: typeof upsertPayload) => {
          select: () => {
            single: () => Promise<{ data: NewsletterSubscriber | null; error: { message: string } | null }>;
          };
        }
      )(upsertPayload)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, preferences: updated });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

