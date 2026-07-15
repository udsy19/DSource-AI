"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function VendorRouteGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // If user is not authenticated and trying to access vendor sub-routes (not /vendor itself)
      if (
        !isAuthenticated &&
        pathname !== "/vendor" &&
        pathname.startsWith("/vendor")
      ) {
        router.replace("/vendor");
      }
    }
  }, [isAuthenticated, pathname, router, loading]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="viz-scope flex min-h-screen items-center justify-center">
        <p className="viz-mono text-sm text-[var(--viz-muted)]">
          Checking your credentials…
        </p>
      </div>
    );
  }

  // If not authenticated and on a sub-route, don't render (redirect will happen)
  if (
    !isAuthenticated &&
    pathname !== "/vendor" &&
    pathname.startsWith("/vendor")
  ) {
    return null;
  }

  return <>{children}</>;
}
