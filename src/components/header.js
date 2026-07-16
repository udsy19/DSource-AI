"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import logo from "../../public/brand/logo-ink.png";
import specSheetIcon from "../../public/spec-sheet-icon.png";
import { useAuth } from "../contexts/AuthContext";
import { useSpec } from "../contexts/SpecContext";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/ai-material-finder", label: "Features" },
  { href: "/marketplace/products", label: "Shop sample" },
  { href: "/ai-visualizer", label: "Get inspired" },
  { href: "/folios", label: "Folios" },
];

/**
 * Global navigation as pure typography — no bar, no boxes, no glass.
 * A single line of type sits directly on the page; scrolling past the
 * masthead gives it a solid paper backing and a hairline rule. The mobile
 * menu is a full paper sheet with the links set large in serif.
 */
const Header = ({ currentPath = "" }) => {
  const { specCount } = useSpec();
  const { user, isAuthenticated, isVendor, signOut } = useAuth();
  const [pathName, setPathName] = useState(currentPath);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    setPathName(pathname);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide global header on vendor routes when user is authenticated as vendor
  // The vendor layout has its own header component
  if (pathName?.startsWith("/vendor") && user && isVendor) {
    return null;
  }

  const onVendorRoute = pathName?.startsWith("/vendor");
  const isActive = (href) =>
    href === "/" ? pathName === "/" : pathName?.startsWith(href);

  const monoLink =
    "viz-mono text-xs tracking-[0.08em] uppercase transition-colors";

  return (
    <div className="viz-scope fixed inset-x-0 top-0 z-50">
      <header
        className={`transition-colors duration-300 ${
          scrolled || isMobileMenuOpen
            ? "border-b border-[var(--viz-line)] bg-[var(--viz-paper)]"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1728px] items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-10">
          {/* Wordmark */}
          {!onVendorRoute
            ? <Link href="/" className="flex shrink-0 items-center gap-2.5">
                <Image
                  src={logo}
                  alt="DSource.AI logo"
                  width={28}
                  height={31}
                  className="h-7 w-auto"
                />
                <span className="viz-serif text-xl">DSource.AI</span>
              </Link>
            : <span className="viz-serif text-xl">
                {pathName?.split("/")[2]
                  ? pathName?.split("/")[2]?.charAt(0).toUpperCase() +
                    pathName?.split("/")[2].slice(1)
                  : "Vendor Dashboard"}
              </span>}

          {/* Desktop wayfinding */}
          {!onVendorRoute && (
            <nav className="hidden lg:block">
              <ul className="flex items-center gap-8 xl:gap-10">
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`${monoLink} ${
                        isActive(href)
                          ? "text-[var(--viz-ink)] underline decoration-[var(--viz-ink)] decoration-2 underline-offset-8"
                          : "text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-6 lg:flex xl:gap-8">
            <Link
              href="/marketplace/products"
              aria-label="Search materials"
              className="text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]"
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                className="h-[18px] w-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </Link>

            {isAuthenticated
              ? <>
                  {!onVendorRoute && (
                    <Link
                      href="/spec-builder"
                      className="flex items-center gap-2"
                    >
                      <Image
                        src={specSheetIcon}
                        alt=""
                        width={22}
                        height={22}
                      />
                      <span className={`${monoLink} hidden xl:block`}>
                        Spec sheet
                      </span>
                      <span className="viz-mono flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--viz-blue)] px-1 text-[11px] font-bold text-white">
                        {specCount ?? 0}
                      </span>
                    </Link>
                  )}
                  {isVendor && (
                    <Link
                      href="/vendor"
                      className={`${monoLink} text-[var(--viz-muted)] hover:text-[var(--viz-ink)]`}
                    >
                      Dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={signOut}
                    className={`${monoLink} cursor-pointer text-[var(--viz-muted)] hover:text-[var(--viz-ink)]`}
                  >
                    Log out
                  </button>
                </>
              : <>
                  <Link
                    href="/vendor"
                    className={`${monoLink} text-[var(--viz-muted)] hover:text-[var(--viz-ink)]`}
                  >
                    Vendor
                  </Link>
                  <Link
                    href="/login"
                    className={`${monoLink} text-[var(--viz-muted)] hover:text-[var(--viz-ink)]`}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="viz-btn rounded-full bg-[var(--viz-ink)] px-5 py-2.5 text-[var(--viz-paper)] transition-colors hover:bg-black"
                  >
                    Sign up
                  </Link>
                </>}
          </div>

          {/* Mobile menu button — plain type, no box */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`${monoLink} cursor-pointer py-1 font-bold text-[var(--viz-ink)] lg:hidden`}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? "Close ×" : "Menu"}
          </button>
        </div>
      </header>

      {/* Mobile menu — a full paper sheet, links set large in serif */}
      {isMobileMenuOpen && (
        <div className="h-[calc(100svh-57px)] overflow-y-auto bg-[var(--viz-paper)] lg:hidden">
          <nav className="flex min-h-full flex-col justify-between px-6 py-8">
            <div>
              {!onVendorRoute && (
                <ul className="flex flex-col gap-1">
                  {NAV_LINKS.map(({ href, label }, i) => (
                    <li
                      key={href}
                      className="border-b border-[var(--viz-line)]"
                    >
                      <Link
                        href={href}
                        className="flex items-baseline justify-between py-4"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span
                          className={`viz-serif text-3xl ${
                            isActive(href) ? "italic" : ""
                          }`}
                        >
                          {label}
                        </span>
                        <span className="viz-label">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-10 flex flex-col gap-4">
              {isAuthenticated
                ? <>
                    <Link
                      href="/spec-builder"
                      className="flex items-center gap-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Image
                        src={specSheetIcon}
                        alt=""
                        width={24}
                        height={24}
                      />
                      <span className={`${monoLink} text-sm`}>Spec sheet</span>
                      <span className="viz-mono flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--viz-blue)] px-1 text-[11px] font-bold text-white">
                        {specCount ?? 0}
                      </span>
                    </Link>
                    <p className="text-sm text-[var(--viz-muted)]">
                      {isVendor ? "Vendor" : "User"}:{" "}
                      {user?.email?.split("@")[0]}
                    </p>
                    {isVendor && (
                      <Link
                        href="/vendor"
                        className={`${monoLink} text-sm`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Vendor dashboard
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className={`${monoLink} text-left text-sm`}
                    >
                      Log out
                    </button>
                  </>
                : <>
                    <div className="flex items-center gap-6">
                      <Link
                        href="/vendor"
                        className={`${monoLink} text-sm text-[var(--viz-muted)]`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Vendor login
                      </Link>
                      <Link
                        href="/login"
                        className={`${monoLink} text-sm text-[var(--viz-muted)]`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Log in
                      </Link>
                    </div>
                    <Link
                      href="/signup"
                      className="viz-btn flex items-center justify-center rounded-full bg-[var(--viz-ink)] px-6 py-3 text-[var(--viz-paper)]"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign up
                    </Link>
                  </>}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Header;
