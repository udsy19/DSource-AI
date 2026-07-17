"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CadReveal from "@/components/features/CadReveal";
import Reveal from "@/components/Reveal";
import featureRoom from "../../../public/feature-room.webp";
import mbTable from "../../../public/material-finder-images/Coffee Table.png";
import mbLamp from "../../../public/material-finder-images/Curtain.png";
import folioA from "../../../public/material-finder-images/DS 001.webp";
import folioB from "../../../public/material-finder-images/DS 006.png";
import libA from "../../../public/material-finder-images/Frame 86.png";
import mbRug from "../../../public/material-finder-images/Frame 90.png";
import libB from "../../../public/material-finder-images/Frame 90.png";
import folioC from "../../../public/material-finder-images/Frame 96.png";
import libC from "../../../public/material-finder-images/Frame 99.png";
import mbArt from "../../../public/material-finder-images/Frame 118.png";
import mbSofa from "../../../public/material-finder-images/Sofa 1.png";
import lib1 from "../../../public/popular-1.jpg";
import lib2 from "../../../public/popular-2.jpg";
import lib4 from "../../../public/popular-4.jpg";
import storyEmpty from "../../../public/story/empty.webp";
import storyFurnished from "../../../public/story/furnished.webp";

/** Cursor-driven 3D tilt. Writes the transform straight to the node so it
 *  never re-renders; respects reduced-motion by staying flat. */
