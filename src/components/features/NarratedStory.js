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
// 303 frames extracted at 10fps from six chained Higgsfield morphs (bespoke
// to this page — distinct from the homepage hero film), shot with slow, gentle
// camera motion so the frames stay sharp and the scrub reads smooth. Desktop
// reads the 1920px set; phones read a lighter 1280px set.
const FRAME_COUNT = 303;
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
  const pinRef = useRef(null);
  const canvasRef = useRef(null);
  const fillRef = useRef(null);
  const hintRef = useRef(null);
  const stRef = useRef(null);
  const [active, setActive] = useState(0);

  useScrubFilm({
    rootRef,
    pinRef,
    canvasRef,
    frameCount: FRAME_COUNT,
    stRef,
    variants: [
      {
        query:
          "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        srcOf: framePath,
        pinVh: 8,
      },
      {
        query:
          "(max-width: 1023px) and (prefers-reduced-motion: no-preference)",
        srcOf: framePathM,
        pinVh: 6,
      },
    ],
    onProgress: (p) => {
      // Rail fill + the opening scroll hint are driven imperatively so
      // scrolling never re-renders React.
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
      if (hintRef.current)
        hintRef.current.style.opacity = `${Math.max(0, 1 - p * 14)}`;
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
        className="viz-scope relative hidden w-full bg-[var(--viz-well)] motion-safe:block"
      >
        {/* Pin an inner element, never the section itself — pinning the
            section reparents it into a GSAP pin-spacer, and React then crashes
            trying to removeChild it when the tab toggles. */}
        <div ref={pinRef} className="relative h-svh w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* Legibility scrims — a soft top wash for the counter and a stronger
              bottom wash under the copy, so text holds over bright frames. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(26,22,16,0.84) 0%, rgba(26,22,16,0.30) 42%, rgba(26,22,16,0) 66%), linear-gradient(to bottom, rgba(26,22,16,0.34) 0%, transparent 22%)",
            }}
            aria-hidden="true"
          />

          {/* Opening cue — makes it obvious the film is scroll-driven; fades
              imperatively as soon as you start moving. */}
          <div
            ref={hintRef}
            className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 text-center transition-opacity duration-300"
          >
            <p className="viz-mono text-xs tracking-[0.28em] text-white/85 uppercase">
              Scroll to walk the project
            </p>
            <span className="animate-bounce text-2xl leading-none text-white/70">
              ↓
            </span>
          </div>

          {/* Product callout — floats over the frame on chapters that carry
              one; clearly tappable, links to the feature behind it. */}
          {ch.pin
            ? <button
                key={`pin-${active}`}
                type="button"
                onClick={() => jumpTo(active)}
                className="mf-fade group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{ left: `${ch.pin.x}%`, top: `${ch.pin.y}%` }}
                aria-label={`${ch.pin.label} — ${ch.pin.meta}`}
              >
                <span className="relative flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--viz-paper)] opacity-70" />
                  <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-[var(--viz-paper)] bg-[var(--viz-blue)] transition-transform group-hover:scale-110" />
                </span>
                <span className="absolute top-6 left-1/2 w-max max-w-[68vw] -translate-x-1/2 rounded-lg border border-white/15 bg-[var(--viz-well)]/85 px-3 py-2 text-left shadow-lg backdrop-blur-sm sm:top-1/2 sm:left-7 sm:max-w-none sm:translate-x-0 sm:-translate-y-1/2">
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
          <div className="absolute inset-x-0 bottom-0 px-6 pb-14 sm:px-10 sm:pb-16 lg:px-16">
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
              <p className="viz-serif mt-3 max-w-xl text-base text-white/80 italic sm:text-lg">
                {ch.line}
              </p>
              <Link
                href={ch.href}
                className="viz-mono mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] tracking-[0.08em] text-[var(--viz-ink)] uppercase transition-colors hover:bg-[var(--viz-blue)] hover:text-white"
              >
                Open {ch.eyebrow.split(" · ")[0]} →
              </Link>
            </div>

            {/* Progress rail — fills with scroll, jumps on tap, counts beats. */}
            <div className="mt-7 flex items-center gap-4">
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
                    className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--viz-well)] transition-colors ${
                      i <= active ? "bg-white" : "bg-white/40 hover:bg-white"
                    }`}
                    style={{ left: `${c.at * 100}%` }}
                  />
                ))}
              </div>
              <p className="viz-mono shrink-0 text-[10px] tracking-[0.28em] text-white/50 uppercase">
                {active + 1} / {CHAPTERS.length}
              </p>
            </div>
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
