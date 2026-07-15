import Link from "next/link";
import Reveal from "@/components/Reveal";
import {
  formatInr,
  getCatalogPage,
  getTaxonomy,
  PAGE_SIZE,
  priceUnitLabel,
  searchCatalog,
} from "@/utils/catalog";

export const metadata = {
  title: "Products — DSource.AI marketplace",
  description:
    "Browse and search the material bank: live-priced products from real suppliers.",
};

/** Builds a listing URL preserving only the meaningful params. */
const listingHref = ({ category, q, page } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/marketplace/products?${qs}` : "/marketplace/products";
};

/** One product card: image plate, serif title, mono facts, live ₹ price. */
const ProductCard = ({ item }) => (
  <Link
    href={`/marketplace/products/${item.id}`}
    className="viz-panel group block overflow-hidden transition-shadow duration-300 hover:shadow-[0_20px_40px_-24px_rgba(38,34,26,0.55)]"
  >
    <div className="relative aspect-square border-b border-[var(--viz-line)] bg-[var(--viz-ground)]">
      {item.image_url
        ? /* biome-ignore lint/performance/noImgElement: supplier CDN hosts are unbounded and cannot be whitelisted for next/image */
          <img
            src={item.image_url}
            alt={item.title || "Product"}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        : <div className="viz-mono flex h-full w-full items-center justify-center text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]">
            No image on file
          </div>}
    </div>
    <div className="p-4">
      <p className="viz-label">{item.category_std || item.category || "—"}</p>
      <h3 className="viz-serif mt-1 truncate text-lg" title={item.title}>
        {item.title || "Untitled product"}
      </h3>
      <dl className="mt-3 border-t border-[var(--viz-line)]">
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--viz-line)] py-1.5">
          <dt className="viz-label">Brand</dt>
          <dd className="viz-mono truncate text-xs uppercase">
            {item.brand || "—"}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--viz-line)] py-1.5">
          <dt className="viz-label">Price</dt>
          <dd className="viz-mono text-xs">
            {formatInr(item.price_inr)}
            {typeof item.price_inr === "number" && (
              <span className="text-[var(--viz-muted)]">
                {priceUnitLabel(item.price_unit)}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  </Link>
);

/** Prev / windowed numbers / Next, all as plain links (server-rendered). */
const Pagination = ({ page, totalPages, category }) => {
  if (totalPages <= 1) return null;
  const windowPages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    // Collapse runs into ellipsis markers.
    .reduce((acc, p) => {
      const prev = acc[acc.length - 1];
      if (typeof prev === "number" && p - prev > 1) acc.push(`gap-${p}`);
      acc.push(p);
      return acc;
    }, []);

  const navButton =
    "viz-mono rounded-md border px-3 py-2 text-xs tracking-[0.08em] uppercase transition-colors";
  return (
    <nav
      aria-label="Catalog pages"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 && (
        <Link
          href={listingHref({ category, page: page - 1 })}
          className={`${navButton} border-[var(--viz-line)] hover:bg-[var(--viz-ground)]`}
        >
          Previous
        </Link>
      )}
      {windowPages.map((p) =>
        typeof p === "number"
          ? <Link
              key={p}
              href={listingHref({ category, page: p })}
              aria-current={p === page ? "page" : undefined}
              className={`${navButton} ${
                p === page
                  ? "border-[var(--viz-ink)] bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                  : "border-[var(--viz-line)] hover:bg-[var(--viz-ground)]"
              }`}
            >
              {p}
            </Link>
          : <span
              key={p}
              className="viz-mono px-1 text-xs text-[var(--viz-muted)]"
            >
              …
            </span>,
      )}
      {page < totalPages && (
        <Link
          href={listingHref({ category, page: page + 1 })}
          className={`${navButton} border-[var(--viz-line)] hover:bg-[var(--viz-ground)]`}
        >
          Next
        </Link>
      )}
    </nav>
  );
};

const Products = async ({ searchParams }) => {
  const params = await searchParams;
  const query = typeof params?.q === "string" ? params.q.trim() : "";
  const category =
    typeof params?.category === "string" ? params.category.trim() : "";
  const page = Math.max(1, Number.parseInt(params?.page, 10) || 1);

  const [taxonomy, listing] = await Promise.all([
    getTaxonomy(),
    query
      ? searchCatalog(query).then((results) =>
          results ? { items: results, total: results.length } : null,
        )
      : getCatalogPage({ category: category || undefined, page }),
  ]);

  const categories = (taxonomy?.families ?? []).flatMap((family) =>
    family.categories.filter((c) => c.publish_ready > 0),
  );
  const totalPages =
    listing && !query ? Math.ceil(listing.total / PAGE_SIZE) : 0;

  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pb-24">
        {/* Folio masthead */}
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">
              <Link
                href="/marketplace"
                className="transition-colors hover:text-[var(--viz-ink)]"
              >
                Material bank
              </Link>
            </p>
            <p className="viz-label hidden sm:block">
              {listing
                ? `${listing.total.toLocaleString("en-IN")} ${query ? "matches" : "products on file"}`
                : "Catalog offline"}
            </p>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <h1 className="viz-serif text-4xl leading-none sm:text-5xl">
              {query ? `“${query}”` : category || "Everything in the bank"}
            </h1>
          </div>
        </Reveal>

        {/* Search + category run */}
        <div className="mt-8">
          <form
            action="/marketplace/products"
            method="get"
            className="flex max-w-xl items-stretch gap-3"
          >
            <label htmlFor="catalog-search" className="sr-only">
              Search the material bank
            </label>
            <input
              id="catalog-search"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search the bank…"
              className="w-full rounded-full border border-[var(--viz-line)] bg-[var(--viz-paper)] px-5 py-2.5 text-sm text-[var(--viz-ink)] placeholder:text-[var(--viz-muted)]"
            />
            <button
              type="submit"
              className="viz-btn shrink-0 rounded-full bg-[var(--viz-ink)] px-5 text-[var(--viz-paper)] transition-colors hover:bg-[var(--viz-well)]"
            >
              Search
            </button>
          </form>

          {categories.length > 0 && (
            /* A typeset run of category names, ink-filled when selected —
               never a grid of uniform bordered chips. */
            <p className="mt-5 max-w-5xl text-sm leading-7">
              <Link
                href={listingHref()}
                className={`rounded px-1.5 py-0.5 transition-colors ${
                  !category && !query
                    ? "bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                    : "text-[var(--viz-ink)] hover:bg-[var(--viz-ground)]"
                }`}
              >
                All
              </Link>
              {categories.map((c) => (
                <span key={c.node}>
                  <span className="text-[var(--viz-line)]" aria-hidden="true">
                    {" · "}
                  </span>
                  <Link
                    href={listingHref({ category: c.category })}
                    className={`rounded px-1.5 py-0.5 transition-colors ${
                      category === c.category
                        ? "bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                        : "text-[var(--viz-ink)] hover:bg-[var(--viz-ground)]"
                    }`}
                  >
                    {c.category}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Results */}
        <div className="mt-10">
          {!listing
            ? <p className="viz-mono py-12 text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                The catalog is unreachable right now — refresh in a moment.
              </p>
            : listing.items.length === 0
              ? <p className="viz-mono py-12 text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                  {query
                    ? "Nothing in the bank matches that — try different words."
                    : "Nothing on file here yet."}
                </p>
              : <>
                  {query && (
                    <p className="viz-label mb-6">
                      Closest {listing.items.length} matches ·{" "}
                      <Link
                        href={listingHref()}
                        className="transition-colors hover:text-[var(--viz-ink)]"
                      >
                        clear search
                      </Link>
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {listing.items.map((item) => (
                      <ProductCard key={item.id} item={item} />
                    ))}
                  </div>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    category={category}
                  />
                </>}
        </div>
      </div>
    </div>
  );
};

export default Products;
