"use client";

import Footer from "./footer";
import QuickLinks from "./quick-links";
import { usePathnameContext } from "../contexts/PathnameContext";

export default function ConditionalFooter() {
  const { pathname } = usePathnameContext();

  if (pathname?.startsWith("/vendor")) {
    return null;
  }

  return (
    <>
      <Footer />
      <QuickLinks />
    </>
  );
}

