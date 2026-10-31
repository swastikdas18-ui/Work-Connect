import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";
import { requireTenantRole, ForbiddenError } from "@/lib/tenant/rbac";
import { Newsletter } from "@/types/database";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: identifier } = await params;

    return await withTenantContext(request, async (tenantId, db) => {
      // Check if lookup is by UUID or by slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier
      );

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
        `)
        .eq("tenant_id", tenantId);

      if (isUuid) {
        query = query.eq("id", identifier);
      } else {
        query = query.eq("slug", identifier);
      }

      const { data: newsletter, error } = await query.single();

      if (error || !newsletter) {
        return NextResponse.json({ error: "Newsletter not found" }, { status: 404 });
      }

      return NextResponse.json({ newsletter });
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: newsletterId } = await params;
    const body = await request.json();

    return await requireTenantRole(request, "moderator", async ({ tenantId, db }) => {
      const updateData: Partial<Newsletter> = {
        updated_at: new Date().toISOString(),
      };

      if (body.title) updateData.title = body.title.trim();
      if (body.summary !== undefined) updateData.summary = body.summary;
      if (body.contentHtml) updateData.content_html = body.contentHtml;
      if (body.targetAudience) updateData.target_audience = body.targetAudience;
      if (body.status) {
        updateData.status = body.status;
        if (body.status === "published") {
          updateData.published_at = new Date().toISOString();
        }
      }

      const { data: updated, error } = await (
        db.from("newsletters").update as unknown as (values: typeof updateData) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => {
              select: () => {
                single: () => Promise<{ data: Newsletter | null; error: { message: string } | null }>;
              };
            };
          };
        }
      )(updateData)
        .eq("tenant_id", tenantId)
        .eq("id", newsletterId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, newsletter: updated });
    });
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: newsletterId } = await params;

    return await requireTenantRole(request, "admin", async ({ tenantId, db }) => {
      const { error } = await db
        .from("newsletters")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", newsletterId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Newsletter deleted" });
    });
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

