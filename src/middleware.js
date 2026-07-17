import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Routes that require authentication.
// /material-finder itself (the Features page) and its tutorial stay public —
// they only explain what the product offers. /material-finder/find is gated
// because every search spends real money across several paid providers, so it
// must be attributable to a user and rate-limited.
const protectedRoutes = [
  "/studio",
  "/spec-builder",
  "/ai-visualizer",
  "/material-finder/find",
  "/account",
  "/folios",
  "/get-inspired",
];

// Routes that require vendor role
const vendorRoutes = ["/vendor"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes, auth callback routes, and
  // public assets. /auth/* must pass through untouched so code-exchange can
  // establish the session before any gating runs.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|avif)$/)
  ) {
    return NextResponse.next();
  }

  // Dev-only escape hatch: skip all auth gating for local testing.
  // Hard-disabled in production builds; enabled only via .env.local flag.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Get the verified user (getUser revalidates with the Auth server; getSession
  // trusts unverified cookies and must not be used for gating).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in users skip the marketing page — the studio is their front door.
  // Logged-out visitors keep the landing page untouched.
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/studio";
    url.search = "";
    return NextResponse.redirect(url);
  }

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
      url.pathname = "/login";
      url.search = "";
      // Preserve where the user was headed so we can return them after login.
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  // Vercel Services can't ship Edge Function output ("Edge Runtime is not
  // supported in services"), and Node middleware is stable since Next 15.5 —
  // run the auth gating on the Node runtime instead.
  runtime: "nodejs",
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
