"use client";

import { usePathnameContext } from "../contexts/PathnameContext";
import Footer from "./footer";
import QuickLinks from "./quick-links";

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
