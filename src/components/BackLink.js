"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * A quiet "← Back" that returns to where the user actually came from
 * (browser history) and falls back to `href` on a direct visit.
 */
export default function BackLink({ href, label = "Back" }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="viz-label inline-block transition-colors hover:text-[var(--viz-ink)]"
    >
      ← {label}
    </Link>
  );
}
