"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Reveal from "@/components/Reveal";
import { useSpec } from "../../contexts/SpecContext";

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

const SpecBuilder = () => {
  const { specProducts, projectName, setProjectName } = useSpec();
  const [expandedCategories, setExpandedCategories] = useState({});
  const [productStatuses, setProductStatuses] = useState({});
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

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

  const toggleStatus = (productId) => {
    setProductStatuses((prev) => {
      const statuses = ["approved", "rejected", "draft"];
      const currentIndex = statuses.indexOf(prev[productId] || "draft");
      const nextIndex = (currentIndex + 1) % statuses.length;
      return {
        ...prev,
        [productId]: statuses[nextIndex],
      };
    });
  };

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

  /** Client sign-off cell: cycles draft → approved → rejected on click. */
  const renderStatusControl = (productId) => {
    const status = productStatuses[productId] || "draft";
    const statusConfig = {
      approved: {
        text: "Approved ✓",
        className: "font-bold text-[var(--viz-blue)]",
      },
      rejected: { text: "Rejected ✕", className: "text-red-700" },
      draft: { text: "Draft", className: "text-[var(--viz-muted)]" },
    };
    const config = statusConfig[status];

    return (
      <button
        type="button"
        onClick={() => toggleStatus(productId)}
        className="cursor-pointer rounded-md border border-[var(--viz-line)] px-3 py-1.5 text-left transition-colors duration-200 hover:bg-[var(--viz-ground)]"
      >
        <span className="viz-label">Client</span>
        <span
          className={`viz-mono mt-0.5 block text-xs uppercase ${config.className}`}
        >
          {config.text}
        </span>
      </button>
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

        {/* Sheet header: project meta as a plate label. */}
        <div className="mt-8 flex flex-wrap gap-px overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-line)]">
          <SpecCell label="Sheet">SP-01</SpecCell>
          <div
            className="min-w-52 bg-[var(--viz-paper)] px-3 py-2"
            style={{ flex: "3 1 0%" }}
          >
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
                if (!e.target.value.trim()) setProjectName("Untitled Project");
              }}
              className="viz-mono mt-0.5 w-full border-b border-transparent bg-transparent text-xs uppercase outline-none transition-colors focus:border-[var(--viz-ink)]"
              aria-label="Project name"
            />
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
                      <SpecCell label="Qty">{product.quantity}</SpecCell>
                      <SpecCell label="Timeline">{product.timeline}</SpecCell>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default SpecBuilder;
