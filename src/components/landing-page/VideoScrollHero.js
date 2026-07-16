"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useScrubFilm } from "@/components/useScrubFilm";

// 243 frames from three chained Higgsfield clips: a golden-hour orbit
// toward the villa, one continuous glide through the teak door into the
// empty house, and the room furnishing itself piece by piece. Desktop
// reads the 4K set; phones read a lighter 1280px set. (design.md §12)
const FRAME_COUNT = 243;
const frameName = (i) => `frame_${String(i + 1).padStart(4, "0")}.webp`;
const framePath = (i) => `/frames/${frameName(i)}`;
const framePathM = (i) => `/frames-m/${frameName(i)}`;

/**
 * Scroll-scrubbed film hero in three acts. On load the title sequence
 * reveals over a soft scrim (staggered, cinematic); the camera orbits the
 * villa (title recedes at the threshold), glides through the door into the
 * empty house, and the room designs itself until the film unpins into The
 * Workflow. The film is scrubbed on a canvas — full-res on desktop, a
 * lighter frame set on phones — with a lerped, cross-faded frame index so
 * playback stays continuous and coasts to rest. Global nav bows out over
 * the first 10%. Site-wide smooth scroll comes from the shared layout Lenis.
 */
export default function VideoScrollHero() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const copyRef = useRef(null);
  const scrimRef = useRef(null);
  const navRef = useRef(null);

  // --- Title sequence: staggered mask-reveal on load ---
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lines = rootRef.current.querySelectorAll(".hero-copy-line");
    gsap.set(lines, { yPercent: 118 });
    gsap.set(scrimRef.current, { autoAlpha: 0 });
    const tl = gsap
      .timeline({ delay: 0.3 })
      .to(
        scrimRef.current,
        { autoAlpha: 1, duration: 1.1, ease: "power2.out" },
        0,
      )
      .to(
        lines,
        { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.13 },
        0.1,
      );
    return () => tl.kill();
  }, []);

  // --- Scroll film: camera orbits the villa, glides through the door into
  // the empty house, and the room designs itself, then unpins into The
  // Workflow. Nav bows out over the first 10%; title + scrim lift over the
  // first act. Desktop reads the 4K set on a longer pin; phones the lighter
  // 1280px set on a shorter pin (fewer pixels cover a given progress). ---
  useScrubFilm({
    rootRef,
    canvasRef,
    frameCount: FRAME_COUNT,
    variants: [
      {
        query:
          "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        srcOf: framePath,
        pinVh: 6,
      },
      {
        query:
          "(max-width: 1023px) and (prefers-reduced-motion: no-preference)",
        srcOf: framePathM,
        pinVh: 4.5,
      },
    ],
    onProgress: (p) => {
      if (!navRef.current) {
        navRef.current = document.querySelector("div.viz-scope.fixed");
      }
      const nav = navRef.current;
      if (nav) {
        gsap.set(nav, {
          opacity: p < 0.1 ? 1 - p / 0.1 : 0,
          pointerEvents: p < 0.05 ? "auto" : "none",
        });
      }
      // Title + scrim lift away together across the first act.
      const out = Math.min(p / 0.16, 1);
      gsap.set(copyRef.current, { autoAlpha: 1 - out, yPercent: -10 * out });
      gsap.set(scrimRef.current, { autoAlpha: 1 - out });
    },
    onLeave: () => {
      const nav = navRef.current;
      if (nav)
        gsap.to(nav, { opacity: 1, pointerEvents: "auto", duration: 0.4 });
    },
  });

  return (
    <section
      ref={rootRef}
      className="viz-scope relative h-svh w-full overflow-hidden bg-[var(--viz-well)]"
    >
      {/* The film — scrubbed on the canvas at every viewport. Reduced-motion
          users see the first frame as a static backdrop instead. */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 hidden motion-safe:block"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div
        className="absolute inset-0 bg-cover bg-center motion-safe:hidden"
        style={{ backgroundImage: `url('${framePathM(0)}')` }}
        aria-hidden="true"
      />

      {/* Legibility scrim: a soft dark wash behind the title, fading with it. */}
      <div
        ref={scrimRef}
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 90% at 50% 40%, rgba(26,22,16,0.64) 0%, rgba(26,22,16,0.34) 44%, transparent 74%)",
        }}
        aria-hidden="true"
      />

      {/* Title sequence. Each clip container carries bottom padding pulled
          back by negative margin, so mask-reveal never crops descenders. */}
      <div
        ref={copyRef}
        className="absolute inset-x-0 top-[25%] flex flex-col items-center px-6 text-center"
      >
        <div className="-mb-[0.2em] overflow-hidden pb-[0.2em]">
          <p className="hero-copy-line viz-mono text-[11px] tracking-[0.32em] text-white/80 uppercase sm:text-xs">
            Your materials guide
          </p>
        </div>
        <h1 className="viz-serif mt-4 max-w-3xl text-4xl leading-[1.12] text-white sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="block -mb-[0.16em] overflow-hidden pb-[0.16em]">
            <span className="hero-copy-line block">Materials matched.</span>
          </span>
          <span className="block -mb-[0.16em] overflow-hidden pb-[0.16em]">
            <span className="hero-copy-line block">Projects simplified.</span>
          </span>
          <span className="block -mb-[0.16em] overflow-hidden pb-[0.16em]">
            <span className="hero-copy-line block italic">
              Designs elevated.
            </span>
          </span>
        </h1>
        <div className="mt-8 -mb-[0.2em] overflow-hidden pb-[0.2em]">
          <p className="hero-copy-line viz-mono text-[10px] tracking-[0.3em] text-white/75 uppercase sm:text-[11px]">
            Upload · Match · Render · Spec
          </p>
        </div>
      </div>

      {/* Scroll cue */}
      <p className="viz-mono absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.3em] text-white/60 uppercase lg:bottom-8">
        Scroll
      </p>
    </section>
  );
}
