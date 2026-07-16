import Link from "next/link";

/* Mirror of spec-builder's page-local SpecCell — that component isn't
   exported from its page, and the vendor surface is owned separately. */
const PlateCell = ({ label, children, grow = 1 }) => (
  <div
    className="min-w-28 bg-[var(--viz-paper)] px-3 py-2"
    style={{ flex: `${grow} 1 0%` }}
  >
    <div className="viz-label">{label}</div>
    <div className="viz-mono mt-0.5 text-xs uppercase">{children}</div>
  </div>
);

// Format date helper — em dash when there is nothing on record.
const formatDate = (dateString) => {
  if (!dateString) return { date: "—", time: null };
  const d = new Date(dateString);
  return {
    date: d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    }),
    time: d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

export default function VendorDashboard({ dashboardStats }) {
  const { totalProducts = 0, recentProducts = [] } = dashboardStats || {};

  const lastUpload = formatDate(recentProducts[0]?.created_at ?? null);

  // The five most recent uploads, straight from the vendor's own rows.
  const displayProducts = recentProducts.slice(0, 5).map((p, idx) => {
    const { date, time } = formatDate(p.created_at);
    return {
      key: p.id ?? idx,
      index: String(idx + 1).padStart(2, "0"),
      name: p.product_name || p.brand_name || "—",
      productId: p.product_id != null ? String(p.product_id) : "—",
      date,
      time,
      active: p.is_active !== false,
      image_url: p.image_url,
    };
  });

  return (
    <div className="space-y-8">
      {/* The ledger line: a plate label of real figures. Anything we don't
          track yet is an em dash — never an invented number. */}
      <section aria-label="Catalog summary">
        <div className="flex flex-wrap gap-px overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-line)]">
          <PlateCell label="Sheet">V-01</PlateCell>
          <PlateCell label="Products on record" grow={2}>
            <span className="font-bold text-[var(--viz-blue)]">
              {String(totalProducts).padStart(2, "0")}
            </span>
          </PlateCell>
          <PlateCell label="Last upload" grow={2}>
            {lastUpload.date}
          </PlateCell>
          <PlateCell label="Orders">—</PlateCell>
          <PlateCell label="Sales">—</PlateCell>
        </div>
        <p className="viz-mono mt-2 text-xs text-[var(--viz-muted)]">
          An em dash means no data source yet — this office keeps real figures
          only.
        </p>
      </section>

      {/* Recent uploads: mono facts on hairline rules. */}
      <section className="viz-panel p-6">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--viz-line)] pb-3">
          <h2 className="viz-serif text-xl">
            Recent uploads
            {displayProducts.length > 0 && (
              <span className="viz-mono ml-3 align-middle text-xs font-bold text-[var(--viz-blue)]">
                {String(displayProducts.length).padStart(2, "0")}
              </span>
            )}
          </h2>
          <Link
            href="/vendor/products"
            className="viz-label shrink-0 transition-colors duration-200 hover:text-[var(--viz-ink)]"
          >
            All products →
          </Link>
        </div>

        {displayProducts.length > 0
          ? <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--viz-line)]">
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      #
                    </th>
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      Image
                    </th>
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      Product
                    </th>
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      Product ID
                    </th>
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      Added
                    </th>
                    <th className="viz-label py-2 text-left font-normal">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayProducts.map((product) => (
                    <tr
                      key={product.key}
                      className="border-b border-[var(--viz-line)] last:border-0"
                    >
                      <td className="viz-mono py-4 pr-4 text-sm text-[var(--viz-muted)]">
                        {product.index}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-[var(--viz-line)] bg-[var(--viz-ground)]">
                          {product.image_url
                            ? // biome-ignore lint/performance/noImgElement: scraped product images come from arbitrary supplier hosts next/image is not configured for
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            : <span className="viz-mono text-[10px] text-[var(--viz-muted)]">
                                —
                              </span>}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-sm font-medium text-[var(--viz-ink)]">
                        {product.name}
                      </td>
                      <td className="viz-mono py-4 pr-4 text-sm text-[var(--viz-muted)]">
                        {product.productId}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="viz-mono text-sm text-[var(--viz-muted)]">
                          <div>{product.date}</div>
                          {product.time && (
                            <div className="text-xs">at {product.time}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <span
                          className={`viz-mono inline-block rounded-full border px-3 py-1 text-xs ${
                            product.active
                              ? "border-[var(--viz-blue)]/40 bg-[var(--viz-blue)]/5 text-[var(--viz-blue-deep)]"
                              : "border-[var(--viz-line)] text-[var(--viz-muted)]"
                          }`}
                        >
                          {product.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          : <p className="viz-mono py-8 text-sm text-[var(--viz-muted)]">
              Nothing on record yet — upload a CSV from the{" "}
              <Link
                href="/vendor/products"
                className="text-[var(--viz-ink)] underline underline-offset-4 hover:text-[var(--viz-blue)]"
              >
                products desk
              </Link>{" "}
              and your catalog appears here.
            </p>}
      </section>
    </div>
  );
}
