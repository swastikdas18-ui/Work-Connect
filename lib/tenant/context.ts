import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { createServerSupabaseClient } from "@/lib/db/client";

export class TenantIsolationError extends Error {
  constructor(message: string = "Missing or invalid tenant context") {
    super(message);
    this.name = "TenantIsolationError";
  }
}

/**
 * Extracts tenant context from request headers, query, subdomain, or JWT bearer token
 */
export function extractTenantId(req: Request): string | null {
  // 1. Explicit request header (e.g. from edge middleware or API gateway)
  const headerTenantId = req.headers.get("x-tenant-id");
  if (headerTenantId && headerTenantId.trim()) {
    return headerTenantId.trim();
  }

  // 2. Authorization Bearer JWT claim decoding (without remote network call)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const jwtTenantId = extractTenantIdFromJwt(token);
    if (jwtTenantId) {
      return jwtTenantId;
    }
  }

  // 3. Subdomain extraction: [subdomain].[rootDomain]
  try {
    const url = new URL(req.url);
    const hostname = url.hostname; // e.g. "acme.workconnect.com" or "localhost"
    
    // Ignore direct IP, localhost root, or root domains
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      const subdomain = parts[0];
      if (subdomain && !["www", "api", "app"].includes(subdomain.toLowerCase())) {
        return subdomain;
      }
    }
  } catch {
    // URL parsing fallback
  }

  return null;
}

/**
 * Decodes the JWT payload safely to extract the tenant_id claim
 */
export function extractTenantIdFromJwt(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.tenant_id || parsed.app_metadata?.tenant_id || parsed.user_metadata?.tenant_id || null;
  } catch {
    return null;
  }
}

/**
 * High-order wrapper that asserts tenant context and sets the session tenant_id on the DB client
 */
export async function withTenantContext<T>(
  req: Request,
  handler: (tenantId: string, db: SupabaseClient<Database>) => Promise<T>,
  customDb?: SupabaseClient<Database>
): Promise<T> {
  const tenantId = extractTenantId(req);

  if (!tenantId) {
    throw new TenantIsolationError("No tenant context could be derived from the request");
  }

  const db = customDb || (await createServerSupabaseClient());

  // Inject session variable for Postgres RLS: SET LOCAL app.current_tenant_id = '...'
  // In Supabase/Postgres, this can be executed via an RPC function or direct SQL command
  try {
    const dbWithRpc = db as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
    };
    if (typeof dbWithRpc.rpc === "function") {
      await dbWithRpc.rpc("set_tenant_context", { p_tenant_id: tenantId }).catch(() => null);
    }
  } catch {
    // Continue with client execution
  }

  return handler(tenantId, db);
}
