"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";

const navigationItems = [
  { name: "Dashboard", href: "/vendor" },
  { name: "Products", href: "/vendor/products" },
  { name: "Orders", href: "/vendor/orders" },
  { name: "AI Visualizer", href: "/vendor/ai-visualizer" },
];

const navItemClasses = (active) =>
  `viz-mono block border-l-2 px-4 py-2.5 text-xs uppercase tracking-[0.08em] transition-colors duration-200 ${
    active
      ? "border-[var(--viz-ink)] font-semibold text-[var(--viz-ink)]"
      : "border-transparent text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
  }`;

export default function VendorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const isActive = (href) => {
    if (href === "/vendor") {
      return pathname === "/vendor";
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="viz-panel flex h-full w-64 flex-col overflow-hidden">
      {/* Wordmark */}
      <div className="border-b border-[var(--viz-line)] px-6 py-6">
        <Link href="/vendor" className="viz-serif block text-xl">
          DSource.AI
        </Link>
        <p className="viz-label mt-1">Vendor studio</p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        {navigationItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={navItemClasses(active)}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="space-y-1 border-t border-[var(--viz-line)] px-3 py-5">
        <Link
          href="/vendor/settings"
          aria-current={pathname === "/vendor/settings" ? "page" : undefined}
          className={navItemClasses(pathname === "/vendor/settings")}
        >
          Settings
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="viz-mono block w-full cursor-pointer border-l-2 border-transparent px-4 py-2.5 text-left text-xs uppercase tracking-[0.08em] text-[var(--viz-muted)] transition-colors duration-200 hover:text-[var(--viz-ink)]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
