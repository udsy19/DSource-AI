"use client";

import { useAuthorization } from "../../hooks/useAuthorization";

/**
 * RequireRole - Renders children only if user has required role(s)
 */
export function RequireRole({
  children,
  role,
  roles,
  fallback = null,
  requireAll = false,
}) {
  const { hasRole, hasAnyRole, loading } = useAuthorization();

  if (loading) {
    return fallback;
  }

  // Check single role
  if (role && !hasRole(role)) {
    return fallback;
  }

  // Check multiple roles
  if (roles && Array.isArray(roles)) {
    if (requireAll) {
      // User must have all roles
      const hasAll = roles.every((r) => hasRole(r));
      if (!hasAll) {
        return fallback;
      }
    } else {
      // User must have at least one role
      if (!hasAnyRole(roles)) {
        return fallback;
      }
    }
  }

  return <>{children}</>;
}

