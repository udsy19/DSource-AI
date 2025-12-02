"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";

/**
 * UserRoute - Requires user role (vendors can also access)
 */
export function UserRoute({ children, redirectTo = "/" }) {
  const { isAuthenticated, canAccessUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !canAccessUser()) {
        router.push(redirectTo);
      }
    }
  }, [isAuthenticated, canAccessUser, loading, router, redirectTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!isAuthenticated || !canAccessUser()) {
    return null;
  }

  return <>{children}</>;
}

