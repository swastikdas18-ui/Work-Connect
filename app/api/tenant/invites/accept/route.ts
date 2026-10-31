import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/db/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, fullName, password } = body;

    if (!token) {
      return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
    }

    const adminDb = createAdminSupabaseClient();

    // 1. Validate invite token exists, not expired, and not already accepted
    const { data: invite, error: inviteErr } = (await adminDb
      .from("tenant_invites")
      .select("*, tenant:tenants!tenant_id(id, name, slug)")
      .eq("token", token)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single()) as {
      data: {
        id: string;
        tenant_id: string;
        email: string;
        role: "admin" | "moderator" | "employee" | "intern";
        tenant?: { id: string; name: string; slug: string };
      } | null;
      error: unknown;
    };

    if (inviteErr || !invite) {
      return NextResponse.json(
        { error: "Invalid, expired, or previously redeemed invitation token" },
        { status: 400 }
      );
    }

    // 2. Provision / retrieve user in Supabase Auth if password provided
    let authUserId: string;

    if (password) {
      const { data: authData, error: authErr } = await adminDb.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || invite.email.split("@")[0],
          tenant_id: invite.tenant_id,
        },
        app_metadata: {
          tenant_id: invite.tenant_id,
          role: invite.role,
        },
      });

      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 400 });
      }
      authUserId = authData.user.id;
    } else {
      authUserId = crypto.randomUUID();
    }

    // 3. Upsert user record into tenant users table
    const userPayload = {
      id: authUserId,
      tenant_id: invite.tenant_id,
      email: invite.email,
      full_name: fullName || invite.email.split("@")[0],
      role: invite.role,
      status: "active" as const,
    };

    const { error: userErr } = await (
      adminDb.from("users").upsert as unknown as (values: typeof userPayload) => Promise<{ error: { message: string } | null }>
    )(userPayload);

    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }

    // 4. Mark invitation as accepted
    await (
      adminDb.from("tenant_invites").update as unknown as (values: { accepted_at: string }) => {
        eq: (col: string, val: string) => Promise<unknown>;
      }
    )({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return NextResponse.json({
      success: true,
      message: "Invite accepted successfully",
      tenantId: invite.tenant_id,
      tenant: invite.tenant,
      role: invite.role,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
