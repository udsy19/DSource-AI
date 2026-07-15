import Link from "next/link";
import Reveal from "@/components/Reveal";
import {
  formatInr,
  formatObservedDate,
  getProduct,
  parseEnrichment,
  priceUnitLabel,
} from "@/utils/catalog";
import AddToSpec from "./AddToSpec";

export const metadata = {
  title: "Product — DSource.AI marketplace",
};

/** Honest terminal states — never a crash, never invented content. */
const Notice = ({ children }) => (
  <div className="viz-scope min-h-screen w-full px-4 pt-24 sm:px-8 sm:pt-32">
    <div className="mx-auto max-w-3xl">
      <p className="viz-mono text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)]">
        {children}
      </p>
      <Link
        href="/marketplace/products"
        className="viz-label mt-4 inline-block transition-colors hover:text-[var(--viz-ink)]"
      >
        ← Back to the bank
      </Link>
    </div>
  </div>
);

const BASIS_LABELS = {
  listed_mrp: "listed MRP",
  observed: "observed",
};

const ProductDetails = async ({ params }) => {
  const { id } = await params;
  const productId = Array.isArray(id) ? id[0] : id;

  const data = await getProduct(productId);
  if (data === "not_found") {
    return <Notice>This product is not in the bank.</Notice>;
  }
  if (!data) {
    return (
      <Notice>
        The catalog is unreachable right now — refresh in a moment.
      </Notice>
    );
  }

  const { product, supplier, similar } = data;
  const price = product.price;
  const observedDate = formatObservedDate(price?.observed_at);
  const enrichment = parseEnrichment(product.llm_content);
  const descriptionParagraphs =
    enrichment?.paragraphs ??
    (product.description ? [product.description] : []);
  const similarProducts = (Array.isArray(similar) ? similar : []).filter(
    (s) => s.id !== product.id,
  );

  const specCells = [
    { label: "Brand", value: product.brand },
    { label: "Category", value: product.category_std || product.category },
    { label: "Size (mm)", value: product.size_mm },
    { label: "Finish", value: product.finish },
    { label: "Color", value: product.color },
  ];

  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pb-24">
        {/* Folio masthead */}
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">
              <Link
                href="/marketplace/products"
                className="transition-colors hover:text-[var(--viz-ink)]"
              >
                Material bank
              </Link>
              {product.category_std && ` · ${product.category_std}`}
            </p>
            <p className="viz-label">№ {product.id}</p>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <h1 className="viz-serif text-3xl leading-tight sm:text-4xl">
              {product.title || "Untitled product"}
            </h1>
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* The plate — product image */}
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-ground)]">
            {product.image_url
              ? /* biome-ignore lint/performance/noImgElement: supplier CDN hosts are unbounded and cannot be whitelisted for next/image */
                <img
                  src={product.image_url}
                  alt={product.title || "Product"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              : <div className="viz-mono flex h-full w-full items-center justify-center text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                  No image on file
                </div>}
          </div>

          {/* The facts */}
          <div className="flex flex-col">
            {/* Title-block spec cells */}
            <div className="flex flex-wrap gap-px overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-line)]">
              {specCells.map(({ label, value }) => (
                <div
                  key={label}
                  className="min-w-24 flex-1 bg-[var(--viz-paper)] px-3 py-1.5"
                >
                  <div className="viz-label">{label}</div>
                  <div className="viz-mono mt-0.5 truncate text-xs uppercase">
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* Live price with its observation date — or an honest dash */}
            <div className="mt-6 border-b border-[var(--viz-line)] pb-5">
              <p className="viz-label">Price</p>
              <p className="viz-mono mt-1 text-2xl text-[var(--viz-ink)]">
                {formatInr(price?.price_inr)}
                {typeof price?.price_inr === "number" && (
                  <span className="text-base text-[var(--viz-muted)]">
                    {priceUnitLabel(price.price_unit)}
                  </span>
                )}
              </p>
              {price
                ? <p className="viz-mono mt-1 text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                    {[
                      observedDate && `Observed ${observedDate}`,
                      BASIS_LABELS[price.basis] || price.basis,
                      price.source,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {price.stale && " · may be out of date"}
                  </p>
                : <p className="viz-mono mt-1 text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                    No price on file for this product.
                  </p>}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <AddToSpec
                product={{
                  title: product.title || "Untitled product",
                  brand: product.brand || undefined,
                  color: product.color || undefined,
                  price:
                    typeof price?.price_inr === "number"
                      ? price.price_inr
                      : undefined,
                  image: product.image_url || undefined,
                  link: `/marketplace/products/${product.id}`,
                  material: product.category_std || undefined,
                  finish: product.finish || undefined,
                  dimensions: product.size_mm
                    ? `${product.size_mm} mm`
                    : undefined,
                }}
                category={product.category_std || "Uncategorized"}
              />
              {product.source_url && (
                <a
                  href={product.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="viz-btn flex-1 rounded-full border border-[var(--viz-line)] px-6 py-3 text-center text-[var(--viz-ink)] transition-colors hover:bg-[var(--viz-ground)]"
                >
                  Vendor ↗
                </a>
              )}
            </div>

            {/* Supplier of record */}
            {(supplier?.legal_name || product.supplier_domain) && (
              <p className="viz-mono mt-4 text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                Supplied by {supplier?.legal_name || product.supplier_domain}
                {supplier?.city && ` · ${supplier.city}`}
                {supplier?.state && `, ${supplier.state}`}
              </p>
            )}

            {/* Description — only what the bank actually knows */}
            {(descriptionParagraphs.length > 0 ||
              (enrichment?.bullets?.length ?? 0) > 0) && (
              <div className="mt-8 border-t border-[var(--viz-line)] pt-6">
                <h2 className="viz-serif text-xl">About this product</h2>
                {descriptionParagraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="mt-3 text-sm leading-relaxed text-[var(--viz-ink)]/85"
                  >
                    {paragraph}
                  </p>
                ))}
                {(enrichment?.bullets?.length ?? 0) > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {enrichment.bullets.map((bullet) => (
                      <li
                        key={bullet.slice(0, 40)}
                        className="viz-mono text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]"
                      >
                        · {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Similar products strip */}
        {similarProducts.length > 0 && (
          <Reveal className="mt-14 sm:mt-20">
            <div className="flex items-baseline justify-between border-t border-[var(--viz-line)] pt-2">
              <p className="viz-label">Similar in the bank</p>
              <p className="viz-label">
                {String(similarProducts.length).padStart(2, "0")}
              </p>
            </div>
            <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
              {similarProducts.map((item) => (
                <Link
                  key={item.id}
                  href={`/marketplace/products/${item.id}`}
                  className="group w-40 flex-shrink-0 sm:w-48"
                >
                  <span className="block aspect-square w-full overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-ground)] transition-shadow duration-300 group-hover:shadow-[0_12px_24px_-16px_rgba(38,34,26,0.5)]">
                    {item.image_url && (
                      /* biome-ignore lint/performance/noImgElement: supplier CDN hosts are unbounded and cannot be whitelisted for next/image */
                      <img
                        src={item.image_url}
                        alt={item.title || "Product"}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="viz-serif mt-2 block truncate text-sm text-[var(--viz-ink)] transition-colors group-hover:text-[var(--viz-blue)]">
                    {item.title || "Untitled product"}
                  </span>
                  <span className="viz-mono block truncate text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                    {item.supplier_domain || "—"}
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
