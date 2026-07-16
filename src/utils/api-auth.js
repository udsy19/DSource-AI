import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUserRole } from "./authorization";
import { ROLES } from "./roles";

// Single source of truth for role derivation lives in ./authorization. Re-export
// under the legacy name so existing server callers keep working.
export { getUserRole as getUserRoleFromUser } from "./authorization";

/**
 * Get authenticated user from API request
 */
export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: error || new Error("Not authenticated") };
  }

  // Reject suspended accounts immediately. Supabase ban_duration revokes refresh
  // tokens but leaves an already-issued access token valid until it expires; this
  // indexed PK lookup on the user's own profile closes that window.
  const { data: profile } = await supabase
    .from("profiles")
    .select("banned")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.banned) {
    return { user: null, error: new Error("Account suspended") };
  }

  return { user, error: null };
}

/**
 * Check if user has vendor role
 */
export function isVendorUser(user) {
  return getUserRole(user) === ROLES.VENDOR;
}

/**
 * Admin emails allowed to perform privileged actions (e.g. granting roles).
 * Configured via the ADMIN_EMAILS env var (comma-separated).
 */
export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Check if a user is an admin. Two paths:
 *  1. Granted the `admin` role in app_metadata (service-role controlled; also
 *     what the DB's is_admin() RLS check uses).
 *  2. Break-glass: their email is in the ADMIN_EMAILS allowlist. This lets the
 *     first operator in before any admin role has been granted.
 */
export function isAdminUser(user) {
  if (!user) return false;
  if (getUserRole(user) === ROLES.ADMIN) return true;
  const email = user.email?.toLowerCase();
  return email ? getAdminEmails().includes(email) : false;
}

/**
 * Require authentication for API route
 */
export async function requireAuth() {
  const { user, error } = await getAuthenticatedUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Require vendor role for API route
 */
export async function requireVendor() {
  const user = await requireAuth();
  const role = getUserRole(user);

  if (role !== ROLES.VENDOR) {
    throw new Error("Forbidden: Vendor access required");
  }

  return user;
}

/**
 * Require admin (email allowlist) for a privileged API route.
 */
export async function requireAdmin() {
  const user = await requireAuth();

  if (!isAdminUser(user)) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}
