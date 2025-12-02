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
 * Check if user can access vendor routes
 */
export function canAccessVendorRoutes(userRole) {
  return isVendor(userRole);
}

/**
 * Check if user can access user routes
 */
export function canAccessUserRoutes(userRole) {
  return isUser(userRole) || isVendor(userRole); // Vendors can also access user routes
}

/**
 * Get user role from user metadata
 */
export function getUserRole(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};

  // Check user_metadata first (set during signup)
  if (metadata.user_type && Object.values(ROLES).includes(metadata.user_type)) {
    return metadata.user_type;
  }

  // Check app_metadata (set by admin)
  if (appMetadata.user_type && Object.values(ROLES).includes(appMetadata.user_type)) {
    return appMetadata.user_type;
  }

  // Default to user role
  return ROLES.USER;
}

