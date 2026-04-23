"use client";

import React, { useState, useEffect } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import logo from "../../public/logo-dsource.png";
import specSheetIcon from "../../public/spec-sheet-icon.png";
import { useSpec } from "../contexts/SpecContext";
import { useAuth } from "../contexts/AuthContext";

const Header = ({ currentPath = "" }) => {
  const { specCount } = useSpec();
  const { user, role, isAuthenticated, isVendor, signOut } = useAuth();
  const [pathName, setPathName] = useState(currentPath);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const pathname = usePathname();

  useEffect(() => {
    setPathName(pathname);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Hide global header on vendor routes when user is authenticated as vendor
  // The vendor layout has its own header component
  if (pathName?.startsWith("/vendor") && user && isVendor) {
    return null;
  }

  return (
    <div
      className={`fixed top-1.5 sm:top-2 left-1/2 -translate-x-1/2 max-w-[1728px] z-50 px-2 sm:px-4 w-full`}
    >
      <header
        className={`flex items-center justify-between backdrop-blur-md rounded-full shadow-lg px-3 py-1.5 sm:px-5 md:px-10 sm:py-2.5 ${pathName?.startsWith("/ai-material-finder") ||
            pathName?.startsWith("/marketplace") ||
            pathName?.startsWith("/spec-builder") ||
            pathName?.startsWith("/ai-visualizer") ||
            pathName?.startsWith("/vendor")
            ? "bg-black"
            : "bg-black/10"
          }`}
      >
        {!pathName?.startsWith("/vendor") ? (
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
          >
            <Image
              src={logo}
              alt="logo"
              width={32}
              height={32}
              className="w-8 h-8 sm:w-11 sm:h-11"
            />
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-white">
              DSource.AI
            </h1>
          </Link>
        ) : (
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-white mr-12">
            {pathName?.split("/")[2]
              ? pathName?.split("/")[2]?.charAt(0).toUpperCase() +
              pathName?.split("/")[2].slice(1)
              : "Vendor Dashboard"}
          </h1>
        )}

        {/* Desktop Navigation */}

        <div className="hidden lg:flex lg:w-6/12">
          <nav className="w-full">
            <ul className="flex items-center text-white gap-3 xl:gap-6">
              {!pathName?.startsWith("/vendor") && (
                <>
                  <li>
                    <Link
                      href="/"
                      className="font-bold text-sm xl:text-base hover:opacity-80"
                    >
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/ai-material-finder"
                      className="font-bold text-sm xl:text-base hover:opacity-80"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/marketplace/products"
                      className="font-bold text-sm xl:text-base hover:opacity-80"
                    >
                      Shop Sample
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/ai-visualizer"
                      className="font-bold text-sm xl:text-base hover:opacity-80"
                    >
                      Get Inspired
                    </Link>
                  </li>
                </>
              )}
              <li className="flex-1 min-w-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search materials..."
                    className="w-full bg-white text-black backdrop-blur-md rounded-lg shadow-lg pl-3 pr-11 py-1.5 text-sm focus:outline-none"
                  />
                  <Link
                    href="/marketplace/products"
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 bg-black/80 p-1.5 rounded-lg"
                    aria-label="Browse marketplace"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
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
                </div>
              </li>
            </ul>
          </nav>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Desktop Actions */}
        <div className="hidden lg:flex lg:w-3/12 lg:justify-end lg:items-center lg:gap-4 xl:gap-8">
          {isAuthenticated ? (
            <>
              {!pathName?.startsWith("/vendor") && (
                <Link
                  href="/spec-builder"
                  className="cursor-pointer flex items-center relative"
                >
                  <Image
                    src={specSheetIcon}
                    alt="spec sheet icon"
                    width={30}
                    height={30}
                  />
                  <div className="ml-2 flex items-center gap-2">
                    <p className="text-white text-sm xl:text-base font-bold hidden xl:block">
                      Spec Sheet
                    </p>
                    <span className="bg-red-500 text-white rounded-full min-w-6 w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {specCount ?? 0}
                    </span>
                  </div>
                </Link>
              )}
              <div className="flex items-center gap-4">
                {isVendor && (
                  <Link
                    href="/vendor"
                    className="text-white text-sm xl:text-base hover:underline"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="text-white text-sm xl:text-base hover:underline"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/vendor"
                className="text-white text-sm xl:text-base hover:underline"
              >
                Vendor Login
              </Link>
              <Link
                href="/login"
                className="text-white text-sm xl:text-base hover:underline"
              >
                Login
              </Link>
            </div>
          )}

          {!isAuthenticated && (
            <div>
              <Link
                href="/signup"
                className="cursor-pointer bg-white text-sm xl:text-base text-black rounded-full shadow-lg px-5 xl:px-8 py-1.5 xl:py-2.5 flex items-center gap-2"
              >
                Sign Up
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 xl:h-5 xl:w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h14m0 0l-7-7m7 7l-7 7"
                  />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed top-16 left-2 right-2 z-40 backdrop-blur-md rounded-2xl shadow-lg bg-black/90 p-5">
          <nav className="flex flex-col gap-4">
            <ul className="flex flex-col text-white gap-3">
              {!pathName?.startsWith("/vendor") && (
                <>
                  <li>
                    <Link href="/" className="font-bold block py-0.5">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link href="/ai-material-finder" className="font-bold block py-0.5">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="/marketplace/products" className="font-bold block py-0.5">
                      Shop Sample
                    </Link>
                  </li>
                  <li>
                    <Link href="/ai-visualizer" className="font-bold block py-0.5">
                      Get Inspired
                    </Link>
                  </li>
                </>
              )}
            </ul>
            <div className="relative mt-2">
              <input
                type="text"
                placeholder="Search materials..."
                className="w-full bg-white text-black backdrop-blur-md rounded-lg shadow-lg pl-3 pr-11 py-1.5 text-sm focus:outline-none"
              />
              <Link
                href="/marketplace/products"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 bg-black/80 p-1.5 rounded-lg"
                aria-label="Browse marketplace"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
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
            </div>
            <div className="flex flex-col gap-4 mt-4">
              {isAuthenticated ? (
                <>
                  {" "}
                  <Link
                    href="/spec-builder"
                    className="cursor-pointer flex items-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Image
                      src={specSheetIcon}
                      alt="spec sheet icon"
                      width={30}
                      height={30}
                    />
                    <div className="ml-2 flex items-center gap-2">
                      <p className="text-white text-base font-bold">
                        Spec Sheet
                      </p>
                      <span className="bg-red-500 text-white rounded-full min-w-6 w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {specCount ?? 0}
                      </span>
                    </div>
                  </Link>
                  <div className="flex flex-col gap-2">
                    <div className="text-white text-base">
                      {isVendor ? "Vendor" : "User"}:{" "}
                      {user?.email?.split("@")[0]}
                    </div>
                    {isVendor && (
                      <Link
                        href="/vendor"
                        className="text-white text-base hover:underline"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Vendor Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        signOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-white text-base hover:underline text-left"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/vendor"
                    className="text-white text-base hover:underline"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Vendor Login
                  </Link>
                  <Link
                    href="/login"
                    className="text-white text-base hover:underline"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                </div>
              )}
              {!isAuthenticated && (
                <Link
                  href="/signup"
                  className="cursor-pointer bg-white text-base text-black rounded-full shadow-lg px-6 py-2 flex items-center justify-center gap-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h14m0 0l-7-7m7 7l-7 7"
                    />
                  </svg>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Header;
