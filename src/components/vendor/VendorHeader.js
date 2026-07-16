"use client";

import { usePathname } from "next/navigation";

export default function VendorHeader({ user }) {
  const pathname = usePathname();

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Vendor";

  // Get page title from pathname
  const getPageTitle = () => {
    if (pathname === "/vendor") return "Dashboard";
    if (pathname === "/vendor/products") return "Products";
    if (pathname?.startsWith("/vendor/")) {
      const segment = pathname.split("/")[2];
      return segment
        ? segment.charAt(0).toUpperCase() + segment.slice(1)
        : "Dashboard";
    }
    return "Dashboard";
  };

  return (
    <header>
      {/* Folio masthead: mono meta pair over the ink rule, serif title below,
          halftone drifting off the rule's right end. */}
      <div className="flex items-baseline justify-between gap-4 pb-2">
        <p className="viz-label">The workshop office</p>
        <p className="viz-mono text-xs uppercase tracking-[0.08em] text-[var(--viz-muted)]">
          {userName} · <span className="text-[var(--viz-ink)]">Vendor</span>
        </p>
      </div>
      <div className="relative pt-4 pb-4">
        <span
          className="absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
          aria-hidden="true"
        />
        <span className="viz-dots-rule" aria-hidden="true" />
        <h1 className="viz-serif text-3xl leading-none sm:text-4xl">
          {getPageTitle()}
        </h1>
      </div>
    </header>
  );
}
