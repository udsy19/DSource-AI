"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useScrubFilm } from "@/components/useScrubFilm";

// The narrated story is a scroll-scrubbed film — the same canvas frame-scrub
// the homepage hero uses (useScrubFilm). One continuous golden-hour journey
// carries the whole DSource workflow through a single room: it furnishes
// itself, the camera pushes in on the sourced pieces, tilts to a mood board of
// materials, the render dissolves into a blue CAD drawing and back into a teak
// elevation, and it settles on the spec sheet. Chapter copy and product
// callouts are pinned over the film and swap in at scroll checkpoints.
//
// 242 frames extracted at 8fps from six chained Higgsfield morphs (bespoke
// to this page — distinct from the homepage hero film). Desktop reads the
// 1920px set; phones read a lighter 1280px set.
const FRAME_COUNT = 242;
const frameName = (i) => `frame_${String(i + 1).padStart(4, "0")}.webp`;
const framePath = (i) => `/story-frames/${frameName(i)}`;
const framePathM = (i) => `/story-frames-m/${frameName(i)}`;

// Each chapter is a beat of the journey, keyed to the scroll progress (`at`,
// 0–1) where its copy takes over. `pin`, when present, is a clickable product
// callout floated over the film — representative pieces, each opening the
// feature that surfaces them. Positions are % of the stage.
const CHAPTERS = [
  {
    at: 0,
    eyebrow: "AI Room Render",
    title: "Start with an empty room.",
    line: "Upload a bare space and set the direction you want.",
    href: "/ai-visualizer",
  },
  {
    at: 0.09,
    eyebrow: "AI Room Render",
    title: "Watch it become a home.",
    line: "The room designs itself — furniture, light, materials, all in place.",
    href: "/ai-visualizer",
  },
  {
    at: 0.25,
    eyebrow: "AI Material Finder",
    title: "Every piece, sourced.",
    line: "Point at anything in the room and we identify the real product.",
    href: "/ai-material-finder",
    pin: {
      x: 52,
      y: 52,
      label: "Bouclé lounge chair",
      meta: "Matched · ₹1,84,000",
    },
  },
  {
    at: 0.42,
    eyebrow: "Mood Board Creator",
    title: "Pull your ideas together.",
    line: "Colours, textures and pieces collect into one clear board.",
    href: "/ai-visualizer",
    pin: {
      x: 50,
      y: 46,
      label: "Travertine · warm stone",
      meta: "Added to board",
    },
  },
  {
    at: 0.58,
    eyebrow: "Image to CAD",
    title: "Drawn to scale.",
    line: "The same room resolves into a clean, dimensioned 2D drawing.",
    href: "/ai-visualizer",
  },
  {
    at: 0.72,
    eyebrow: "Image to CAD",
    title: "Every elevation, rendered.",
    line: "Linework lifts back into an elevation you can hand to a builder.",
    href: "/ai-visualizer",
  },
  {
    at: 0.87,
    eyebrow: "QuoteBoard · Spec Builder",
    title: "One spec sheet, ready to send.",
    line: "Every choice lands on a live-priced sheet — quote in hand.",
    href: "/spec-builder",
  },
];

/**
 * Scroll-scrubbed narrated story. The film pins and scrubs with scroll (like
 * the homepage hero); chapter copy cross-fades in at each checkpoint and
 * product callouts float over the frame, each linking to the feature behind
 * it. A progress rail marks the chapters and lets you jump. Reduced-motion and
 * no-JS readers get the first frame plus the chapters as a readable list.
 */
