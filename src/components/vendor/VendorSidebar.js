"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import logo from "../../../public/brand/logo-ink.png";
import { useAuth } from "../../contexts/AuthContext";

// Only routes that exist. Orders / AI Visualizer / Settings had no pages
// behind them — dead links are removed, not disabled, until they ship.
const navigationItems = [
  { index: "01", name: "Dashboard", href: "/vendor" },
  { index: "02", name: "Products", href: "/vendor/products" },
];

const navItemClasses = (active) =>
  `viz-mono flex items-baseline gap-3 border-l-2 px-4 py-2.5 text-xs uppercase tracking-[0.08em] transition-colors duration-200 ${
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
        <Link href="/vendor" className="flex items-center gap-2.5">
          <Image
            src={logo}
            alt=""
            width={24}
            height={27}
            className="h-6 w-auto"
          />
          <span className="viz-serif text-xl">DSource.AI</span>
        </Link>
        <p className="viz-label mt-1">The workshop office</p>
      </div>

      {/* Navigation: an index of sheets, folio-numbered. */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        <p className="viz-label px-4 pb-2">Index</p>
        {navigationItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={navItemClasses(active)}
            >
              <span
                className="text-[10px] text-[var(--viz-muted)]"
                aria-hidden="true"
              >
                {item.index}
              </span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-[var(--viz-line)] px-3 py-5">
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
