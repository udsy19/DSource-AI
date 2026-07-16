"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Once-only scroll reveal: fades/rises its children the first time they
 * enter the viewport, and drives any nested `.viz-rule` (the ink line
 * plots across). Respects prefers-reduced-motion by revealing instantly.
 */
export default function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return undefined;
    }
    // A plain position check on scroll survives instant jumps (anchor
    // links, End key) that IntersectionObserver can skip entirely —
    // anything at or above 88% of the viewport reveals, then we detach.
    const check = () => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.88) {
        setInView(true);
        window.removeEventListener("scroll", check);
        window.removeEventListener("resize", check);
      }
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`viz-reveal ${inView ? "viz-reveal-in" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
