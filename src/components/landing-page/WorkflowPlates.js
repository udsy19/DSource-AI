"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import sourceImage from "../../../public/material-finder-images/Frame 33 copy.png";
import sourceImage2 from "../../../public/source-image-2.jpg";
import sourceImage3 from "../../../public/source-image-3.jpg";
import Reveal from "../Reveal";

const SPEC_ROWS = [
  {
    id: "source-1",
    image: sourceImage,
    name: "Feature Sofa",
    code: "MB-03",
    productName: "Modular Chair",
    finish: "Ink",
  },
  {
    id: "source-2",
    image: sourceImage2,
    name: "Lamp",
    code: "MS-01",
    productName: "Skygarden Lamp",
    finish: "Golden",
  },
  {
    id: "source-3",
    image: sourceImage3,
    name: "Marble",
    code: "MS-03",
    productName: "Vidar",
    finish: "Honed",
  },
];

const HOTSPOTS = [
  {
    id: "wall",
    label: "Wall",
    dot: { top: "18%", right: "18%" },
    tag: { top: "26%", right: "6%" },
  },
  {
    id: "lamp",
    label: "Lamp",
    dot: { top: "48%", left: "25%" },
    tag: { top: "38%", left: "16%" },
  },
  {
    id: "bedsheet",
    label: "Bedsheet",
    dot: { bottom: "30%", left: "42%" },
    tag: { bottom: "16%", left: "33%" },
  },
];

const Dot = ({ style }) => (
  <span className="absolute flex items-center justify-center" style={style}>
    <span className="absolute h-4 w-4 animate-ping rounded-full border border-white/40" />
    <span className="absolute h-3 w-3 rounded-full border border-white/60" />
    <span className="h-2.5 w-2.5 rounded-full bg-white/85" />
  </span>
);

/**
 * The workflow told as three plates — Design, Discover, Source — rising past
 * each other at different parallax depths as the section scrolls through.
 * The numbering is real: it is the order a project actually moves.
 */
export default function WorkflowPlates() {
  const rootRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const plates = rootRef.current.querySelectorAll(".workflow-plate");
        plates.forEach((plate, i) => {
          gsap.fromTo(
            plate,
            { y: 120 + i * 90, rotationX: -8, autoAlpha: 0.4 },
            {
              y: 0,
              rotationX: 0,
              autoAlpha: 1,
              ease: "none",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top 85%",
                end: "top 15%",
                scrub: 0.8,
              },
            },
          );
        });
      },
    );
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="viz-scope w-full px-6 py-16 sm:px-10 md:px-14 md:py-24 lg:px-16"
      style={{ perspective: "1400px" }}
    >
      {/* Folio header */}
      <Reveal>
        <div className="flex items-baseline justify-between gap-4 pb-2">
          <p className="viz-label">The workflow</p>
          <p className="viz-label hidden sm:block">
            Imagine → identify → procure
          </p>
        </div>
        <div className="relative pt-5">
          <span
            className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
            aria-hidden="true"
          />
          <h2 className="viz-serif text-3xl sm:text-4xl">
            One room, <span className="italic">three moves.</span>
          </h2>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 lg:grid-cols-3 lg:gap-6">
        {/* 01 — Design */}
        <Link href="/ai-visualizer" className="workflow-plate group block">
          <p className="viz-label">Step 01 — Design</p>
          <div className="relative mt-3 h-[300px] overflow-hidden rounded-2xl border border-[var(--viz-line)] sm:h-[380px] lg:h-[420px]">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage:
                  "url('/material-finder-images/Minimalist Interior Design.png')",
              }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 p-5 backdrop-blur-md">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-white/90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 16.5V7.5L12 2 3 7.5v9l9 5.5 9-5.5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7.5l9 5.5 9-5.5M12 13v9.5"
                />
              </svg>
            </div>
          </div>
          <h3 className="viz-serif mt-4 text-2xl">AI Visualizer</h3>
          <p className="mt-1 text-sm text-[var(--viz-muted)]">
            Turn a photo of your space into the design you meant — checked
            against your brief.
          </p>
        </Link>

        {/* 02 — Discover */}
        <Link href="/material-finder" className="workflow-plate group block">
          <p className="viz-label">Step 02 — Discover</p>
          <div className="relative mt-3 h-[300px] overflow-hidden rounded-2xl border border-[var(--viz-line)] sm:h-[380px] lg:h-[420px]">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage:
                  "url('/material-finder-images/Minimalist Bedroom.png')",
              }}
            />
            {HOTSPOTS.map((h) => (
              <span key={h.id} className="contents">
                <Dot style={h.dot} />
                <span
                  className="absolute rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md"
                  style={h.tag}
                >
                  <span className="text-xs font-medium text-white">
                    {h.label}
                  </span>
                </span>
              </span>
            ))}
          </div>
          <h3 className="viz-serif mt-4 text-2xl">AI Material Finder</h3>
          <p className="mt-1 text-sm text-[var(--viz-muted)]">
            Point at anything in a photo and find the product it came from.
          </p>
        </Link>

        {/* 03 — Source: a static exhibit — the spec sheet is reached from
            inside the studio, not from the brochure. */}
        <div className="workflow-plate group block">
          <p className="viz-label">Step 03 — Source</p>
          <div className="mt-3 flex h-[300px] flex-col justify-center gap-3 sm:h-[380px] lg:h-[420px]">
            {SPEC_ROWS.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-3 transition-shadow group-hover:shadow-md"
              >
                <Image
                  src={item.image}
                  alt={item.name}
                  width={72}
                  height={72}
                  className="h-16 w-16 rounded-lg border border-[var(--viz-line)] object-cover"
                />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <p className="truncate text-sm font-semibold">
                      {item.name}
                    </p>
                    <p className="viz-label">Item</p>
                  </div>
                  <div>
                    <p className="truncate text-sm font-semibold">
                      {item.productName}
                    </p>
                    <p className="viz-label">Product</p>
                  </div>
                  <div>
                    <p className="viz-mono text-sm">{item.code}</p>
                    <p className="viz-label">Code</p>
                  </div>
                  <div>
                    <p className="truncate text-sm font-semibold">
                      {item.finish}
                    </p>
                    <p className="viz-label">Finish</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <h3 className="viz-serif mt-4 text-2xl">Streamlined specs</h3>
          <p className="mt-1 text-sm text-[var(--viz-muted)]">
            Every choice lands on one spec sheet — codes, finishes, suppliers.
          </p>
        </div>
      </div>
    </section>
  );
}
