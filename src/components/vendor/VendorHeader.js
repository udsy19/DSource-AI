"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

export default function VendorHeader({ user }) {
  const [searchQuery, setSearchQuery] = useState("");
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
    <header
      className="flex items-center justify-between gap-6 py-4 px-4 rounded-xl"
      style={{ backgroundColor: "#F5F3F0" }}
    >
      {/* Page Title Badge */}
      <div className="flex items-center gap-4">
        <div
          className="px-6 py-2 rounded-full text-white font-semibold"
          style={{ backgroundColor: "#2D2A2A" }}
        >
          {getPageTitle()}
        </div>
      </div>

      {/* Search Bar */}
      {/* <div className="flex-1 max-w-md">
                <div className="relative">
                    <svg
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
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
                    <input
                        type="text"
                        placeholder="Search here..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-full border-0 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                        style={{ backgroundColor: '#EBE5E0' }}
                    />
                </div>
            </div> */}

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <span className="text-lg">🇺🇸</span>
          <span className="font-medium">Eng (US)</span>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Notification Bell */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {/* Red notification dot */}
          <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-semibold">
            {userInitial}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
