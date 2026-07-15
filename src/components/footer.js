import Reveal from "./Reveal";

const Footer = () => {
  return (
    <footer className="viz-scope my-6 w-full px-2 sm:my-12 sm:px-4">
      {/* CTA band — the studio at night */}
      <div className="relative overflow-hidden rounded-2xl bg-[var(--viz-well)] px-6 py-10 sm:px-10 md:px-16 md:py-14">
        <div
          className="viz-dots-light viz-dots-drift pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <Reveal className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="viz-mono text-[11px] uppercase tracking-widest text-stone-400">
              DSource.AI
            </p>
            <h2 className="viz-serif mt-2 text-3xl text-stone-100 sm:text-4xl">
              Seven days on us.
              <span className="italic text-stone-300"> Bring a room.</span>
            </h2>
            <p className="mt-3 text-sm text-stone-400">
              Render it, board it, draw it — every version kept, every brief
              checked.
            </p>
          </div>
          <form
            action="/signup"
            className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              aria-label="Email"
              className="w-full rounded-full border border-stone-600 bg-transparent px-5 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-stone-300 focus:outline-none"
            />
            <button
              type="submit"
              className="viz-btn shrink-0 cursor-pointer rounded-full bg-[var(--viz-paper)] px-7 py-3 text-[var(--viz-ink)] hover:bg-white"
            >
              Get started
            </button>
          </form>
        </Reveal>
      </div>
    </footer>
  );
};

export default Footer;
