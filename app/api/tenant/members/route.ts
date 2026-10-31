import { NextResponse } from "next/server";
import { withTenantContext } from "@/lib/tenant/context";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const offset = (page - 1) * limit;
    const search = url.searchParams.get("search")?.trim();
    const roleFilter = url.searchParams.get("role");

    return await withTenantContext(request, async (tenantId, db) => {
      let query = db
        .from("users")
        .select("id, tenant_id, email, full_name, avatar_url, role, status, created_at", {
          count: "exact",
        })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (roleFilter && roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: members, count, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        members: members || [],
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

