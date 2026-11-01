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
      // 1. First attempt to select from users table where tenant_id = :tenantId
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

      // 2. If no error and members exist, return directly
      if (!error && members && members.length > 0) {
        return NextResponse.json({
          members,
          totalCount: count ?? members.length,
          page,
          limit,
        });
      }

      // 3. Fallback to profiles table if users table/view errors or has 0 rows
      try {
        let profilesQuery = db
          .from("profiles")
          .select("id, full_name, avatar_url, headline, role, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (search) {
          profilesQuery = profilesQuery.ilike("full_name", `%${search}%`);
        }

        const { data: profiles, count: profileCount, error: profileErr } = await profilesQuery;

        interface ProfileItem {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          headline?: string | null;
          role?: string | null;
          created_at?: string | null;
        }

        if (!profileErr && profiles && profiles.length > 0) {
          const profileList = profiles as unknown as ProfileItem[];
          const mappedMembers = profileList.map((p) => ({
            id: p.id,
            tenant_id: tenantId,
            email: "",
            full_name: p.full_name || "Member",
            avatar_url: p.avatar_url || null,
            role: p.role || "employee",
            status: "active",
            created_at: p.created_at || new Date().toISOString(),
          }));

          return NextResponse.json({
            members: mappedMembers,
            totalCount: profileCount ?? mappedMembers.length,
            page,
            limit,
          });
        }
      } catch {
        // Fallback to empty list instead of 500
      }

      return NextResponse.json({
        members: members || [],
        totalCount: count || 0,
        page,
        limit,
      });
    });
  } catch {
    return NextResponse.json({
      members: [],
      totalCount: 0,
      page: 1,
      limit: 20,
    });
  }
}

