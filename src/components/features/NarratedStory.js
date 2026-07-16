"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VISUALS } from "@/components/features/FeaturesShowcase";

// The journey, in the order a user actually moves. Scrolling scrubs through
// these scenes (pinned, like the homepage hero); pressing "play" runs the
// Higgsfield voiceover and auto-scrolls the section in sync.
const STORY = [
  {
    kind: "title",
    title: "From an empty room to a sourced design.",
    caption: "Here’s how one empty room becomes a finished, sourced design.",
  },
  {
    kind: "feature",
    key: "folio",
    eyebrow: "Folios",
    caption:
      "It starts with a folio — one project folder that holds everything.",
    href: "/folios",
  },
  {
    kind: "feature",
    key: "render",
    eyebrow: "AI Room Render",
    caption:
      "Upload your empty room, set the style, and watch the AI design it.",
    href: "/ai-visualizer",
  },
  {
    kind: "feature",
    key: "board",
    eyebrow: "Mood Board Creator",
    caption:
      "Pull colours and pieces into a mood board, so the direction stays clear.",
    href: "/ai-visualizer",
  },
  {
    kind: "feature",
    key: "find",
    eyebrow: "AI Material Finder",
    caption: "Point at any piece, and the AI identifies exactly what it is.",
    href: "/ai-material-finder",
  },
  {
    kind: "feature",
    key: "library",
    eyebrow: "Digital Library",
    caption:
      "Each match links to a real product and its supplier — 151,000 on file.",
    href: "/marketplace/products",
  },
  {
    kind: "feature",
    key: "cad",
    eyebrow: "Image to CAD",
    caption:
      "Turn the same room into a clean 2D drawing — elevations on the way.",
    href: "/ai-visualizer",
  },
  {
    kind: "feature",
    key: "spec",
    eyebrow: "QuoteBoard · Spec Builder",
    caption:
      "Every choice lands on one spec sheet — with a quote, ready to send.",
    href: "/spec-builder",
  },
  {
    kind: "title",
    title: "That’s DSource.",
    caption: "From an empty room, to a sourced design.",
  },
];

/**
 * Scroll-scrubbed narrated story. The stage pins (like the homepage hero) and
 * scrolling scrubs through the journey scenes, each cross-fading in. Pressing
 * "Play with voiceover" runs the Higgsfield narration and auto-scrolls the
 * pinned range in sync, so it plays hands-free. Small screens / reduced-motion
 * fall back to a normal stacked scroll.
 */
