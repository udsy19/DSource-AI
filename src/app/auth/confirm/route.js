import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { safeNextPath } from "@/utils/auth-validation";
import { createClient } from "@/utils/supabase/server";

/**
 * OTP (token_hash) confirmation route — used by Supabase email templates that
 * send a `token_hash` + `type` instead of a PKCE `code` (email confirmation,
 * magic-link, recovery, email-change).
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next"), "/");

  const loginError = (message) =>
    NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );

  if (!tokenHash || !type) {
    return loginError("Invalid confirmation link.");
  }

  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return loginError(
      "That link is invalid or has expired. Please request a new one.",
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
