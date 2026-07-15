import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { safeNextPath } from "@/utils/auth-validation";
import { createClient } from "@/utils/supabase/server";

/**
 * OAuth + PKCE code-exchange landing route.
 *
 * Handles: Google OAuth sign-in, email-confirmation links, and password
 * recovery links (which redirect here, then on to `next`, e.g. /reset-password).
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/");
  const providerError =
    searchParams.get("error_description") || searchParams.get("error");

  const loginError = (message) =>
    NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );

  if (providerError) {
    return loginError("Sign-in was cancelled or failed. Please try again.");
  }

  if (!code) {
    return loginError("Invalid authentication link.");
  }

  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return loginError("Could not sign you in. The link may have expired.");
  }

  return NextResponse.redirect(`${origin}${next}`);
}
