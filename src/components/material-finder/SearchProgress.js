/**
 * The wait, narrated.
 *
 * A search fans out to several providers and verifies each seller, so it can
 * take the better part of a minute. That's fine if the page says what it's
 * doing — and not fine if it spins.
 *
 * Set as a plate label on the rule, not a centered modal card with a label, a
 * message and a progress bar in a symmetric stack — that composition is
 * explicitly banned (design.md §11).
 */

const SearchProgress = ({ stage }) => (
  <div className="relative pt-5">
    <span
      className="absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
      aria-hidden="true"
    />
    <div className="flex items-baseline justify-between gap-4">
      <p className="viz-label">Working</p>
      <p className="viz-mono text-[11px] tracking-widest text-[var(--viz-muted)] uppercase">
        This can take a minute
      </p>
    </div>

    <p className="viz-serif mt-3 text-xl italic sm:text-2xl" aria-live="polite">
      {stage?.label ?? "Searching"}…
    </p>

    <div className="mt-5 h-[3px] overflow-hidden rounded-full bg-[var(--viz-line)]/50">
      <div className="viz-scan h-full w-1/4 rounded-full bg-[var(--viz-blue)]" />
    </div>

    <p className="mt-3 max-w-md text-xs text-[var(--viz-muted)]">
      We check every seller we find against the original before showing it to
      you. Your photo isn&rsquo;t kept.
    </p>
  </div>
);

export default SearchProgress;
