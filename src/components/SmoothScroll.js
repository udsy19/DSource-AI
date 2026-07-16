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
      // A gentle glide — long enough to feel premium, short enough that the
      // scrubbed hero never lags behind the cursor. The hero's own frame
      // cross-fade smooths the last bit, so Lenis can stay light here.
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      syncTouch: true,
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
