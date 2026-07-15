import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";

import aiMaterialOne from "../../../public/ai-material-finder-1.png";
import aiMaterialTwo from "../../../public/ai-material-finder-2.png";

const HOW_IT_WORKS = [
  {
    number: "01",
    title: "Upload your design",
    description:
      "Start with a photo of a room you love, or a render made with our AI tools.",
  },
  {
    number: "02",
    title: "Identify the pieces",
    description:
      "The AI reads the scene and names the furniture and decor it finds.",
  },
  {
    number: "03",
    title: "Source them locally",
    description:
      "Get a curated list of similar products stocked by retailers near you.",
  },
];

const AiMaterialFinder = () => {
  return (
    <div className="viz-scope w-full">
      <div className="px-4 pt-24 pb-24 sm:px-6 sm:pt-32 md:px-8 lg:px-12">
        {/* Masthead folio: meta line over an ink rule, promise deck at the
            title's baseline, halftone drifting off the rule's right end */}
        <header>
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource Studio</p>
              <Link
                href="/ai-material-finder/tutorial"
                className="viz-label shrink-0 hover:text-[var(--viz-ink)]"
              >
                View tutorial →
              </Link>
            </div>
            <div className="relative pt-5">
              <span
                className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
                aria-hidden="true"
              />
              <span className="viz-dots-rule" aria-hidden="true" />
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
                <h1 className="viz-serif text-4xl leading-none sm:text-5xl md:text-[3.6rem]">
                  AI Material Finder
                </h1>
                <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
                  Show us the room you love. We&rsquo;ll find every piece in it.
                </p>
              </div>
            </div>
          </Reveal>
        </header>

        {/* Hero: brief on the left, one dark plate on the right */}
        <div className="mt-10 grid grid-cols-1 gap-8 sm:mt-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4 lg:pt-10">
            <h2 className="viz-serif text-2xl sm:text-3xl">
              The ideal material for your space
            </h2>
            <p className="mt-4 max-w-sm text-sm text-[var(--viz-muted)] sm:text-base">
              Locally available products that fit your design vision — without
              the endless search.
            </p>
            <Link
              href="/ai-material-finder/find"
              className="mt-8 inline-block rounded-full bg-[var(--viz-ink)] px-7 py-3 text-sm text-[var(--viz-paper)] transition-colors duration-200 hover:bg-[var(--viz-well)]"
            >
              Open the material finder
            </Link>
            <p className="viz-mono mt-4 text-[11px] tracking-[0.08em] text-[var(--viz-muted)] uppercase">
              Upload · Identify · Source
            </p>
          </div>
          <div className="relative lg:col-span-8">
            {/* Registration marks — this plate is the artwork of the page */}
            <span className="viz-crop viz-crop-tl" aria-hidden="true" />
            <span className="viz-crop viz-crop-tr" aria-hidden="true" />
            <span className="viz-crop viz-crop-bl" aria-hidden="true" />
            <span className="viz-crop viz-crop-br" aria-hidden="true" />
            <div className="rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-well)] p-3 sm:p-4">
              <div
                className="h-[40vh] w-full rounded-lg sm:h-[50vh] lg:h-[60vh]"
                id="ai-material-finder-image"
              />
            </div>
          </div>
        </div>

        {/* How it works: three steps hung on hairlines, type doing the work */}
        <section className="mt-20 sm:mt-28">
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">How it works</p>
              <p className="viz-label shrink-0">Three steps</p>
            </div>
            <span
              className="viz-rule block h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:mt-10 md:grid-cols-3 md:gap-10">
            {HOW_IT_WORKS.map((step, index) => (
              <Reveal key={step.number} delay={index * 90}>
                <div className="border-t border-[var(--viz-line)] pt-4">
                  <p className="viz-mono text-xs text-[var(--viz-muted)]">
                    STEP {step.number}
                  </p>
                  <h3 className="viz-serif mt-3 text-xl sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm text-[var(--viz-muted)]">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* The shopping assistant: two plates, alternating with their briefs */}
        <section className="mt-20 sm:mt-28">
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource AI</p>
              <p className="viz-label shrink-0">Shopping assistant</p>
            </div>
            <span
              className="viz-rule block h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <h2 className="viz-serif mt-5 max-w-xl text-2xl sm:text-3xl">
              Your AI shopping assistant
            </h2>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 items-center gap-6 sm:mt-14 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <h3 className="viz-serif text-xl sm:text-2xl">
                Material from any image
              </h3>
              <p className="mt-3 max-w-sm text-sm text-[var(--viz-muted)] sm:text-base">
                Find and shop matching furniture instantly, bringing your vision
                to life.
              </p>
            </div>
            <div className="lg:col-span-8">
              <div className="overflow-hidden rounded-2xl border border-[var(--viz-line)]">
                <Image
                  src={aiMaterialOne}
                  alt="A room photo with every detected piece matched to a product"
                  width={800}
                  height={600}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 items-center gap-6 sm:mt-16 lg:grid-cols-12 lg:gap-12">
            <div className="order-2 lg:order-1 lg:col-span-8">
              <div className="overflow-hidden rounded-2xl border border-[var(--viz-line)]">
                <Image
                  src={aiMaterialTwo}
                  alt="Matched products listed beside the room they came from"
                  width={800}
                  height={600}
                  className="h-auto w-full"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:col-span-4">
              <h3 className="viz-serif text-xl sm:text-2xl">
                From match to marketplace
              </h3>
              <p className="mt-3 max-w-sm text-sm text-[var(--viz-muted)] sm:text-base">
                Every find links straight to the product — view it, or add it to
                your spec.
              </p>
            </div>
          </div>

          <Reveal>
            <div className="mt-14 flex flex-col items-start gap-4 border-t border-[var(--viz-line)] pt-8 sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
              <p className="viz-serif text-lg italic text-[var(--viz-muted)] sm:text-xl">
                See a room you love? Bring it in.
              </p>
              <Link
                href="/ai-material-finder/find"
                className="inline-block rounded-full bg-[var(--viz-ink)] px-7 py-3 text-sm text-[var(--viz-paper)] transition-colors duration-200 hover:bg-[var(--viz-well)]"
              >
                Try it yourself
              </Link>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
};

export default AiMaterialFinder;
