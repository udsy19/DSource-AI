import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { ROLES } from "./roles";

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

  return { user, error: null };
}

/**
 * Get user role from user object
 */
export function getUserRoleFromUser(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};

  if (metadata.user_type && Object.values(ROLES).includes(metadata.user_type)) {
    return metadata.user_type;
  }

  if (appMetadata.user_type && Object.values(ROLES).includes(appMetadata.user_type)) {
    return appMetadata.user_type;
  }

  return ROLES.USER;
}

/**
 * Check if user has vendor role
 */
export function isVendorUser(user) {
  const role = getUserRoleFromUser(user);
  return role === ROLES.VENDOR;
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
  const role = getUserRoleFromUser(user);

  if (role !== ROLES.VENDOR) {
    throw new Error("Forbidden: Vendor access required");
  }

  return user;
}

