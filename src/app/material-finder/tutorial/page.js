import Link from "next/link";
import Reveal from "@/components/Reveal";

const STEPS = [
  {
    n: "01",
    title: "Bring a room",
    body: "Upload a photo of the space — yours or a client's. The original is never touched; every version you make is kept alongside it.",
  },
  {
    n: "02",
    title: "Set the brief",
    body: "Pick the space, style, lighting, palette — even flooring and wall finish — or say it in your own words. Every choice becomes an explicit instruction to the model.",
  },
  {
    n: "03",
    title: "Watch it verify",
    body: "After rendering, vision AI checks the result against your brief and retries once if something was ignored. When every checked parameter passes, the title block reads PROOF: VERIFIED — evidence, not decoration.",
  },
  {
    n: "04",
    title: "Find what you see",
    body: "Tap “Find materials” and click any dot — or drag a box around anything — to search the material bank for the closest real products, with live prices and a one-line reason for each match.",
  },
  {
    n: "05",
    title: "Swap it in",
    body: "Like a match? Place the actual product photo into your render. The room, camera, and light stay put; the piece changes.",
  },
  {
    n: "06",
    title: "Board it, draw it, spec it",
    body: "Compose mood boards from your products, convert photos to CAD-style drawings, and download the whole selection as a spec sheet PDF set in this same design language.",
  },
];

const Tutorial = () => {
  return (
    <div className="viz-scope w-full">
      <div className="px-4 pt-24 pb-24 sm:px-6 sm:pt-32 md:px-8 lg:px-12">
        {/* Masthead folio: meta line over an ink rule, deck at the baseline */}
        <header>
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource Studio</p>
              <Link
                href="/material-finder"
                className="viz-label shrink-0 hover:text-[var(--viz-ink)]"
              >
                ← Material finder
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
                  How the studio works
                </h1>
                <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
                  Six steps from the room you have to the one you imagined.
                </p>
              </div>
            </div>
          </Reveal>
        </header>

        {/* Steps: ruled document sections */}
        <ol className="mt-10 max-w-3xl sm:mt-14">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="border-b border-[var(--viz-line)] py-6 first:pt-0"
            >
              <div className="flex items-baseline gap-4">
                <span className="viz-mono text-xs font-bold text-[var(--viz-blue)]">
                  {step.n}
                </span>
                <div>
                  <h2 className="viz-serif text-xl sm:text-2xl">
                    {step.title}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--viz-muted)] sm:text-base">
                    {step.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <Link
            href="/ai-visualizer"
            className="inline-block rounded-full bg-[var(--viz-ink)] px-7 py-3 text-sm text-[var(--viz-paper)] transition-colors duration-200 hover:bg-[var(--viz-well)]"
          >
            Bring a room
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
