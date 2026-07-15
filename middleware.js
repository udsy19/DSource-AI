import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/spec-builder", "/ai-material-finder"];

// Routes that require vendor role
const vendorRoutes = ["/vendor"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes, and public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|avif)$/)
  ) {
    return NextResponse.next();
  }

  // Create Supabase client for middleware
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get the verified user (getUser revalidates with the Auth server; getSession
  // trusts unverified cookies and must not be used for gating).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Role comes ONLY from app_metadata (service-role controlled); user_metadata
  // is user-controlled and must never be trusted for authorization.
  const userRole = user?.app_metadata?.user_type || "user";

  // Check if route requires vendor role
  if (vendorRoutes.some((route) => pathname.startsWith(route))) {
    if (!user || userRole !== "vendor") {
      // Allow access to /vendor for login, but redirect if trying to access dashboard without vendor role
      if (pathname !== "/vendor") {
        const url = request.nextUrl.clone();
        url.pathname = "/vendor";
        return NextResponse.redirect(url);
      }
    }
  }

  // Check if route requires authentication
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

