import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { requireTenantRole, ForbiddenError, hasMinimumRole } from "@/lib/tenant/rbac";
import { NewsletterAudience, NewsletterStatus, Newsletter, UserRole } from "@/types/database";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const offset = (page - 1) * limit;

    return await withTenantContext(request, async (tenantId, db) => {
      // Check caller's role to determine whether draft newsletters can be returned
      const headerUserId = request.headers.get("x-user-id");
      let callerRole: UserRole = "employee";

      if (headerUserId) {
        const { data: userRecord } = (await db
          .from("users")
          .select("role")
          .eq("tenant_id", tenantId)
          .eq("id", headerUserId)
          .single()) as { data: { role: UserRole } | null };

        if (userRecord?.role) {
          callerRole = userRecord.role;
        }
      }

      const isPrivileged = hasMinimumRole(callerRole, "moderator");

      let query = db
        .from("newsletters")
        .select(`
          *,
          author:users!author_id (
            id,
            full_name,
            avatar_url,
            role
          )
        `, { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!isPrivileged) {
        query = query.eq("status", "published");
      }

      const { data: newsletters, count, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        newsletters: newsletters || [],
        totalCount: count || 0,
        page,
        limit,
      });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      summary,
      contentHtml,
      targetAudience = "all",
      status = "draft",
      scheduledFor = null,
    } = body;

    if (!title || !title.trim() || !contentHtml || !contentHtml.trim()) {
      return NextResponse.json(
        { error: "Title and contentHtml are required" },
        { status: 400 }
      );
    }

    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return await requireTenantRole(request, "moderator", async ({ tenantId, userId, db }) => {
      const newsletterInsert = {
        tenant_id: tenantId,
        author_id: userId,
        title: title.trim(),
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        summary: summary ? summary.trim() : null,
        content_html: contentHtml,
        target_audience: targetAudience as NewsletterAudience,
        status: status as NewsletterStatus,
        scheduled_for: scheduledFor,
        published_at: status === "published" ? new Date().toISOString() : null,
      };

      const { data: newsletter, error } = await (
        db.from("newsletters").insert as unknown as (values: typeof newsletterInsert) => {
          select: () => {
            single: () => Promise<{ data: Newsletter | null; error: { message: string } | null }>;
          };
        }
      )(newsletterInsert)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, newsletter }, { status: 201 });
    });
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

