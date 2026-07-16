import Link from "next/link";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: "Get Inspired — DSource",
  description:
    "A pinboard of rooms, materials, and ideas — currently in the making.",
};

/**
 * Placeholder for the upcoming inspiration pinboard (a Pinterest-style
 * concept, not yet designed). Honest empty state — no mock content.
 */
const GetInspired = () => {
  return (
    <div className="viz-scope w-full">
      <div className="px-4 pt-24 pb-24 sm:px-6 sm:pt-32 md:px-8 lg:px-12">
        {/* Masthead folio */}
        <header>
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource Studio</p>
              <p className="viz-label hidden sm:block">In the making</p>
            </div>
            <div className="relative pt-5">
              <span
                className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
                aria-hidden="true"
              />
              <span className="viz-dots-rule" aria-hidden="true" />
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
                <h1 className="viz-serif text-4xl leading-none sm:text-5xl md:text-[3.6rem]">
                  Get inspired
                </h1>
                <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
                  A pinboard of rooms, materials, and ideas is being built for
                  this wall.
                </p>
              </div>
            </div>
          </Reveal>
        </header>

        {/* The empty wall */}
        <Reveal>
          <div className="relative mt-10 overflow-hidden rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] px-6 py-24 text-center sm:mt-14 sm:py-32">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle, color-mix(in srgb, var(--viz-ink) 14%, transparent) 1px, transparent 1.3px)",
                backgroundSize: "7px 7px",
                maskImage:
                  "linear-gradient(to bottom right, rgb(0 0 0 / 0.9), transparent 75%)",
              }}
              aria-hidden="true"
            />
            <p className="viz-serif relative text-2xl italic text-[var(--viz-muted)] sm:text-3xl">
              The wall is bare, for now.
            </p>
            <p className="viz-label relative mt-3">
              Until it opens, the studio is where the ideas happen
            </p>
            <Link
              href="/ai-visualizer"
              className="viz-btn relative mt-8 inline-block rounded-full bg-[var(--viz-ink)] px-7 py-3 text-sm text-[var(--viz-paper)] transition-colors duration-200 hover:bg-[var(--viz-well)]"
            >
              Open the studio
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default GetInspired;
