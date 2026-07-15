import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getCatalogPage, getTaxonomy } from "@/utils/catalog";

export const metadata = {
  title: "Marketplace — DSource.AI",
  description:
    "Browse the material bank: real products from real suppliers, with live prices.",
};

/** Landing masthead: folio (mono meta over the ink rule, deck at baseline). */
const Masthead = ({ deck }) => (
  <Reveal>
    <div className="flex items-baseline justify-between gap-4 pb-2">
      <p className="viz-label">Marketplace</p>
      <Link
        href="/marketplace/products"
        className="viz-label shrink-0 transition-colors hover:text-[var(--viz-ink)]"
      >
        Browse everything →
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
          The material bank
        </h1>
        <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
          {deck}
        </p>
      </div>
    </div>
  </Reveal>
);

const Marketplace = async () => {
  const [taxonomy, firstPage] = await Promise.all([
    getTaxonomy(),
    getCatalogPage(),
  ]);

  if (!taxonomy) {
    return (
      <div className="viz-scope min-h-screen w-full">
        <div className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pb-24">
          <Masthead deck="Real products, real suppliers, live prices." />
          <p className="viz-mono mt-14 text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)]">
            The catalog is unreachable right now — refresh in a moment.
          </p>
        </div>
      </div>
    );
  }

  const families = taxonomy.families
    .filter((f) => f.publish_ready > 0)
    .sort((a, b) => b.publish_ready - a.publish_ready);
  const total = firstPage?.total ?? null;

  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pb-24">
        <Masthead
          deck={
            total
              ? `${total.toLocaleString("en-IN")} real products with live prices — every one can go straight into your spec.`
              : "Real products, real suppliers, live prices."
          }
        />

        {/* Search — a plain GET form into the listing, works without JS */}
        <Reveal className="mt-10 sm:mt-14">
          <form
            action="/marketplace/products"
            method="get"
            className="flex max-w-2xl items-stretch gap-3"
          >
            <label htmlFor="marketplace-search" className="sr-only">
              Search the material bank
            </label>
            <input
              id="marketplace-search"
              type="search"
              name="q"
              placeholder="Search the bank — “white marble tile”, “walnut desk”…"
              className="w-full rounded-full border border-[var(--viz-line)] bg-[var(--viz-paper)] px-5 py-3 text-sm text-[var(--viz-ink)] placeholder:text-[var(--viz-muted)]"
            />
            <button
              type="submit"
              className="viz-btn shrink-0 rounded-full bg-[var(--viz-ink)] px-6 text-[var(--viz-paper)] transition-colors hover:bg-[var(--viz-well)]"
            >
              Search
            </button>
          </form>
        </Reveal>

        {/* The index — taxonomy directory with live counts */}
        <div className="mt-14 sm:mt-20">
          {families.map((family, familyIndex) => (
            <Reveal key={family.family} className="mt-10 first:mt-0">
              <div className="flex items-baseline justify-between border-t border-[var(--viz-line)] pt-2">
                <p className="viz-label">
                  {String(familyIndex + 1).padStart(2, "0")} · {family.family}
                </p>
                <p className="viz-label">
                  {family.publish_ready.toLocaleString("en-IN")} products
                </p>
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                {family.categories
                  .filter((c) => c.publish_ready > 0)
                  .map((category) => (
                    <li
                      key={category.node}
                      className="border-b border-[var(--viz-line)]"
                    >
                      <Link
                        href={`/marketplace/products?category=${encodeURIComponent(category.category)}`}
                        className="group flex items-baseline justify-between gap-4 py-3"
                      >
                        <span className="viz-serif text-lg text-[var(--viz-ink)] transition-colors group-hover:text-[var(--viz-blue)] sm:text-xl">
                          {category.category}
                        </span>
                        <span className="viz-mono shrink-0 text-[11px] tracking-[0.08em] text-[var(--viz-muted)]">
                          {category.publish_ready.toLocaleString("en-IN")}
                          <span
                            aria-hidden="true"
                            className="ml-2 inline-block transition-transform group-hover:translate-x-1"
                          >
                            →
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
