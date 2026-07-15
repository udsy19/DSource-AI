"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import Reveal from "../Reveal";

// Community renders, hung as five columns that drift at alternating speeds.
const COLUMNS = [
  [{ id: "gw-1", image: "/material-finder-images/DS 001.png", tall: true }],
  [
    { id: "gw-2", image: "/material-finder-images/DS 006.png" },
    { id: "gw-3", image: "/material-finder-images/Frame 99.png" },
  ],
  [{ id: "gw-4", image: "/material-finder-images/Frame 96.png", tall: true }],
  [
    { id: "gw-5", image: "/made-5.jpg" },
    { id: "gw-6", image: "/made-6.avif" },
  ],
  [{ id: "gw-7", image: "/made-7.avif", tall: true }],
];

/**
 * "Made with DSource.AI" — the community wall. Odd columns sink, even
 * columns rise as you scroll past: the hang of a gallery you walk along.
 */
export default function GalleryWall() {
  const rootRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        rootRef.current.querySelectorAll(".gallery-col").forEach((col, i) => {
          const drift = i % 2 === 0 ? 90 : -90;
          gsap.fromTo(
            col,
            { y: drift },
            {
              y: -drift,
              ease: "none",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.7,
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
      className="viz-scope w-full px-6 pb-16 sm:px-10 md:px-14 md:pb-24 lg:px-16"
    >
      <Reveal>
        <div className="flex items-baseline justify-between gap-4 pb-2">
          <p className="viz-label">The wall</p>
          <p className="viz-label hidden sm:block">Made with DSource.AI</p>
        </div>
        <div className="relative pt-5">
          <span
            className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
            aria-hidden="true"
          />
          <h2 className="viz-serif text-3xl sm:text-4xl">
            What designers are <span className="italic">making with it.</span>
          </h2>
        </div>
      </Reveal>

      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
        {COLUMNS.map((column, i) => (
          <div
            key={column[0].id}
            className={`gallery-col flex flex-col justify-center gap-4 sm:gap-6 ${
              i >= 3 ? "hidden sm:flex" : ""
            } ${i === 4 ? "sm:hidden lg:flex" : ""}`}
          >
            {column.map((item) => (
              <div
                key={item.id}
                className={`group relative w-full overflow-hidden rounded-xl border border-[var(--viz-line)] ${
                  item.tall ? "h-80 lg:h-[26rem]" : "h-44 lg:h-52"
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${item.image}')` }}
                />
                <span className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/30 backdrop-blur-md">
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 17L17 7M17 7H7M17 7v10"
                    />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
