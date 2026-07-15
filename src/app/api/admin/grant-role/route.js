import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/api-auth";
import { isValidRole, ROLES } from "@/utils/roles";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Admin-only endpoint to grant/change a user's role.
 *
 * Auth: caller must be an admin (ADMIN_EMAILS allowlist).
 * Effect: sets the role in the user's `app_metadata` (the trusted source used
 * for authorization) using the service-role key, and mirrors it into
 * `public.profiles.role`.
 *
 * Body: { email: string, role?: "user" | "vendor" }
 */
export async function POST(request) {
  try {
    await requireAdmin();
  } catch (error) {
    const message = error?.message || "";
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("grant-role auth error");
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body?.role === "string" ? body.role : ROLES.VENDOR;

  if (!email) {
    return NextResponse.json(
      { error: "An email is required." },
      { status: 400 },
    );
  }
  if (!isValidRole(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Resolve the user id from the profiles mirror (populated on signup).
    const { data: profile, error: lookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      console.error("grant-role lookup error");
      return NextResponse.json(
        { error: "Could not look up that user." },
        { status: 500 },
      );
    }
    if (!profile) {
      return NextResponse.json(
        {
          error:
            "No account found for that email. The user must sign up first.",
        },
        { status: 404 },
      );
    }

    // Trusted role lives in app_metadata (merged, not user-writable).
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(
      profile.id,
      {
        app_metadata: { user_type: role },
      },
    );
    if (updateAuthError) {
      console.error("grant-role updateUserById error");
      return NextResponse.json(
        { error: "Could not update the user's role." },
        { status: 500 },
      );
    }

    // Mirror into profiles for queryability (defense-in-depth, not the source).
    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (profileUpdateError) {
      console.error("grant-role profile mirror error");
      // The authoritative app_metadata update already succeeded; report success.
    }

    return NextResponse.json({ success: true, email, role });
  } catch (error) {
    console.error("grant-role unexpected error");
    const message = error?.message || "";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { error: "Server is not configured for admin actions." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
