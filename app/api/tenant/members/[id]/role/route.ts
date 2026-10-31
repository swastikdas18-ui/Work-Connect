import { NextResponse } from "next/server";
import { requireTenantRole, ForbiddenError } from "@/lib/tenant/rbac";
import { UserRole } from "@/types/database";

const ALLOWED_TARGET_ROLES: UserRole[] = ["admin", "moderator", "employee", "intern"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const body = await request.json();
    const { role: newRole } = body;

    if (!newRole || !ALLOWED_TARGET_ROLES.includes(newRole as UserRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${ALLOWED_TARGET_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    return await requireTenantRole(request, "admin", async ({ tenantId, userId: actorId, userRole: actorRole, db }) => {
      // 1. Prevent self-demotion or self-modification via this endpoint
      if (actorId === targetUserId) {
        return NextResponse.json(
          { error: "Forbidden: You cannot modify your own role" },
          { status: 400 }
        );
      }

      // 2. Fetch target user to check permissions
      const { data: targetUser, error: fetchErr } = (await db
        .from("users")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("id", targetUserId)
        .single()) as { data: { role: UserRole } | null; error: unknown };

      if (fetchErr || !targetUser) {
        return NextResponse.json({ error: "User not found in tenant" }, { status: 404 });
      }

      // 3. Only 'owner' can modify or reassign an 'owner'
      if (targetUser.role === "owner" && actorRole !== "owner") {
        return NextResponse.json(
          { error: "Forbidden: Only tenant owners can modify an owner's role" },
          { status: 403 }
        );
      }

      // 4. Update role
      const { data: updatedUser, error: updateErr } = await (
        db.from("users").update as unknown as (values: { role: UserRole }) => {
          eq: (col: string, val: string) => {
            eq: (col2: string, val2: string) => {
              select: () => {
                single: () => Promise<{ data: unknown; error: { message: string } | null }>;
              };
            };
          };
        }
      )({ role: newRole as UserRole })
        .eq("tenant_id", tenantId)
        .eq("id", targetUserId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, member: updatedUser });
    });
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