function Tilt({ children, className = "", max = 8 }) {
  const ref = useRef(null);
  const reduce = useRef(false);
  useEffect(() => {
    reduce.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);
  const onMove = (e) => {
    if (reduce.current) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${px * max * 2}deg) rotateX(${-py * max * 2}deg)`;
  };
  const reset = () => {
    if (ref.current)
      ref.current.style.transform = "rotateY(0deg) rotateX(0deg)";
  };
  return (
    <div style={{ perspective: "1100px" }} className={className}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        className="h-full w-full transition-transform duration-300 ease-out"
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
      </div>
    </div>
  );
}

/** Draggable before→after reveal for the AI Render feature. On first view
 *  it auto-sweeps once to signal it's interactive, then hands over. */
function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const wrapRef = useRef(null);
  const touched = useRef(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || touched.current) return;
        touched.current = true;
        io.disconnect();
        const demo = { v: 50 };
        gsap
          .timeline({ delay: 0.3 })
          .to(demo, {
            v: 16,
            duration: 0.7,
            ease: "power2.inOut",
            onUpdate: () => setPos(demo.v),
          })
          .to(demo, {
            v: 84,
            duration: 1.1,
            ease: "power2.inOut",
            onUpdate: () => setPos(demo.v),
          })
          .to(demo, {
            v: 50,
            duration: 0.7,
            ease: "power2.out",
            onUpdate: () => setPos(demo.v),
          });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const onManual = (v) => {
    touched.current = true;
    setPos(v);
  };
  return (
    <div ref={wrapRef} className="relative overflow-hidden rounded-xl">
      <Image
        src={storyFurnished}
        alt="The room, fully designed"
        className="h-auto w-full"
      />
      <Image
        src={storyEmpty}
        alt="The same room, empty, before designing"
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      <span
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-[var(--viz-paper)] shadow-[0_0_8px_rgba(0,0,0,0.5)]"
        style={{ left: `${pos}%` }}
        aria-hidden="true"
      />
      <span className="viz-mono pointer-events-none absolute top-3 left-3 rounded bg-black/55 px-2 py-0.5 text-[10px] tracking-widest text-white">
        EMPTY
      </span>
      <span className="viz-mono pointer-events-none absolute top-3 right-3 rounded bg-[var(--viz-blue)]/80 px-2 py-0.5 text-[10px] tracking-widest text-white">
        DESIGNED
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => onManual(Number(e.target.value))}
        aria-label="Drag to compare empty and designed"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

// --- Bespoke visuals, one per feature ---

const FindVisual = () => (
  <div className="relative overflow-hidden rounded-xl">
    <Image
      src={featureRoom}
      alt="A room with pieces detected and matched"
      className="h-auto w-full"
    />
    {[
      { top: "34%", left: "46%" },
      { top: "58%", left: "72%" },
      { top: "74%", left: "44%" },
      { top: "24%", left: "80%" },
    ].map((d) => (
      <span
        key={`${d.top}-${d.left}`}
        className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ top: d.top, left: d.left }}
      >
        <span className="absolute h-5 w-5 animate-ping rounded-full border-2 border-white/50" />
        <span className="h-3 w-3 rounded-full bg-white/90" />
      </span>
    ))}
    <div className="absolute bottom-4 left-4 w-44 rounded-lg border border-[var(--viz-line)] bg-[var(--viz-paper)]/95 p-2.5 shadow-xl backdrop-blur-sm">
      <p className="viz-label">Found in this room</p>
      <div className="mt-1.5 flex items-center gap-2">
        <Image
          src={mbSofa}
          alt=""
          width={44}
          height={36}
          className="h-9 w-11 rounded border border-[var(--viz-line)] object-cover"
        />
        <div>
          <p className="text-xs font-semibold">Bouclé Sofa</p>
          <p className="text-[11px] text-[var(--viz-muted)]">₹1,84,000</p>
        </div>
      </div>
    </div>
  </div>
);

const BoardVisual = () => {
  const chips = [
    { src: mbSofa, cls: "top-[8%] left-[6%] w-40 rotate-[-5deg]" },
    { src: mbTable, cls: "top-[38%] left-[30%] w-36 rotate-[3deg]" },
    { src: mbLamp, cls: "top-[10%] right-[8%] w-28 rotate-[6deg]" },
    { src: mbRug, cls: "bottom-[8%] left-[10%] w-44 rotate-[2deg]" },
    { src: mbArt, cls: "bottom-[12%] right-[10%] w-32 rotate-[-4deg]" },
  ];
  return (
    <div className="relative h-72 w-full overflow-hidden rounded-xl bg-[var(--viz-ground)] viz-grain sm:h-80">
      {chips.map((c) => (
        <div
          key={c.cls}
          className={`absolute overflow-hidden rounded-lg border border-[var(--viz-line)] bg-white shadow-lg ${c.cls}`}
        >
          <Image src={c.src} alt="" className="h-auto w-full" />
        </div>
      ))}
      <span className="viz-label absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--viz-paper)]/90 px-3 py-1">
        Your mood board
      </span>
    </div>
  );
};

const SpecVisual = () => {
  const rows = [
    { name: "Bouclé Sofa", code: "SF-03", finish: "Ivory", qty: "1" },
    { name: "Oak Coffee Table", code: "TB-01", finish: "Warm oak", qty: "1" },
    { name: "Jute Rug 8×10", code: "RG-02", finish: "Natural", qty: "1" },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--viz-line)] bg-[var(--viz-paper)]">
      <div className="flex flex-wrap gap-px bg-[var(--viz-line)]">
        {[
          ["Sheet", "SP-01"],
          ["Project", "Serene Villa"],
          ["Items", "3"],
        ].map(([k, v]) => (
          <div
            key={k}
            className="min-w-24 flex-1 bg-[var(--viz-paper)] px-3 py-1.5"
          >
            <p className="viz-label">{k}</p>
            <p className="viz-mono mt-0.5 text-xs uppercase">{v}</p>
          </div>
        ))}
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-t border-[var(--viz-line)]">
            {["Item", "Code", "Finish", "Qty"].map((h) => (
              <th key={h} className="viz-label px-3 py-2 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-t border-[var(--viz-line)]">
              <td className="viz-serif px-3 py-2.5 text-sm">{r.name}</td>
              <td className="viz-mono px-3 py-2.5 text-xs">{r.code}</td>
              <td className="viz-mono px-3 py-2.5 text-xs">{r.finish}</td>
              <td className="viz-mono px-3 py-2.5 text-xs">{r.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const LibraryVisual = () => (
  <div className="relative overflow-hidden rounded-xl border border-[var(--viz-line)] bg-[var(--viz-well)] p-2">
    <div className="grid grid-cols-3 gap-2">
      {[
        { src: lib1, k: "a" },
        { src: libA, k: "b" },
        { src: lib2, k: "c" },
        { src: libB, k: "d" },
        { src: lib4, k: "e" },
        { src: libC, k: "f" },
      ].map((t) => (
        <div key={t.k} className="overflow-hidden rounded-md">
          <Image
            src={t.src}
            alt=""
            className="aspect-square h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
    <div className="absolute right-3 bottom-3 rounded-full bg-[var(--viz-paper)] px-3 py-1">
      <span className="viz-mono text-[11px] tracking-widest text-[var(--viz-ink)] uppercase">
        1,51,000 on file
      </span>
    </div>
  </div>
);

const FolioVisual = () => {
  const covers = [
    { src: folioC, cls: "rotate-[-8deg] -translate-x-14 z-10" },
    { src: folioB, cls: "rotate-[4deg] translate-x-2 z-20" },
    { src: folioA, cls: "rotate-[12deg] translate-x-16 z-30" },
  ];
  return (
    <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-xl bg-[var(--viz-ground)] viz-grain sm:h-80">
      {covers.map((c) => (
        <div
          key={c.cls}
          className={`absolute h-52 w-40 overflow-hidden rounded-xl border border-[var(--viz-line)] bg-white shadow-2xl ${c.cls}`}
        >
          <Image src={c.src} alt="" className="h-full w-full object-cover" />
          <span className="viz-label absolute bottom-2 left-2 rounded bg-[var(--viz-paper)]/90 px-1.5">
            Folio
          </span>
        </div>
      ))}
    </div>
  );
};

const VISUALS = {
  render: BeforeAfter,
  find: FindVisual,
  board: BoardVisual,
  cad: CadReveal,
  spec: SpecVisual,
  library: LibraryVisual,
  folio: FolioVisual,
};

// Catalog order — the way the features are presented on the Simple view.
export const FEATURES = [
  {
    n: "01",
    key: "render",
    eyebrow: "AI Room Render",
    title: "Upload an empty room. Watch it become a home.",
    blurb:
      "Bring a photo of a bare space, set your style, or drop in the exact products you want — and see it fully rendered. Then click any piece to find where to buy it.",
    cta: "Open the visualizer",
    href: "/ai-visualizer",
  },
  {
    n: "02",
    key: "find",
    eyebrow: "AI Material Finder",
    title: "Point at any room. We shop every piece.",
    blurb:
      "The AI reads a finished scene and matches each item — sofa, lamp, rug, tile — to a real, live-priced product from the material bank.",
    cta: "Try the finder",
    href: "/material-finder",
  },
  {
    n: "03",
    key: "board",
    eyebrow: "Mood Board Creator",
    title: "Pull your ideas into one board.",
    blurb:
      "Combine products, colours, and an inspiration photo into a cohesive mood board the AI composes for you — the fastest way from feeling to direction.",
    cta: "Compose a board",
    href: "/ai-visualizer",
  },
  {
    n: "04",
    key: "cad",
    eyebrow: "Image to CAD",
    title: "Turn a photo into a clean 2D drawing.",
    blurb:
      "Convert a room photo or sketch into a tidy floor plan or 2D view. Interior elevation drawings are on the way — the same scene, drafted wall by wall.",
    cta: "Convert to CAD",
    href: "/ai-visualizer",
    soon: true,
  },
  {
    n: "05",
    key: "spec",
    eyebrow: "QuoteBoard · Spec Builder",
    title: "Every choice becomes a spec sheet.",
    blurb:
      "Add the pieces you love and they land on one drafting-sheet document — codes, finishes, quantities, live prices — ready to download or send to quote.",
    cta: "Build a spec",
    href: "/spec-builder",
  },
  {
    n: "06",
    key: "library",
    eyebrow: "Digital Library · Vendor Directory",
    title: "A hundred and fifty thousand products, live-priced.",
    blurb:
      "Research the whole material bank — real suppliers, real prices, filterable by category, brand, colour and finish. The catalogue behind every match.",
    cta: "Browse the library",
    href: "/marketplace/products",
  },
  {
    n: "07",
    key: "folio",
    eyebrow: "Folios",
    title: "Organise everything into folios.",
    blurb:
      "Keep renders, boards, and specs together per project. File a favourite, group a room, and pick up exactly where you left off.",
    cta: "Open folios",
    href: "/studio",
  },
];

export default function FeaturesShowcase({ embedded = false }) {
  const rootRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const ctx = gsap.context(() => {
          for (const el of rootRef.current.querySelectorAll(".feat-visual")) {
            gsap.fromTo(
              el,
              { y: 60 },
              {
                y: -60,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.8,
                },
              },
            );
          }
        }, rootRef);
        return () => ctx.revert();
      },
    );
    return () => mm.revert();
  }, []);

  return (
    <div ref={rootRef} className="viz-scope w-full">
      <div
        className={`px-4 pb-24 sm:px-6 md:px-8 lg:px-12 ${
          embedded ? "pt-6" : "pt-24 sm:pt-32"
        }`}
      >
        {/* Masthead */}
        <header>
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource Studio</p>
              <p className="viz-label hidden shrink-0 sm:block">
                Seven tools, one studio
              </p>
            </div>
            <div className="relative pt-5">
              <span
                className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
                aria-hidden="true"
              />
              <span className="viz-dots-rule" aria-hidden="true" />
              <h1 className="viz-serif text-4xl leading-[1.05] sm:text-5xl md:text-[3.8rem]">
                From an empty room
                <br />
                to a sourced design.
              </h1>
              <p className="viz-serif mt-5 max-w-2xl text-lg italic text-[var(--viz-muted)] sm:text-xl">
                Everything DSource does, end to end — imagine it, identify it,
                draw it, spec it, source it, and keep it all in one place.
              </p>
            </div>
          </Reveal>

          {/* Quick index chips */}
          <Reveal delay={120}>
            <div className="mt-8 flex flex-wrap gap-2">
              {FEATURES.map((f) => (
                <a
                  key={f.key}
                  href={`#${f.key}`}
                  className="viz-mono rounded-full border border-[var(--viz-line)] px-3 py-1.5 text-[11px] tracking-[0.06em] text-[var(--viz-muted)] uppercase transition-colors hover:border-[var(--viz-ink)] hover:text-[var(--viz-ink)]"
                >
                  {f.n} · {f.eyebrow}
                </a>
              ))}
            </div>
          </Reveal>
        </header>

        {/* Feature sections */}
        <div className="mt-20 flex flex-col gap-28 sm:mt-28 sm:gap-36">
          {FEATURES.map((f, i) => {
            const Visual = VISUALS[f.key];
            const flip = i % 2 === 1;
            return (
              <section
                key={f.key}
                id={f.key}
                className="grid scroll-mt-28 grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-14"
              >
                <Reveal className={`lg:col-span-5 ${flip ? "lg:order-2" : ""}`}>
                  <p className="viz-mono text-xs tracking-[0.1em] text-[var(--viz-blue)]">
                    {f.n} — {f.eyebrow}
                  </p>
                  <h2 className="viz-serif mt-4 text-3xl leading-tight sm:text-4xl">
                    {f.title}
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--viz-muted)] sm:text-base">
                    {f.blurb}
                  </p>
                  <Link
                    href={f.href}
                    className="viz-btn group mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--viz-ink)] px-6 py-3 text-[var(--viz-paper)] transition-colors hover:bg-black"
                  >
                    {f.cta}
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                  {f.soon && (
                    <p className="viz-mono mt-3 text-[11px] tracking-[0.08em] text-[var(--viz-muted)] uppercase">
                      Floor plans live today · elevations coming soon
                    </p>
                  )}
                </Reveal>

                <div className={`lg:col-span-7 ${flip ? "lg:order-1" : ""}`}>
                  <div className="feat-visual">
                    <Tilt>
                      <div className="rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-2 shadow-xl">
                        <Visual />
                      </div>
                    </Tilt>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* The flow */}
        <Reveal>
          <section className="mt-28 sm:mt-36">
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">One workflow</p>
              <p className="viz-label hidden shrink-0 sm:block">
                Imagine → source → keep
              </p>
            </div>
            <span
              className="viz-rule block h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-4">
              {[
                "Render",
                "Find",
                "Board",
                "Draw",
                "Spec",
                "Source",
                "Organize",
              ].map((step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="viz-serif text-xl text-[var(--viz-ink)] sm:text-2xl">
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <span className="viz-mono text-[var(--viz-muted)]">→</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Closing CTA */}
        <Reveal>
          <div className="mt-16 flex flex-col items-start gap-5 border-t border-[var(--viz-line)] pt-10 sm:flex-row sm:items-center sm:justify-between">
            <p className="viz-serif text-2xl italic text-[var(--viz-muted)] sm:text-3xl">
              Start with a room. We&rsquo;ll take it the rest of the way.
            </p>
            <Link
              href="/ai-visualizer"
              className="viz-btn shrink-0 rounded-full bg-[var(--viz-ink)] px-8 py-4 text-[var(--viz-paper)] hover:bg-black"
            >
              Open the studio
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
