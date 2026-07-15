import { ROLES } from "./roles";

/**
 * Authorization utilities for role-based access control
 */

/**
 * Check if user has required role
 */
export function hasRole(userRole, requiredRole) {
  if (!userRole || !requiredRole) return false;
  return userRole === requiredRole;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(userRole, requiredRoles) {
  if (!userRole || !Array.isArray(requiredRoles)) return false;
  return requiredRoles.includes(userRole);
}

/**
 * Check if user is vendor
 */
export function isVendor(userRole) {
  return hasRole(userRole, ROLES.VENDOR);
}

/**
 * Check if user is regular user
 */
export function isUser(userRole) {
  return hasRole(userRole, ROLES.USER);
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole) {
  return hasRole(userRole, ROLES.ADMIN);
}

/**
 * Check if user can access vendor routes. Admins can access everything.
 */
export function canAccessVendorRoutes(userRole) {
  return isVendor(userRole) || isAdmin(userRole);
}

/**
 * Check if user can access user routes. Vendors and admins can too.
 */
export function canAccessUserRoutes(userRole) {
  return isUser(userRole) || isVendor(userRole) || isAdmin(userRole);
}

/**
 * Check if user can access admin routes.
 */
export function canAccessAdminRoutes(userRole) {
  return isAdmin(userRole);
}

/**
 * Get user role from user metadata
 */
export function getUserRole(user) {
  if (!user) return null;

  // Roles are read ONLY from app_metadata, which is settable exclusively with
  // the service-role key (set by admin). user_metadata is user-controlled and
  // must never be trusted for authorization.
  const appMetadata = user.app_metadata || {};

  if (
    appMetadata.user_type &&
    Object.values(ROLES).includes(appMetadata.user_type)
  ) {
    return appMetadata.user_type;
  }

  // Default to user role
  return ROLES.USER;
}
