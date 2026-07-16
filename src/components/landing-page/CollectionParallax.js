"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import ModernMinimalistImage from "../../../public/modern-minimalist-mask.jpg";
import Reveal from "../Reveal";

/**
 * Featured collection. The masked photograph sinks slower than the page
 * while the side plates drift faster — two honest parallax planes, no more.
 */
export default function CollectionParallax() {
  const rootRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const scrub = (target, fromY, toY) =>
          gsap.fromTo(
            target,
            { y: fromY },
            {
              y: toY,
              ease: "none",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.6,
              },
            },
          );
        scrub(rootRef.current.querySelector(".collection-image"), 60, -60);
        scrub(rootRef.current.querySelector(".collection-side"), 120, -120);
      },
    );
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="viz-scope w-full px-6 py-16 sm:px-10 md:px-14 md:py-24 lg:px-16"
    >
      <Reveal>
        <div className="flex items-baseline justify-between gap-4 pb-2">
          <p className="viz-label">Featured collection</p>
          <p className="viz-label hidden sm:block">Modern minimalist</p>
        </div>
        <div className="relative pt-5">
          <span
            className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
            aria-hidden="true"
          />
          <h2 className="viz-serif text-3xl sm:text-4xl">
            Into a gallery <span className="italic">of elegance.</span>
          </h2>
        </div>
      </Reveal>

      <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:gap-12">
        <div className="collection-image w-full overflow-hidden lg:w-2/3">
          <div className="relative">
            <Image
              src={ModernMinimalistImage}
              className="mask1 h-auto w-full"
              alt="Modern minimalist living room"
              width={600}
              height={400}
            />
            <div className="viz-serif absolute bottom-[8%] left-2 flex flex-col text-4xl sm:left-4 sm:text-5xl md:text-6xl lg:text-7xl">
              <span>Modern</span>
              <span className="mt-2 italic sm:mt-4">Minimalist</span>
            </div>
          </div>
        </div>

        <div className="collection-side flex w-full flex-col gap-6 lg:w-1/3">
          <div className="rounded-3xl bg-[var(--viz-well)] p-6 sm:p-8">
            <p className="viz-mono text-[11px] uppercase tracking-widest text-stone-400">
              The idea
            </p>
            <p className="viz-serif mt-4 text-xl text-stone-100 sm:text-2xl">
              Furniture where every piece tells a story.
            </p>
            <p className="mt-3 text-sm text-stone-400">
              A curated set of rooms, materials, and objects in the modern
              minimalist register — start from one and make it yours.
            </p>
            <Link
              href="/ai-visualizer"
              className="mt-6 inline-block rounded-full bg-[var(--viz-paper)] px-6 py-2.5 text-sm font-semibold text-[var(--viz-ink)] hover:bg-white"
            >
              Get inspired
            </Link>
          </div>
          <Link
            href="/marketplace/products"
            className="relative block h-48 overflow-hidden rounded-3xl border border-[var(--viz-line)] sm:h-56 lg:h-64"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
              style={{
                backgroundImage:
                  "url('/material-finder-images/Frame 41022.png')",
              }}
            />
            <span className="viz-serif absolute bottom-4 left-5 text-2xl text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.5)] sm:text-3xl">
              View materials
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
