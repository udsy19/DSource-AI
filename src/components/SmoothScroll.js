"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Site-wide smooth scrolling. One Lenis instance drives every page and stays
 * synced with ScrollTrigger, so scroll-scrubbed sections (the hero film,
 * folio reveals) share the exact same eased scroll position. Exposed on
 * `window.__lenis` so components can reuse it instead of spawning their own.
 * Honors reduced-motion by not mounting. Nested scrollers opt out with
 * `data-lenis-prevent` (already on the modal bodies).
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      // Lower lerp = the scroll settles quickly and precisely, which kills
      // the "floaty catch-up" that reads as choppy on a scrubbed canvas.
      lerp: 0.12,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    window.__lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, []);

  return null;
}
