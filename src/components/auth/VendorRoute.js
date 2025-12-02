"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";

/**
 * VendorRoute - Requires vendor role
 */
export function VendorRoute({ children, redirectTo = "/" }) {
  const { isAuthenticated, isVendor, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !isVendor) {
        router.push(redirectTo);
      }
    }
  }, [isAuthenticated, isVendor, loading, router, redirectTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isVendor) {
    return null;
  }

  return <>{children}</>;
}

