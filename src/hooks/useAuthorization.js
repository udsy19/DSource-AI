"use client";

import { useAuth } from "../contexts/AuthContext";
import { ROLES } from "../utils/roles";
import {
  hasRole as checkRole,
  hasAnyRole as checkAnyRole,
  isVendor,
  isUser,
  canAccessVendorRoutes,
  canAccessUserRoutes,
} from "../utils/authorization";

/**
 * Hook for authorization checks
 */
export function useAuthorization() {
  const { user, role, isAuthenticated, loading } = useAuth();

  return {
    // User info
    user,
    role,
    isAuthenticated,
    loading,

    // Role checks
    isVendor: isVendor(role),
    isUser: isUser(role),

    // Authorization checks
    hasRole: (requiredRole) => checkRole(role, requiredRole),
    hasAnyRole: (requiredRoles) => checkAnyRole(role, requiredRoles),
    canAccessVendor: () => canAccessVendorRoutes(role),
    canAccessUser: () => canAccessUserRoutes(role),

    // Constants
    ROLES,
  };
}

