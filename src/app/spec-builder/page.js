"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import Reveal from "@/components/Reveal";
import { UNFILED_BUCKET_ID, useSpec } from "../../contexts/SpecContext";

/** One mono spec cell: label over value, TitleBlock vernacular. */
const SpecCell = ({ label, children, grow = 1 }) => (
  <div
    className="min-w-28 bg-[var(--viz-paper)] px-3 py-2"
    style={{ flex: `${grow} 1 0%` }}
  >
    <div className="viz-label">{label}</div>
    <div className="viz-mono mt-0.5 text-xs uppercase">{children}</div>
  </div>
);

const SpecSheet = () => {
  const {
    specProducts,
    projectName,
    setProjectName,
    buckets,
    activeProjectId,
    setActiveProject,
    removeProductFromSpec,
    updateProductQuantity,
    moveProductToBucket,
    assignActiveBucketToProject,
    hydrated,
  } = useSpec();
  const searchParams = useSearchParams();
  const projectParam = searchParams.get("project");
  const [expandedCategories, setExpandedCategories] = useState({});
  const [productStatuses, setProductStatuses] = useState({});
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  // Folios the unfiled sheet can be filed into.
  const [folios, setFolios] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : { projects: [] }))
      .then((data) => {
        if (!cancelled) setFolios(data.projects ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep link (?project=<folio id>): activate that folio's bucket once the
  // stored spec has hydrated. Unknown ids are ignored by setActiveProject.
  useEffect(() => {
    if (hydrated && projectParam) setActiveProject(projectParam);
  }, [hydrated, projectParam, setActiveProject]);

  // Folio buckets carry their folio's name — only the unfiled sheet's
  // name is editable here.
  const isFolioBucket = activeProjectId !== UNFILED_BUCKET_ID;

  // Unfiled first, folios after, each by name — a stable, quiet order.
  const bucketList = useMemo(
    () =>
      Object.entries(buckets).sort(([aId, a], [bId, b]) => {
        if (aId === UNFILED_BUCKET_ID) return -1;
        if (bId === UNFILED_BUCKET_ID) return 1;
        return a.projectName.localeCompare(b.projectName);
      }),
    [buckets],
  );

  /** Generate the spec-sheet PDF server-side from the live spec data. */
  const handleDownload = async () => {
    if (!specProducts.length || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/spec-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, products: specProducts }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadError(data.error || "Could not generate the spec sheet.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${
        projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") ||
        "spec"
      }-spec-sheet.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Could not generate the spec sheet. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Right-click context menu on spec items: {x, y, productId} or null.
  const [contextMenu, setContextMenu] = useState(null);
  useEffect(() => {
    if (!contextMenu) return undefined;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  // Group products by category
  const categories = useMemo(() => {
    if (specProducts.length === 0) {
      return [];
    }

    // Group products by category
    const categoryMap = new Map();
    specProducts.forEach((product) => {
      const categoryName = product.category || "Uncategorized";
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName).push(product);
    });

    // Convert map to array format
    return Array.from(categoryMap.entries()).map(([name, products]) => ({
      name,
      count: products.length,
      products,
    }));
  }, [specProducts]);

  // Initialize expanded categories when categories change
  useEffect(() => {
    if (categories.length > 0) {
      setExpandedCategories((prev) => {
        const updated = { ...prev };
        categories.forEach((cat) => {
          if (updated[cat.name] === undefined) {
            updated[cat.name] = true;
          }
        });
        return updated;
      });
    }
  }, [categories]);

  // Real numbers only: the subtotal of what's actually specified.
  const subtotal = specProducts.reduce(
    (sum, product) => sum + (product.price || 0) * (product.quantity || 1),
    0,
  );

  /** Client sign-off cell — an explicit dropdown, not a mystery cycle. */
  const renderStatusControl = (productId) => {
    const status = productStatuses[productId] || "draft";
    const tone =
      status === "approved"
        ? "font-bold text-[var(--viz-blue)]"
        : status === "rejected"
          ? "text-red-700"
          : "text-[var(--viz-muted)]";

    return (
      <label className="block rounded-md border border-[var(--viz-line)] px-3 py-1.5">
        <span className="viz-label">Client</span>
        <select
          value={status}
          onChange={(e) =>
            setProductStatuses((prev) => ({
              ...prev,
              [productId]: e.target.value,
            }))
          }
          className={`viz-mono mt-0.5 block w-full cursor-pointer bg-transparent text-xs uppercase outline-none ${tone}`}
          aria-label="Client sign-off status"
        >
          <option value="draft">Draft</option>
          <option value="approved">Approved ✓</option>
          <option value="rejected">Rejected ✕</option>
        </select>
      </label>
    );
  };

  const renderColorSwatch = (color) => {
    const colorMap = {
      Sand: "#F4E4BC",
      "Smoked Maple": "#8B6F47",
      "Clay gray": "#B8B8AA",
      "Drift wood Brown": "#6B5B47",
      "N/A": "#DDD",
    };

    // Try to parse color as hex code if it starts with #
    const getColorValue = (colorName) => {
      if (colorName?.startsWith("#")) {
        return colorName;
      }
      return colorMap[colorName] || "#DDD";
    };

    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-3 w-3 shrink-0 rounded-full border border-[var(--viz-line)]"
          style={{ backgroundColor: getColorValue(color) }}
          aria-hidden="true"
        />
        {color || "N/A"}
      </span>
    );
  };

  return (
    <div className="viz-scope w-full pb-16 sm:pb-24">
      <div className="pt-24 sm:pt-32 px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Masthead folio: mono meta pair over the ink rule; serif title and
            deck below, halftone drifting off the rule's right end. */}
        <header>
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource Studio</p>
              <Link
                href="/marketplace/products"
                className="viz-label shrink-0 hover:text-[var(--viz-ink)]"
              >
                Continue sourcing →
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
                  Spec sheet
                </h1>
                <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
                  Everything you&rsquo;ve chosen, set down as one document you
                  can hand to anyone.
                </p>
              </div>
            </div>
          </Reveal>
        </header>

        {/* Bucket switcher: one spec sheet per folio, plus the unfiled one.
            Only shown once a second bucket exists. */}
        {bucketList.length > 1 && (
          <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-[var(--viz-line)] pb-3">
            <p className="viz-label">Sheets</p>
            {bucketList.map(([bucketId, bucket]) => (
              <button
                key={bucketId}
                type="button"
                onClick={() => setActiveProject(bucketId)}
                aria-pressed={bucketId === activeProjectId}
                className={`viz-mono cursor-pointer text-xs uppercase tracking-[0.08em] transition-colors ${
                  bucketId === activeProjectId
                    ? "text-[var(--viz-ink)]"
                    : "text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
                }`}
              >
                {bucket.projectName}
                <span
                  className={`ml-1.5 font-bold ${
                    bucketId === activeProjectId ? "text-[var(--viz-blue)]" : ""
                  }`}
                >
                  {String(bucket.products.length).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Sheet header: project meta as a plate label. */}
        <div className="mt-8 flex flex-wrap gap-px overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-line)]">
          <SpecCell label="Sheet">SP-01</SpecCell>
          <div
            className="min-w-52 bg-[var(--viz-paper)] px-3 py-2"
            style={{ flex: "3 1 0%" }}
          >
            {isFolioBucket
              ? // Folio buckets take their folio's name — not editable here.
                <>
                  <div className="viz-label">Project</div>
                  <div className="viz-mono mt-0.5 truncate text-xs uppercase">
                    {projectName}
                  </div>
                </>
              : <>
                  <label className="viz-label" htmlFor="spec-project-name">
                    Project
                  </label>
                  <input
                    id="spec-project-name"
                    type="text"
                    value={projectName}
                    maxLength={80}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={(e) => {
                      if (!e.target.value.trim())
                        setProjectName("Untitled Project");
                    }}
                    className="viz-mono mt-0.5 w-full border-b border-transparent bg-transparent text-xs uppercase outline-none transition-colors focus:border-[var(--viz-ink)]"
                    aria-label="Project name"
                  />
                  {folios.length > 0 && specProducts.length > 0 && (
                    <select
                      className="viz-mono mt-1.5 w-full cursor-pointer rounded-sm border border-[var(--viz-line)] bg-white px-1.5 py-1 text-[10px] uppercase tracking-wide text-[var(--viz-muted)]"
                      value=""
                      aria-label="File this sheet into a folio"
                      onChange={(e) => {
                        const folio = folios.find(
                          (f) => f.id === e.target.value,
                        );
                        if (folio)
                          assignActiveBucketToProject(folio.id, folio.name);
                      }}
                    >
                      <option value="">File into folio…</option>
                      {folios.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>}
          </div>
          <SpecCell label="Items">
            <span className="font-bold text-[var(--viz-blue)]">
              {String(specProducts.length).padStart(2, "0")}
            </span>
          </SpecCell>
        </div>

        {/* Action row: the one ink pill, errors beside it. */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {downloadError && (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700">
              {downloadError}
            </p>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!specProducts.length || downloading}
            className={`rounded-full px-6 py-2.5 text-sm transition-colors duration-200 ${
              !specProducts.length || downloading
                ? "cursor-not-allowed bg-[var(--viz-line)] text-[var(--viz-muted)]"
                : "cursor-pointer bg-[var(--viz-ink)] text-[var(--viz-paper)] hover:bg-[var(--viz-well)]"
            }`}
          >
            {downloading ? "Preparing PDF…" : "Download spec sheet"}
          </button>
        </div>

        {/* Totals: one strip of mono cells, the document's tally line.
            Real numbers only — no invented tax/profit/discount figures. */}
        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-px overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-line)]">
            <SpecCell label="Sections">
              {String(categories.length).padStart(2, "0")}
            </SpecCell>
            <SpecCell label="Subtotal" grow={2}>
              ₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </SpecCell>
          </div>
        )}

        {/* Empty state: one mono sentence, an invitation — never ghost boxes. */}
        {categories.length === 0 && (
          <p className="viz-mono mt-10 text-sm text-[var(--viz-muted)]">
            Nothing specified yet — pull materials from the{" "}
            <Link
              href="/marketplace/products"
              className="text-[var(--viz-ink)] underline underline-offset-4 hover:text-[var(--viz-blue)]"
            >
              product library
            </Link>{" "}
            or{" "}
            <Link
              href="/ai-visualizer"
              className="text-[var(--viz-ink)] underline underline-offset-4 hover:text-[var(--viz-blue)]"
            >
              render a room
            </Link>{" "}
            and add what you find.
          </p>
        )}

        {/* Category sections: serif head, indigo count, hairline-divided rows. */}
        {categories.map((category) => (
          <section key={category.name} className="mt-10">
            <div className="flex items-baseline justify-between gap-4 border-b border-[var(--viz-line)] pb-2">
              <h2 className="viz-serif text-xl sm:text-2xl">
                {category.name}
                <span className="viz-mono ml-3 align-middle text-xs font-bold text-[var(--viz-blue)]">
                  {String(category.count).padStart(2, "0")}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => toggleCategory(category.name)}
                aria-expanded={!!expandedCategories[category.name]}
                className="viz-label shrink-0 cursor-pointer transition-colors duration-200 hover:text-[var(--viz-ink)]"
              >
                {expandedCategories[category.name] ? "Fold ↑" : "Unfold ↓"}
              </button>
            </div>

            {expandedCategories[category.name] && (
              <div className="mt-4 flex flex-col gap-px overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-line)]">
                {category.products.map((product) => (
                  <article
                    key={product.id}
                    className="bg-[var(--viz-paper)] p-4 sm:p-5"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        productId: product.id,
                        productName: product.name,
                        link: product.link,
                      });
                    }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-[var(--viz-line)] sm:h-24 sm:w-24">
                          {/* Spec products can come from any of the material
                              bank's ~49 supplier CDNs — next/image would
                              throw on unconfigured hosts. */}
                          {/* biome-ignore lint/performance/noImgElement: arbitrary supplier hosts cannot use next/image */}
                          <img
                            src={product.image}
                            alt={product.name}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium sm:text-base">
                            {product.name}
                          </h3>
                          <p className="viz-mono mt-1 text-xs uppercase text-[var(--viz-muted)]">
                            {product.brand}
                          </p>
                          {product.inStock && (
                            <p className="viz-mono mt-2 text-xs font-bold uppercase text-[var(--viz-blue)]">
                              In stock
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-start gap-2">
                        {renderStatusControl(product.id)}
                        {product.link &&
                          (product.link.startsWith("http")
                            ? <a
                                href={product.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="viz-mono cursor-pointer rounded-md border border-[var(--viz-line)] px-3 py-1.5 text-xs uppercase transition-colors duration-200 hover:bg-[var(--viz-ground)]"
                              >
                                Vendor ↗
                              </a>
                            : <Link
                                href={product.link}
                                className="viz-mono cursor-pointer rounded-md border border-[var(--viz-line)] px-3 py-1.5 text-xs uppercase transition-colors duration-200 hover:bg-[var(--viz-ground)]"
                              >
                                View product
                              </Link>)}
                      </div>
                    </div>

                    {/* The item's own plate label: every fact in a mono cell. */}
                    <div className="mt-4 flex flex-wrap gap-px overflow-hidden rounded-md border border-[var(--viz-line)] bg-[var(--viz-line)]">
                      <SpecCell label="Material">{product.material}</SpecCell>
                      <SpecCell label="Finish">{product.finish}</SpecCell>
                      <SpecCell label="Dimensions" grow={2}>
                        {product.dimensions}
                      </SpecCell>
                      <SpecCell label="Colour">
                        {renderColorSwatch(product.color)}
                      </SpecCell>
                      <SpecCell label="ID" grow={2}>
                        {product.id}
                      </SpecCell>
                      <SpecCell label="Price">
                        ₹
                        {product.price.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </SpecCell>
                      <SpecCell label="Qty">
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${product.name}`}
                            className="cursor-pointer rounded border border-[var(--viz-line)] px-1.5 leading-none hover:bg-[var(--viz-ground)]"
                            onClick={() =>
                              updateProductQuantity(
                                product.id,
                                (product.quantity || 1) - 1,
                              )
                            }
                          >
                            −
                          </button>
                          <span className="min-w-5 text-center">
                            {product.quantity || 1}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${product.name}`}
                            className="cursor-pointer rounded border border-[var(--viz-line)] px-1.5 leading-none hover:bg-[var(--viz-ground)]"
                            onClick={() =>
                              updateProductQuantity(
                                product.id,
                                (product.quantity || 1) + 1,
                              )
                            }
                          >
                            +
                          </button>
                        </span>
                      </SpecCell>
                      <SpecCell label="Timeline">{product.timeline}</SpecCell>
                      <div className="flex min-w-16 flex-1 items-center justify-center bg-[var(--viz-paper)] px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeProductFromSpec(product.id)}
                          aria-label={`Remove ${product.name} from the spec`}
                          title="Remove from spec"
                          className="cursor-pointer rounded-md p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4 fill-current"
                          >
                            <path d="M9 3v1H4v2h16V4h-5V3H9zm-3 5v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8H6zm4 2h2v9h-2v-9zm4 0h2v9h-2v-9z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Right-click menu: file the item elsewhere, open it, or remove it. */}
      {contextMenu && (
        <div
          className="fixed z-[80] w-56 overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-paper)] py-1 shadow-xl"
          style={{
            left: Math.min(
              contextMenu.x,
              (typeof window !== "undefined" ? window.innerWidth : 1200) - 240,
            ),
            top: Math.min(
              contextMenu.y,
              (typeof window !== "undefined" ? window.innerHeight : 800) - 260,
            ),
          }}
          role="menu"
        >
          <p className="viz-label truncate px-3 pt-1.5 pb-1">
            {contextMenu.productName}
          </p>
          <div className="viz-label border-t border-[var(--viz-line)] px-3 pt-2 pb-0.5">
            Move to
          </div>
          {activeProjectId !== UNFILED_BUCKET_ID && (
            <button
              type="button"
              role="menuitem"
              className="block w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-[var(--viz-ground)]"
              onClick={() => {
                moveProductToBucket(
                  contextMenu.productId,
                  UNFILED_BUCKET_ID,
                  "Untitled Project",
                );
                setContextMenu(null);
              }}
            >
              Unfiled sheet
            </button>
          )}
          {folios
            .filter((f) => f.id !== activeProjectId)
            .map((f) => (
              <button
                key={f.id}
                type="button"
                role="menuitem"
                className="block w-full cursor-pointer truncate px-3 py-1.5 text-left text-sm hover:bg-[var(--viz-ground)]"
                onClick={() => {
                  moveProductToBucket(contextMenu.productId, f.id, f.name);
                  setContextMenu(null);
                }}
              >
                {f.name}
              </button>
            ))}
          <div className="mt-1 border-t border-[var(--viz-line)]">
            {contextMenu.link && (
              <Link
                href={contextMenu.link}
                role="menuitem"
                className="block px-3 py-1.5 text-sm hover:bg-[var(--viz-ground)]"
                onClick={() => setContextMenu(null)}
              >
                View product
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              className="block w-full cursor-pointer px-3 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
              onClick={() => {
                removeProductFromSpec(contextMenu.productId);
                setContextMenu(null);
              }}
            >
              Remove from spec
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// useSearchParams requires a Suspense boundary in a client page.
const SpecBuilder = () => (
  <Suspense fallback={null}>
    <SpecSheet />
  </Suspense>
);

export default SpecBuilder;
