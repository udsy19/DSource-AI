"use client";

import { usePathname } from "next/navigation";

export default function VendorHeader({ user }) {
  const pathname = usePathname();

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin";
  const userInitial = userName.charAt(0).toUpperCase();

  // Get page title from pathname
  const getPageTitle = () => {
    if (pathname === "/vendor") return "Dashboard";
    if (pathname === "/vendor/products") return "Products";
    if (pathname === "/vendor/orders") return "Orders";
    if (pathname?.startsWith("/vendor/")) {
      const segment = pathname.split("/")[2];
      return segment
        ? segment.charAt(0).toUpperCase() + segment.slice(1)
        : "Dashboard";
    }
    return "Dashboard";
  };

  return (
    <header className="flex items-end justify-between gap-6 border-b border-[var(--viz-line)] pb-4">
      {/* Page title */}
      <div>
        <p className="viz-label">The workshop office</p>
        <h1 className="viz-serif mt-1 text-2xl sm:text-3xl">
          {getPageTitle()}
        </h1>
      </div>

      {/* Signed-in vendor */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--viz-ink)] text-sm font-semibold text-[var(--viz-paper)]"
          aria-hidden="true"
        >
          {userInitial}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-[var(--viz-ink)]">
            {userName}
          </p>
          <p className="viz-label">Vendor</p>
        </div>
      </div>
    </header>
  );
}
