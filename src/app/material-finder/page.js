import Image from "next/image";
import Link from "next/link";
import MaterialFinderDemo from "@/components/landing-page/MaterialFinderDemo";
import Reveal from "@/components/Reveal";

import featureRoom from "../../../public/feature-room.webp";

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
        {/* Masthead folio */}
        <header>
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource Studio</p>
              <Link
                href="/material-finder/tutorial"
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

        {/* Hero: brief on the left, the room plate on the right */}
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
              href="/material-finder/find"
              className="viz-btn mt-8 inline-block rounded-full bg-[var(--viz-ink)] px-7 py-3.5 text-[var(--viz-paper)] transition-colors duration-200 hover:bg-[var(--viz-well)]"
            >
              Open the material finder
            </Link>
            <p className="viz-mono mt-4 text-[11px] tracking-[0.08em] text-[var(--viz-muted)] uppercase">
              Upload · Identify · Source
            </p>
          </div>
          <div className="relative lg:col-span-8">
            <span className="viz-crop viz-crop-tl" aria-hidden="true" />
            <span className="viz-crop viz-crop-tr" aria-hidden="true" />
            <span className="viz-crop viz-crop-bl" aria-hidden="true" />
            <span className="viz-crop viz-crop-br" aria-hidden="true" />
            <div className="rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-well)] p-3 sm:p-4">
              <Image
                src={featureRoom}
                alt="A warm modern living room — the kind of space you'd bring to the material finder"
                priority
                className="h-[40vh] w-full rounded-lg object-cover sm:h-[50vh] lg:h-[60vh]"
              />
            </div>
          </div>
        </div>

        {/* How it works */}
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

        {/* The shopping assistant */}
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
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="viz-serif max-w-xl text-2xl sm:text-3xl">
                Point at the room. We&rsquo;ll shop it.
              </h2>
              <p className="max-w-sm text-sm text-[var(--viz-muted)] sm:text-right">
                The AI reads the whole scene, then matches every piece to a real
                product — hover the room or the list to explore.
              </p>
            </div>
          </Reveal>

          {/* The interactive detection playground */}
          <div className="mt-10 sm:mt-12">
            <MaterialFinderDemo />
          </div>

          <Reveal>
            <div className="mt-14 flex flex-col items-start gap-4 border-t border-[var(--viz-line)] pt-8 sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
              <p className="viz-serif text-lg italic text-[var(--viz-muted)] sm:text-xl">
                See a room you love? Bring it in.
              </p>
              <Link
                href="/material-finder/find"
                className="viz-btn inline-block rounded-full bg-[var(--viz-ink)] px-7 py-3.5 text-[var(--viz-paper)] transition-colors duration-200 hover:bg-[var(--viz-well)]"
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
