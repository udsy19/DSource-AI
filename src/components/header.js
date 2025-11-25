"use client";

import React, { useState, useEffect } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "../../public/logo-dsource.png";
import specSheetIcon from "../../public/spec-sheet-icon.png";
import { useSpec } from "../contexts/SpecContext";

const Header = ({ currentPath = "" }) => {
  const { specCount } = useSpec();
  const [pathName, setPathName] = useState(currentPath);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    setPathName(pathname);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="fixed top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 z-50">
      <header
        className={`flex items-center justify-between backdrop-blur-md rounded-full shadow-lg px-4 py-2 sm:px-8 md:px-14 sm:py-4 ${
          pathName?.startsWith("/ai-material-finder") ||
          pathName?.startsWith("/marketplace") ||
          pathName?.startsWith("/spec-builder") ||
          pathName?.startsWith("/ai-visualizer")
            ? "bg-black"
            : "bg-black/10"
        }`}
      >
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-4 flex-shrink-0"
        >
          <Image
            src={logo}
            alt="logo"
            width={40}
            height={40}
            className="sm:w-[60px] sm:h-[60px]"
          />
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
            DSource.AI
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:w-6/12">
          <nav>
            <ul className="flex items-center text-white gap-4 xl:gap-8">
              <li className="font-bold text-sm xl:text-base">Home</li>
              <li className="font-bold text-sm xl:text-base">Features</li>
              <li className="font-bold text-sm xl:text-base">Shop Sample</li>
              <li className="font-bold text-sm xl:text-base">Get Inspired</li>
              <li className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search materials..."
                    className="w-full bg-white text-black backdrop-blur-md rounded-xl shadow-lg pl-4 pr-12 py-2 text-sm focus:outline-none"
                  />
                  <button className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/80 p-2 rounded-xl cursor-pointer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
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
                  </button>
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
          {pathName?.startsWith("/ai-material-finder") ? (
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
                {specCount > 0 && (
                  <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {specCount}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <div className="text-white text-sm xl:text-md">Login</div>
          )}

          <div>
            <button className="cursor-pointer bg-white text-sm xl:text-base text-black rounded-full shadow-lg px-6 xl:px-10 py-2 xl:py-4 flex items-center gap-2">
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
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed top-20 left-2 right-2 z-40 backdrop-blur-md rounded-2xl shadow-lg bg-black/90 p-6">
          <nav className="flex flex-col gap-4">
            <ul className="flex flex-col text-white gap-4">
              <li className="font-bold">Home</li>
              <li className="font-bold">Features</li>
              <li className="font-bold">Shop Sample</li>
              <li className="font-bold">Get Inspired</li>
            </ul>
            <div className="relative mt-4">
              <input
                type="text"
                placeholder="Search materials..."
                className="w-full bg-white text-black backdrop-blur-md rounded-xl shadow-lg pl-4 pr-12 py-2 text-sm focus:outline-none"
              />
              <button className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/80 p-2 rounded-xl cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
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
              </button>
            </div>
            <div className="flex flex-col gap-4 mt-4">
              {pathName?.startsWith("/ai-material-finder") ? (
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
                    <p className="text-white text-base font-bold">Spec Sheet</p>
                    {specCount > 0 && (
                      <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {specCount}
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <div className="text-white text-md">Login</div>
              )}
              <button className="cursor-pointer bg-white text-base text-black rounded-full shadow-lg px-6 py-3 flex items-center justify-center gap-2">
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
              </button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Header;
