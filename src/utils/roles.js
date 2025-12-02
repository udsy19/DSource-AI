/**
 * User roles in the application
 */
export const ROLES = {
  USER: "user",
  VENDOR: "vendor",
};

/**
 * Check if a role is valid
 */
export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Get default role (user)
 */
export function getDefaultRole() {
  return ROLES.USER;
}

/**
 * Check if user has vendor role
 */
export function isVendorRole(role) {
  return role === ROLES.VENDOR;
}

/**
 * Check if user has user role
 */
export function isUserRole(role) {
  return role === ROLES.USER;
}

