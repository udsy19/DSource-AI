"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function VendorRouteGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isVendor, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // If user is not authenticated and trying to access vendor sub-routes (not /vendor itself)
      if (!isAuthenticated && pathname !== "/vendor" && pathname.startsWith("/vendor")) {
        router.replace("/vendor");
      }
    }
  }, [isAuthenticated, pathname, router, loading]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If not authenticated and on a sub-route, don't render (redirect will happen)
  if (!isAuthenticated && pathname !== "/vendor" && pathname.startsWith("/vendor")) {
    return null;
  }

  return <>{children}</>;
}

