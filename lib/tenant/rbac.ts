import { SupabaseClient } from "@supabase/supabase-js";
import { Database, UserRole } from "@/types/database";
import { withTenantContext } from "./context";

export class ForbiddenError extends Error {
  public statusCode = 403;
  constructor(message: string = "Forbidden: Insufficient tenant permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  moderator: 2,
  employee: 1,
  intern: 1,
};

export interface TenantAuthContext {
  tenantId: string;
  userId: string;
  userRole: UserRole;
  db: SupabaseClient<Database>;
}

/**
 * Checks whether userRole meets or exceeds the required minRole
 */
export function hasMinimumRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Resolves current user's role in the tenant and verifies that it satisfies minRole.
 * Throws ForbiddenError (403) if insufficient.
 */
export async function requireTenantRole<T>(
  req: Request,
  minRole: UserRole,
  handler: (auth: TenantAuthContext) => Promise<T>,
  customDb?: SupabaseClient<Database>
): Promise<T> {
  return withTenantContext(
    req,
    async (tenantId, db) => {
      // 1. Resolve active user ID from session or header
      const headerUserId = req.headers.get("x-user-id");
      let currentUserId = headerUserId;

      if (!currentUserId) {
        const {
          data: { user },
        } = await db.auth.getUser();
        currentUserId = user?.id || null;
      }

      if (!currentUserId) {
        throw new ForbiddenError("Unauthenticated: User identity not found");
      }

      // 2. Fetch user's role in this tenant
      const { data: userRecord, error } = (await db
        .from("users")
        .select("role, status")
        .eq("tenant_id", tenantId)
        .eq("id", currentUserId)
        .single()) as { data: { role: UserRole; status: string } | null; error: unknown };

      if (error || !userRecord) {
        throw new ForbiddenError("Forbidden: User is not an active member of this tenant");
      }

      if (userRecord.status === "suspended") {
        throw new ForbiddenError("Forbidden: User account is suspended");
      }

      const userRole = userRecord.role as UserRole;

      if (!hasMinimumRole(userRole, minRole)) {
        throw new ForbiddenError(
          `Forbidden: Role '${userRole}' does not satisfy minimum required '${minRole}'`
        );
      }

      return handler({
        tenantId,
        userId: currentUserId,
        userRole,
        db,
      });
    },
    customDb
  );
}