export default function NarratedStory() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const fillRef = useRef(null);
  const stRef = useRef(null);
  const [active, setActive] = useState(0);

  useScrubFilm({
    rootRef,
    canvasRef,
    frameCount: FRAME_COUNT,
    stRef,
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
      // Rail fill is driven imperatively so scrolling never re-renders React.
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
      let idx = 0;
      for (let i = 0; i < CHAPTERS.length; i++)
        if (p >= CHAPTERS[i].at) idx = i;
      setActive((prev) => (prev === idx ? prev : idx));
    },
  });

  // Jump the scroll to a chapter's point in the pinned film.
  const jumpTo = (i) => {
    const st = stRef.current;
    if (!st) return;
    const target = st.start + (st.end - st.start) * CHAPTERS[i].at;
    const lenis = typeof window !== "undefined" ? window.__lenis : null;
    if (lenis) lenis.scrollTo(target, { duration: 0.9 });
    else window.scrollTo(0, target);
  };

  const ch = CHAPTERS[active];

  return (
    <>
      {/* The scroll film — pinned, scrubbed on the canvas at every viewport
          except reduced-motion, which reads the static block below instead. */}
      <section
        ref={rootRef}
        className="viz-scope relative hidden h-svh w-full overflow-hidden bg-[var(--viz-well)] motion-safe:block"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Legibility scrim — darkest at the bottom where the copy sits. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(26,22,16,0.78) 0%, rgba(26,22,16,0.22) 38%, transparent 62%)",
          }}
          aria-hidden="true"
        />

        {/* Product callout — floats over the frame on chapters that carry one. */}
        {ch.pin
          ? <button
              key={`pin-${active}`}
              type="button"
              onClick={() => jumpTo(active)}
              className="mf-fade absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${ch.pin.x}%`, top: `${ch.pin.y}%` }}
              aria-label={`${ch.pin.label} — ${ch.pin.meta}`}
            >
              <span className="relative flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--viz-paper)] opacity-60" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[var(--viz-paper)] bg-[var(--viz-blue)]" />
              </span>
              <span className="absolute top-5 left-1/2 w-max max-w-[68vw] -translate-x-1/2 rounded-lg border border-white/15 bg-[var(--viz-well)]/85 px-3 py-2 text-left backdrop-blur-sm sm:top-1/2 sm:left-6 sm:max-w-none sm:translate-x-0 sm:-translate-y-1/2">
                <span className="viz-mono block text-[10px] tracking-[0.06em] text-white/60 uppercase">
                  {ch.pin.meta}
                </span>
                <span className="viz-serif block text-sm text-white">
                  {ch.pin.label}
                </span>
              </span>
            </button>
          : null}

        {/* Chapter copy — lower third, cross-fading in on each checkpoint. */}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-16 sm:px-10 sm:pb-20 lg:px-16">
          <div key={`copy-${active}`} className="mf-fade max-w-2xl">
            <p className="viz-mono text-[11px] tracking-[0.28em] text-white/70 uppercase">
              {String(active + 1).padStart(2, "0")} /{" "}
              {String(CHAPTERS.length).padStart(2, "0")}
              <span className="mx-3 text-white/30">·</span>
              {ch.eyebrow}
            </p>
            <h2 className="viz-serif mt-3 text-3xl leading-[1.1] text-white sm:text-4xl md:text-5xl">
              {ch.title}
            </h2>
            <p className="viz-serif mt-3 max-w-xl text-base text-white/75 italic sm:text-lg">
              {ch.line}
            </p>
            <Link
              href={ch.href}
              className="viz-mono mt-5 inline-block rounded-full border border-white/30 px-4 py-2 text-[11px] tracking-[0.08em] text-white uppercase transition-colors hover:bg-white hover:text-[var(--viz-ink)]"
            >
              Open {ch.eyebrow.split(" · ")[0]} →
            </Link>
          </div>

          {/* Progress rail — marks each chapter, fills with scroll, jumps on tap. */}
          <div className="mt-8 flex items-center gap-4">
            <div className="relative h-px flex-1 bg-white/20">
              <div
                ref={fillRef}
                className="h-full origin-left bg-white"
                style={{ transform: "scaleX(0)" }}
              />
              {CHAPTERS.map((c, i) => (
                <button
                  key={c.title}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={`Jump to ${c.eyebrow}`}
                  className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
                    i <= active ? "bg-white" : "bg-white/30 hover:bg-white/60"
                  }`}
                  style={{ left: `${c.at * 100}%` }}
                />
              ))}
            </div>
            <p className="viz-mono shrink-0 text-[10px] tracking-[0.28em] text-white/50 uppercase">
              Scroll
            </p>
          </div>
        </div>
      </section>

      {/* Reduced-motion / no-JS: the first frame, then the story as a list. */}
      <section className="viz-scope w-full px-4 py-14 motion-safe:hidden sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div
            className="mb-10 aspect-video w-full rounded-2xl border border-[var(--viz-line)] bg-cover bg-center"
            style={{ backgroundImage: `url('${framePathM(0)}')` }}
            aria-hidden="true"
          />
          <ol className="flex flex-col gap-8">
            {CHAPTERS.map((c, i) => (
              <li key={c.title} className="flex gap-4">
                <span className="viz-mono shrink-0 pt-1 text-xs tracking-[0.1em] text-[var(--viz-blue)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="viz-label">{c.eyebrow}</p>
                  <h2 className="viz-serif mt-1 text-2xl leading-tight">
                    {c.title}
                  </h2>
                  <p className="viz-serif mt-1 text-base text-[var(--viz-muted)] italic">
                    {c.line}
                  </p>
                  <Link
                    href={c.href}
                    className="viz-mono mt-2 inline-block text-[11px] tracking-[0.08em] uppercase underline decoration-[var(--viz-line)] underline-offset-4"
                  >
                    Open →
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