export default function NarratedStory() {
  const rootRef = useRef(null);
  const audioRef = useRef(null);
  const stRef = useRef(null);
  const [scene, setScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const [voicing, setVoicing] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      () => {
        const st = ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: `+=${window.innerHeight * (STORY.length - 1) * 0.85}`,
          pin: root.querySelector(".story-stage"),
          pinSpacing: true,
          scrub: 0.6,
          onUpdate: (self) => {
            setProgress(self.progress);
            setScene(Math.round(self.progress * (STORY.length - 1)));
          },
        });
        stRef.current = st;
        return () => {
          stRef.current = null;
          st.kill();
        };
      },
    );
    return () => mm.revert();
  }, []);

  // Play → narrate + auto-scroll the pinned range over the audio's duration.
  const playVoice = () => {
    const a = audioRef.current;
    const st = stRef.current;
    const lenis = typeof window !== "undefined" ? window.__lenis : null;
    if (!a) return;
    a.currentTime = 0;
    a.play();
    setVoicing(true);
    a.onended = () => setVoicing(false);
    if (st && lenis) {
      const drive = () =>
        lenis.scrollTo(st.end, {
          duration: a.duration || 51,
          easing: (t) => t,
        });
      if (a.duration) drive();
      else a.addEventListener("loadedmetadata", drive, { once: true });
    }
  };
  const stopVoice = () => {
    audioRef.current?.pause();
    setVoicing(false);
  };

  const jumpTo = (i) => {
    const st = stRef.current;
    const lenis = typeof window !== "undefined" ? window.__lenis : null;
    if (!st || !lenis) {
      setScene(i);
      return;
    }
    const target = st.start + (st.end - st.start) * (i / (STORY.length - 1));
    lenis.scrollTo(target, { duration: 0.8 });
  };

  const s = STORY[scene];
  const Visual = s.kind === "feature" ? VISUALS[s.key] : null;

  return (
    <div ref={rootRef} className="viz-scope w-full">
      {/* biome-ignore lint/a11y/useMediaCaption: captions are shown on-screen as the story text */}
      <audio ref={audioRef} src="/features-narration.mp3" preload="auto" />

      {/* Desktop: pinned, scroll-scrubbed stage */}
      <div className="story-stage hidden min-h-svh flex-col items-center justify-center px-4 sm:px-6 md:flex">
        <div className="w-full max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--viz-line)] viz-grain">
            <div className="relative flex min-h-[50vh] items-center justify-center p-6 sm:min-h-[54vh] sm:p-10">
              {s.kind === "title"
                ? <div key={`t-${scene}`} className="mf-fade text-center">
                    <p className="viz-label">DSource Studio · The story</p>
                    <h2 className="viz-serif mx-auto mt-4 max-w-2xl text-4xl leading-tight sm:text-5xl md:text-6xl">
                      {s.title}
                    </h2>
                  </div>
                : <div key={`f-${s.key}`} className="mf-fade w-full">
                    <p className="viz-mono text-center text-xs tracking-[0.1em] text-[var(--viz-blue)]">
                      {String(scene).padStart(2, "0")} · {s.eyebrow}
                    </p>
                    <div className="mx-auto mt-4 max-w-2xl">
                      <div className="rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-2 shadow-xl">
                        <Visual />
                      </div>
                    </div>
                  </div>}
            </div>

            {/* Caption lower-third */}
            <div className="border-t border-[var(--viz-line)] bg-[var(--viz-paper)]/85 px-6 py-4 backdrop-blur-sm">
              <p
                key={`cap-${scene}`}
                className="mf-fade viz-serif mx-auto max-w-3xl text-center text-lg italic text-[var(--viz-ink)] sm:text-xl"
              >
                {s.caption}
              </p>
            </div>
          </div>

          {/* Transport */}
          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              onClick={voicing ? stopVoice : playVoice}
              className="viz-mono flex shrink-0 items-center gap-2 rounded-full bg-[var(--viz-ink)] px-4 py-2 text-[11px] tracking-[0.08em] text-[var(--viz-paper)] uppercase"
            >
              {voicing
                ? <>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 fill-current"
                    >
                      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                    </svg>
                    Narrating…
                  </>
                : <>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="ml-0.5 h-3.5 w-3.5 fill-current"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play with voiceover
                  </>}
            </button>
            <div className="relative h-1.5 flex-1 rounded-full bg-[var(--viz-line)]">
              <div
                className="h-full rounded-full bg-[var(--viz-blue)]"
                style={{ width: `${progress * 100}%` }}
              />
              {STORY.map((st, i) => (
                <button
                  key={st.title ?? st.key}
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-label={`Jump to ${st.eyebrow ?? st.title}`}
                  className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors ${
                    i <= scene
                      ? "border-[var(--viz-blue)] bg-[var(--viz-blue)]"
                      : "border-[var(--viz-line)] bg-[var(--viz-paper)] hover:border-[var(--viz-ink)]"
                  }`}
                  style={{ left: `${(i / (STORY.length - 1)) * 100}%` }}
                />
              ))}
            </div>
            {s.kind === "feature"
              ? <Link
                  href={s.href}
                  className="viz-mono hidden shrink-0 rounded-full border border-[var(--viz-ink)] px-4 py-2 text-[11px] tracking-[0.08em] uppercase transition-colors hover:bg-[var(--viz-ink)] hover:text-[var(--viz-paper)] sm:block"
                >
                  Open →
                </Link>
              : <span className="viz-mono hidden shrink-0 text-[11px] text-[var(--viz-muted)] sm:block">
                  Scroll ↓
                </span>}
          </div>

          <p className="viz-mono mt-4 text-center text-[11px] tracking-[0.1em] text-[var(--viz-muted)] uppercase">
            Scroll to play the story — or press play to sit back
          </p>
        </div>
      </div>

      {/* Mobile: scenes stacked, scrolled normally (no pin) */}
      <div className="px-4 pt-6 pb-16 md:hidden">
        <button
          type="button"
          onClick={voicing ? stopVoice : playVoice}
          className="viz-mono mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--viz-ink)] px-4 py-3 text-[11px] tracking-[0.08em] text-[var(--viz-paper)] uppercase"
        >
          {voicing ? "Narrating…" : "▶ Play with voiceover"}
        </button>
        <div className="flex flex-col gap-14">
          {STORY.map((sc, i) =>
            sc.kind === "title"
              ? <div key={sc.title} className="text-center">
                  <p className="viz-label">DSource Studio · The story</p>
                  <h2 className="viz-serif mx-auto mt-3 max-w-md text-3xl leading-tight">
                    {sc.title}
                  </h2>
                </div>
              : <div key={sc.key}>
                  <p className="viz-mono text-xs tracking-[0.1em] text-[var(--viz-blue)]">
                    {String(i).padStart(2, "0")} · {sc.eyebrow}
                  </p>
                  <div className="mt-3 rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-2 shadow-lg">
                    {(() => {
                      const V = VISUALS[sc.key];
                      return <V />;
                    })()}
                  </div>
                  <p className="viz-serif mt-4 text-lg italic text-[var(--viz-ink)]">
                    {sc.caption}
                  </p>
                  <Link
                    href={sc.href}
                    className="viz-mono mt-3 inline-block text-[11px] tracking-[0.08em] uppercase underline decoration-[var(--viz-line)] underline-offset-4"
                  >
                    Open →
                  </Link>
                </div>,
          )}
        </div>
      </div>
    </div>
  );
}
