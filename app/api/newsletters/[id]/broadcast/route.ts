import { NextResponse } from "next/server";
import { requireTenantRole, ForbiddenError } from "@/lib/tenant/rbac";
import { publishTenantMessage } from "@/lib/redis/client";
import { Newsletter, NewsletterBroadcastRun } from "@/types/database";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: newsletterId } = await params;

    return await requireTenantRole(request, "admin", async ({ tenantId, db }) => {
      // 1. Fetch newsletter to verify existence in this tenant
      const { data: newsletter, error: fetchErr } = (await db
        .from("newsletters")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", newsletterId)
        .single()) as { data: Newsletter | null; error: unknown };

      if (fetchErr || !newsletter) {
        return NextResponse.json({ error: "Newsletter not found" }, { status: 404 });
      }

      // 2. Mark newsletter as published
      await (
        db.from("newsletters").update as unknown as (values: {
          status: string;
          published_at: string;
        }) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => Promise<unknown>;
          };
        }
      )({
        status: "published",
        published_at: new Date().toISOString(),
      })
        .eq("tenant_id", tenantId)
        .eq("id", newsletterId);

      // 3. Query target audience recipients according to preferences
      let usersQuery = db
        .from("users")
        .select("id, email, role")
        .eq("tenant_id", tenantId)
        .eq("status", "active");

      if (newsletter.target_audience === "employees_only") {
        usersQuery = usersQuery.in("role", ["employee", "moderator", "admin", "owner"]);
      } else if (newsletter.target_audience === "interns_only") {
        usersQuery = usersQuery.eq("role", "intern");
      }

      const { data: targetUsers } = await usersQuery;
      const recipientCount = targetUsers?.length || 0;

      // 4. Log entry in newsletter_broadcast_runs
      const broadcastInsert = {
        tenant_id: tenantId,
        newsletter_id: newsletterId,
        recipient_count: recipientCount,
        status: "completed" as const,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      const { data: runRecord } = await (
        db.from("newsletter_broadcast_runs").insert as unknown as (values: typeof broadcastInsert) => {
          select: () => {
            single: () => Promise<{ data: NewsletterBroadcastRun | null; error: unknown }>;
          };
        }
      )(broadcastInsert)
        .select()
        .single();

      // 5. Dispatch notification payload via Redis Pub/Sub to tenant notification channel
      // Convention: tenant:{tenant_id}:channel:notifications
      const notificationPayload = {
        type: "newsletter_broadcast",
        tenantId,
        newsletterId: newsletter.id,
        title: newsletter.title,
        slug: newsletter.slug,
        summary: newsletter.summary,
        audience: newsletter.target_audience,
        broadcastAt: new Date().toISOString(),
      };

      await publishTenantMessage(tenantId, "notifications", notificationPayload).catch(() => null);

      return NextResponse.json({
        success: true,
        message: "Newsletter broadcast initiated successfully",
        recipientCount,
        run: runRecord,
      });
    });
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

