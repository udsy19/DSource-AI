"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const PathnameContext = createContext(undefined);

export function PathnameProvider({ children }) {
  const pathname = usePathname();
  const [currentPathname, setCurrentPathname] = useState("");

  useEffect(() => {
    setCurrentPathname(pathname || "");
  }, [pathname]);

  const value = {
    pathname: currentPathname,
  };

  return (
    <PathnameContext.Provider value={value}>{children}</PathnameContext.Provider>
  );
}

export function usePathnameContext() {
  const context = useContext(PathnameContext);
  if (context === undefined) {
    throw new Error("usePathnameContext must be used within a PathnameProvider");
  }
  return context;
}

