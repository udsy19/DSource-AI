"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import Reveal from "../Reveal";

const MATERIALS = [
  { id: "popular-1", image: "/popular-1.jpg", name: "Joinery" },
  { id: "popular-2", image: "/popular-2.jpg", name: "Upholstery" },
  {
    id: "popular-3",
    image: "/material-finder-images/Frame 86.png",
    name: "Lighting",
  },
  { id: "popular-4", image: "/popular-4.jpg", name: "Ceramics" },
  {
    id: "popular-5",
    image: "/material-finder-images/Frame 90.png",
    name: "Textiles",
  },
];

const STEP_DEG = 26;
const RADIUS = 760;

/**
 * The material library as a physical object: five plates standing on a
 * 3D carousel ring. Scroll turns the ring, walking each material through
 * the center of the stage — a fan deck you leaf through with the page.
 */
export default function MaterialFan() {
  const rootRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const spread = STEP_DEG * (MATERIALS.length - 1);
        // The ring sits back by its own radius so the front card renders at
        // natural scale instead of looming into the camera.
        gsap.fromTo(
          ringRef.current,
          { rotationY: spread / 2, z: -RADIUS },
          {
            rotationY: -spread / 2,
            z: -RADIUS,
            ease: "none",
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top top",
              end: "+=1600",
              scrub: 1,
              pin: true,
            },
          },
        );
      },
    );
    return () => mm.revert();
  }, []);

  return (
    <section ref={rootRef} className="viz-scope w-full">
      <div className="flex min-h-svh w-full flex-col justify-center overflow-hidden px-6 py-16 sm:px-10 lg:px-16">
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">The library</p>
            <p className="viz-label hidden sm:block">
              Pulled from the material bank
            </p>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <h2 className="viz-serif text-3xl sm:text-4xl">
              Materials worth <span className="italic">building around.</span>
            </h2>
          </div>
        </Reveal>

        {/* 3D ring (desktop) / scroll row (small screens) */}
        <div
          className="mt-12 hidden h-[460px] items-center justify-center lg:flex"
          style={{ perspective: "1600px" }}
        >
          <div
            ref={ringRef}
            className="relative h-[420px] w-[300px]"
            style={{ transformStyle: "preserve-3d" }}
          >
            {MATERIALS.map((m, i) => {
              const angle = (i - (MATERIALS.length - 1) / 2) * STEP_DEG;
              return (
                <figure
                  key={m.id}
                  className="absolute inset-0 m-0 overflow-hidden rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] shadow-2xl"
                  style={{
                    transform: `rotateY(${angle}deg) translateZ(${RADIUS}px)`,
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div
                    className="h-[85%] w-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${m.image}')` }}
                  />
                  <figcaption className="flex h-[15%] items-center justify-between px-4">
                    <span className="viz-serif text-lg">{m.name}</span>
                    <span className="viz-label">
                      {String(i + 1).padStart(2, "0")} /{" "}
                      {String(MATERIALS.length).padStart(2, "0")}
                    </span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>

        {/* Small screens: a swipeable strip, no 3D */}
        <div className="mt-10 flex gap-4 overflow-x-auto pb-4 hide-scrollbar lg:hidden">
          {MATERIALS.map((m) => (
            <figure
              key={m.id}
              className="m-0 w-64 shrink-0 overflow-hidden rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)]"
            >
              <div
                className="h-72 w-full bg-cover bg-center"
                style={{ backgroundImage: `url('${m.image}')` }}
              />
              <figcaption className="px-4 py-3">
                <span className="viz-serif text-lg">{m.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
