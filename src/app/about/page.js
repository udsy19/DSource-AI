import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";

import heroImage from "../../../public/spacejoy.jpg";

export const metadata = {
  title: "About — DSource.AI",
  description:
    "The studio behind DSource.AI: an AI-powered material sourcing and visualization platform for brands and designers.",
};

const SECTIONS = [
  {
    label: "Our mission",
    heading: "Less searching, more designing.",
    body: "Our mission is to simplify the way design professionals find, evaluate, and organize materials with practical AI. We aim to reduce the time spent searching across scattered sources, eliminate repetitive manual documentation, and help teams make confident decisions without losing creativity in the process.",
  },
  {
    label: "Why we built this",
    heading: "One workflow instead of forty tabs.",
    body: "Material sourcing often means too many tabs, unclear product details, inconsistent spec data, and time-consuming follow-ups. DSource.AI brings the key steps into one workflow — helping you search smarter, visualize earlier, and document faster.",
  },
];

export default function AboutPage() {
  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pt-36 md:pb-24">
        {/* Folio masthead */}
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">About</p>
            <p className="viz-label hidden sm:block">
              Materials · Renders · Specs
            </p>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <h1 className="viz-serif text-4xl leading-none sm:text-5xl">
              DSource.AI
            </h1>
            <p className="viz-serif mt-4 max-w-2xl text-lg italic text-[var(--viz-muted)] sm:text-xl">
              An AI-powered material sourcing and visualization platform for
              brands and designers — so moving from inspiration to specification
              becomes faster, clearer, and more reliable.
            </p>
          </div>
        </Reveal>

        {/* The plate */}
        <Reveal className="relative mt-12 sm:mt-16">
          <span className="viz-crop viz-crop-tl" aria-hidden="true" />
          <span className="viz-crop viz-crop-tr" aria-hidden="true" />
          <span className="viz-crop viz-crop-bl" aria-hidden="true" />
          <span className="viz-crop viz-crop-br" aria-hidden="true" />
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[var(--viz-line)]">
            <Image
              src={heroImage}
              alt="An interior styled with materials sourced through DSource.AI"
              fill
              className="object-cover"
              priority
            />
          </div>
        </Reveal>

        {/* Sections */}
        {SECTIONS.map(({ label, heading, body }) => (
          <Reveal key={label} className="mt-14 sm:mt-20">
            <div className="border-t border-[var(--viz-line)] pt-2">
              <p className="viz-label">{label}</p>
            </div>
            <h2 className="viz-serif mt-4 text-2xl sm:text-3xl">{heading}</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--viz-ink)]/85 sm:text-lg">
              {body}
            </p>
          </Reveal>
        ))}

        {/* Hand-off */}
        <Reveal className="mt-16 sm:mt-24">
          <div className="border-t border-[var(--viz-line)] pt-6">
            <p className="viz-serif text-xl italic text-[var(--viz-muted)]">
              The rest is easier to show than tell.
            </p>
            <Link
              href="/ai-visualizer"
              className="viz-mono mt-3 inline-block text-xs tracking-[0.08em] uppercase underline decoration-[var(--viz-line)] underline-offset-4 transition-colors hover:text-[var(--viz-blue)] hover:decoration-[var(--viz-blue)]"
            >
              Bring a room to the visualizer →
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
