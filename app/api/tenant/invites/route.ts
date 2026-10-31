import { NextResponse } from "next/server";
import { requireTenantRole, ForbiddenError } from "@/lib/tenant/rbac";
import { UserRole } from "@/types/database";

const ALLOWED_INVITE_ROLES: UserRole[] = ["admin", "moderator", "employee", "intern"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, role = "employee" } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    if (!ALLOWED_INVITE_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${ALLOWED_INVITE_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    return await requireTenantRole(request, "admin", async ({ tenantId, userId: actorId, db }) => {
      // 1. Generate cryptographically random URL-safe token
      const rawBytes = crypto.getRandomValues(new Uint8Array(24));
      const token = Array.from(rawBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // 2. Insert invite record
      const inviteInsert = {
        tenant_id: tenantId,
        email: email.toLowerCase().trim(),
        role: role as UserRole,
        token,
        invited_by: actorId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const { data: invite, error } = await (
        db.from("tenant_invites").insert as unknown as (values: typeof inviteInsert) => {
          select: () => {
            single: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        }
      )(inviteInsert)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const inviteLink = `/invite/${token}`;

      return NextResponse.json({
        success: true,
        invite,
        inviteLink,
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

export async function GET(request: Request) {
  try {
    return await requireTenantRole(request, "admin", async ({ tenantId, db }) => {
      const { data: invites, error } = await db
        .from("tenant_invites")
        .select(`
          id,
          email,
          role,
          token,
          expires_at,
          accepted_at,
          created_at,
          inviter:users!invited_by (
            full_name,
            email
          )
        `)
        .eq("tenant_id", tenantId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ invites: invites || [] });
    });
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

