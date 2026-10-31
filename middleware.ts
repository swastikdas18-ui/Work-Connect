import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { extractTenantId } from "@/lib/tenant/context";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Extract tenant context from header, auth, or subdomain
  let tenantId = extractTenantId(request);

  // If not found in headers, check user session metadata
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!tenantId && user) {
    tenantId =
      user.app_metadata?.tenant_id ||
      user.user_metadata?.tenant_id ||
      null;
  }

  // Public / unauthenticated paths exempt from tenant rejection
  const pathname = request.nextUrl.pathname;
  const isPublicRoute =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/" ||
    pathname.startsWith("/(auth)") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth");

  // Validate tenant context for protected API & dashboard routes
  if (!isPublicRoute && !tenantId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Tenant context missing or invalid" },
        { status: 400 }
      );
    }

    // Redirect dashboard requests to auth / login
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Pass validated tenant context downstream in headers
  if (tenantId) {
    response.headers.set("x-tenant-id", tenantId);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

