"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Reveal from "@/components/Reveal";

const ITEMS_PER_PAGE = 12;

const ProductsContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const categoryParam = searchParams.get("category") || "";

  // Filter state
  const [selectedCommercial, setSelectedCommercial] = useState(
    searchParams.get("commercial") || "",
  );
  const [selectedResidential, setSelectedResidential] = useState(
    searchParams.get("residential") || "",
  );
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedPatterns, setSelectedPatterns] = useState([]);
  const [sortBy, setSortBy] = useState(
    searchParams.get("sort") || "recommended",
  );

  // Filter options
  const [brands, setBrands] = useState([]);
  const [colors, setColors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [showFilters, setShowFilters] = useState(true);

  // Fetch products from database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/products-list");
        if (!response.ok) throw new Error("Failed to fetch products");

        const data = await response.json();
        setProducts(data.products || []);

        // Extract unique brands, colors, categories, and patterns
        const uniqueBrands = [
          ...new Set(data.products.map((p) => p.brand_name).filter(Boolean)),
        ].sort();
        const uniqueColors = [
          ...new Set(data.products.map((p) => p.color).filter(Boolean)),
        ].sort();
        const uniqueCategories = [
          ...new Set(data.products.map((p) => p.category_name).filter(Boolean)),
        ].sort();

        // Extract patterns from series_name
        const uniquePatterns = [
          ...new Set(
            data.products
              .map((p) => {
                if (p.series_name) return p.series_name;
                // Try to extract from sub_category if available
                if (
                  Array.isArray(p.sub_category) &&
                  p.sub_category.length > 0
                ) {
                  return p.sub_category[0];
                }
                return null;
              })
              .filter(Boolean),
          ),
        ].sort();

        setBrands(uniqueBrands);
        setColors(uniqueColors);
        setCategories(uniqueCategories);
        setPatterns(uniquePatterns);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on selected filters
  useEffect(() => {
    let filtered = [...products];

    // Filter by category (can be category_name or series_name/pattern)
    if (categoryParam) {
      filtered = filtered.filter(
        (p) =>
          p.category_name
            ?.toLowerCase()
            .includes(categoryParam.toLowerCase()) ||
          p.series_name?.toLowerCase().includes(categoryParam.toLowerCase()) ||
          (Array.isArray(p.sub_category) &&
            p.sub_category.some((sc) =>
              sc.toLowerCase().includes(categoryParam.toLowerCase()),
            )),
      );
    }

    // Filter by commercial/residential
    if (selectedCommercial === "true") {
      filtered = filtered.filter((p) =>
        p.tags?.some((tag) => tag.toLowerCase().includes("commercial")),
      );
    }

    if (selectedResidential === "true") {
      filtered = filtered.filter((p) =>
        p.tags?.some((tag) => tag.toLowerCase().includes("residential")),
      );
    }

    // Filter by brands
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((p) => selectedBrands.includes(p.brand_name));
    }

    // Filter by colors
    if (selectedColors.length > 0) {
      filtered = filtered.filter((p) => selectedColors.includes(p.color));
    }

    // Filter by patterns (from series_name or sub_category)
    if (selectedPatterns.length > 0) {
      filtered = filtered.filter((p) => {
        const matchesSeries =
          p.series_name && selectedPatterns.includes(p.series_name);
        if (matchesSeries) return true;

        const subCategories = Array.isArray(p.sub_category)
          ? p.sub_category
          : [];
        return selectedPatterns.some((pattern) =>
          subCategories.some((sc) =>
            sc.toLowerCase().includes(pattern.toLowerCase()),
          ),
        );
      });
    }

    // Sort products
    switch (sortBy) {
      case "price-low":
        // Since we don't have price data, sort by name
        filtered.sort((a, b) =>
          a.product_name?.localeCompare(b.product_name || ""),
        );
        break;
      case "price-high":
        filtered.sort((a, b) =>
          b.product_name?.localeCompare(a.product_name || ""),
        );
        break;
      case "newest":
        filtered.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
        break;
      default:
        // Default sorting - can be customized
        break;
    }

    setFilteredProducts(filtered);
  }, [
    products,
    categoryParam,
    selectedCommercial,
    selectedResidential,
    selectedBrands,
    selectedColors,
    selectedPatterns,
    sortBy,
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Update URL params
  const updateParams = useCallback(
    (key, value) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== "page") {
        params.delete("page"); // Reset to page 1 when filters change
      }
      router.push(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  const handlePageChange = (page) => {
    updateParams("page", page.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    setSortBy(value);
    updateParams("sort", value);
  };

  // Get color variants for a product (similar products in same series or same product name base)
  const getColorVariants = (product) => {
    const variantProducts = [];
    const usedIds = new Set([product.id]);

    // First, try to find products with same series_name
    if (product.series_name) {
      const seriesVariants = products
        .filter(
          (p) =>
            p.series_name === product.series_name &&
            !usedIds.has(p.id) &&
            p.color_code &&
            p.color,
        )
        .slice(0, 5);

      seriesVariants.forEach((p) => {
        variantProducts.push(p);
        usedIds.add(p.id);
      });
    }

    // Also try to find products with similar product name (same base product, different colors)
    const productNameBase =
      product.product_name?.split(/\s+/).slice(0, 2).join(" ") || "";
    if (productNameBase && variantProducts.length < 5) {
      const nameVariants = products
        .filter(
          (p) =>
            p.product_name?.startsWith(productNameBase) &&
            !usedIds.has(p.id) &&
            p.color_code &&
            p.color,
        )
        .slice(0, 5 - variantProducts.length);

      nameVariants.forEach((p) => {
        variantProducts.push(p);
        usedIds.add(p.id);
      });
    }

    return variantProducts.map((p) => ({
      color: p.color,
      colorCode: p.color_code || "#CCCCCC",
    }));
  };

  // Get category thumbnail images - map series/patterns to images
  const getCategoryThumbnail = (category) => {
    const categoryMap = {
      // Patterns/Series
      "Marbles & Stones": "/api/images/sample-category/sample-2.avif",
      "Fluted Laminates": "/api/images/sample-category/sample-6.webp",
      "Geometric & Abstracts": "/api/images/sample-category/sample-3.webp",
      "Wooden Effect": "/api/images/sample-category/sample-5.jpg",
      "Abstract Art": "/api/images/sample-category/sample-3.webp",
      // Categories
      Laminates: "/api/images/sample-category/sample-6.webp",
      Quartz: "/api/images/sample-category/sample-2.avif",
      Wallpaper: "/api/images/sample-category/sample-1.webp",
      Flooring: "/api/images/sample-category/sample-4.avif",
    };
    return categoryMap[category] || "/api/images/sample-category/sample-1.webp";
  };

  if (loading) {
    return (
      <div className="viz-scope flex min-h-screen w-full items-center justify-center px-4">
        <p className="viz-mono text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)]">
          Loading the sample library…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="viz-scope min-h-screen w-full px-4 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          The library did not load: {error}. Refresh to try again.
        </div>
      </div>
    );
  }

  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32">
        {/* Folio masthead */}
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">Sample library</p>
            <p className="viz-label hidden sm:block">
              {filteredProducts.length} samples on file
            </p>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <h1 className="viz-serif text-4xl leading-none sm:text-5xl">
              {categoryParam
                ? categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)
                : "All products"}
            </h1>
          </div>
        </Reveal>

        {/* Category plates - patterns/series first, then categories */}
        {!categoryParam && (patterns.length > 0 || categories.length > 0) && (
          <div className="mt-8 flex gap-4 overflow-x-auto pb-2">
            {[...patterns, ...categories].slice(0, 5).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateParams("category", item)}
                className="group w-24 flex-shrink-0 text-left"
              >
                <span
                  className="block aspect-square w-full rounded-lg border border-[var(--viz-line)] transition-shadow duration-300 group-hover:shadow-[0_12px_24px_-16px_rgba(38,34,26,0.5)]"
                  style={{
                    backgroundImage: `url(${getCategoryThumbnail(item)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  aria-hidden="true"
                />
                <span className="viz-mono mt-2 block w-full truncate text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)] transition-colors group-hover:text-[var(--viz-ink)]">
                  {item}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-8 lg:flex-row">
          {/* Sidebar filters */}
          <aside
            className={`lg:w-64 flex-shrink-0 ${
              showFilters ? "block" : "hidden"
            } lg:block`}
          >
            <div className="viz-panel sticky top-24 p-4">
              <div className="mb-4 flex items-center justify-between lg:hidden">
                <h2 className="viz-label">Filters</h2>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  aria-label="Close filters"
                  className="viz-mono text-xs text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]"
                >
                  ✕
                </button>
              </div>

              {/* Commercial/Residential */}
              <div className="mb-6">
                <h3 className="viz-label mb-3">Type</h3>
                <div className="space-y-2">
                  <label className="flex items-center text-sm text-[var(--viz-ink)]">
                    <input
                      type="radio"
                      name="type"
                      checked={selectedCommercial === "true"}
                      onChange={(e) => {
                        setSelectedCommercial(e.target.checked ? "true" : "");
                        setSelectedResidential("");
                        updateParams(
                          "commercial",
                          e.target.checked ? "true" : "",
                        );
                      }}
                      className="mr-2 accent-[var(--viz-blue)]"
                    />
                    Commercial
                  </label>
                  <label className="flex items-center text-sm text-[var(--viz-ink)]">
                    <input
                      type="radio"
                      name="type"
                      checked={selectedResidential === "true"}
                      onChange={(e) => {
                        setSelectedResidential(e.target.checked ? "true" : "");
                        setSelectedCommercial("");
                        updateParams(
                          "residential",
                          e.target.checked ? "true" : "",
                        );
                      }}
                      className="mr-2 accent-[var(--viz-blue)]"
                    />
                    Residential
                  </label>
                </div>
              </div>

              {/* Brands */}
              {brands.length > 0 && (
                <div className="mb-6 border-t border-[var(--viz-line)] pt-4">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between">
                      <span className="viz-label">Brand</span>
                      <span
                        className="text-[var(--viz-muted)] transition-transform group-open:rotate-90"
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </summary>
                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                      {brands.map((brand) => (
                        <label
                          key={brand}
                          className="flex items-center text-sm text-[var(--viz-ink)]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={(e) => {
                              const newBrands = e.target.checked
                                ? [...selectedBrands, brand]
                                : selectedBrands.filter((b) => b !== brand);
                              setSelectedBrands(newBrands);
                            }}
                            className="mr-2 accent-[var(--viz-blue)]"
                          />
                          {brand}
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Colors */}
              {colors.length > 0 && (
                <div className="mb-6 border-t border-[var(--viz-line)] pt-4">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between">
                      <span className="viz-label">Color</span>
                      <span
                        className="text-[var(--viz-muted)] transition-transform group-open:rotate-90"
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </summary>
                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                      {colors.map((color) => (
                        <label
                          key={color}
                          className="flex items-center text-sm text-[var(--viz-ink)]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedColors.includes(color)}
                            onChange={(e) => {
                              const newColors = e.target.checked
                                ? [...selectedColors, color]
                                : selectedColors.filter((c) => c !== color);
                              setSelectedColors(newColors);
                            }}
                            className="mr-2 accent-[var(--viz-blue)]"
                          />
                          {color}
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Pattern/Style */}
              {patterns.length > 0 && (
                <div className="mb-2 border-t border-[var(--viz-line)] pt-4">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between">
                      <span className="viz-label">Pattern</span>
                      <span
                        className="text-[var(--viz-muted)] transition-transform group-open:rotate-90"
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </summary>
                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                      {patterns.map((pattern) => (
                        <label
                          key={pattern}
                          className="flex items-center text-sm text-[var(--viz-ink)]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPatterns.includes(pattern)}
                            onChange={(e) => {
                              const newPatterns = e.target.checked
                                ? [...selectedPatterns, pattern]
                                : selectedPatterns.filter((p) => p !== pattern);
                              setSelectedPatterns(newPatterns);
                            }}
                            className="mr-2 accent-[var(--viz-blue)]"
                          />
                          {pattern}
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  className="viz-mono rounded-md border border-[var(--viz-line)] px-3 py-2 text-xs tracking-[0.08em] uppercase transition-colors hover:bg-[var(--viz-ground)] lg:hidden"
                >
                  Filters
                </button>
                <h2 className="viz-mono text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                  {categoryParam ? categoryParam : "All products"} ·{" "}
                  {filteredProducts.length}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="marketplace-sort" className="viz-label">
                  Sort by
                </label>
                <select
                  id="marketplace-sort"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="viz-select rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-3 py-2 text-sm text-[var(--viz-ink)]"
                >
                  <option value="recommended">Recommended</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </div>
            </div>

            {/* Products grid */}
            {paginatedProducts.length === 0
              ? <p className="viz-mono py-12 text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                  No samples match these filters — clear one and look again.
                </p>
              : <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {paginatedProducts.map((product) => {
                      const colorVariants = getColorVariants(product);

                      return (
                        <div
                          key={product.id}
                          className="viz-panel group overflow-hidden transition-shadow duration-300 hover:shadow-[0_20px_40px_-24px_rgba(38,34,26,0.55)]"
                        >
                          {/* Sample image */}
                          <div className="relative aspect-square border-b border-[var(--viz-line)] bg-[var(--viz-ground)]">
                            {product.image_url
                              ? <Image
                                  src={product.image_url}
                                  alt={product.product_name || "Product"}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                />
                              : <div className="viz-mono flex h-full w-full items-center justify-center text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                                  No image on file
                                </div>}
                            <button
                              type="button"
                              aria-label="Save for later"
                              className="absolute top-2 right-2 rounded-full border border-[var(--viz-line)] bg-[var(--viz-paper)] p-2 transition-colors hover:bg-[var(--viz-ground)]"
                            >
                              <svg
                                className="h-4 w-4 text-[var(--viz-muted)]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                              </svg>
                            </button>
                          </div>

                          {/* Sample facts */}
                          <div className="p-4">
                            {(product.color_code ||
                              colorVariants.length > 0) && (
                              <div className="mb-3 flex items-center gap-2">
                                {product.color_code && (
                                  <span
                                    className="h-5 w-5 rounded-full border border-[var(--viz-line)]"
                                    style={{
                                      backgroundColor: product.color_code,
                                    }}
                                    title={product.color || "Color"}
                                  />
                                )}
                                {colorVariants
                                  .slice(0, product.color_code ? 2 : 3)
                                  .map((variant) => (
                                    <span
                                      key={`${variant.color}-${variant.colorCode}`}
                                      className="h-5 w-5 rounded-full border border-[var(--viz-line)]"
                                      style={{
                                        backgroundColor: variant.colorCode,
                                      }}
                                      title={variant.color}
                                    />
                                  ))}
                                {(() => {
                                  const totalShown =
                                    (product.color_code ? 1 : 0) +
                                    (product.color_code
                                      ? Math.min(colorVariants.length, 2)
                                      : Math.min(colorVariants.length, 3));
                                  const totalAvailable =
                                    (product.color_code ? 1 : 0) +
                                    colorVariants.length;
                                  const remaining = totalAvailable - totalShown;
                                  return remaining > 0
                                    ? <span className="viz-mono text-[11px] text-[var(--viz-muted)]">
                                        +{remaining}
                                      </span>
                                    : null;
                                })()}
                              </div>
                            )}

                            <p className="viz-label">
                              {product.sub_category?.[0] ||
                                product.category_name ||
                                "Product"}
                            </p>
                            <h3 className="viz-serif mt-1 truncate text-lg">
                              {product.product_name ||
                                product.brand_name ||
                                "Untitled sample"}
                            </h3>

                            {/* Mono meta rows */}
                            <dl className="mt-3 border-t border-[var(--viz-line)]">
                              <div className="flex items-baseline justify-between gap-3 border-b border-[var(--viz-line)] py-1.5">
                                <dt className="viz-label">Brand</dt>
                                <dd className="viz-mono truncate text-xs uppercase">
                                  {product.brand_name || "—"}
                                </dd>
                              </div>
                              <div className="flex items-baseline justify-between gap-3 border-b border-[var(--viz-line)] py-1.5">
                                <dt className="viz-label">Color</dt>
                                <dd className="viz-mono truncate text-xs uppercase">
                                  {product.color || "—"}
                                </dd>
                              </div>
                              <div className="flex items-baseline justify-between gap-3 border-b border-[var(--viz-line)] py-1.5">
                                <dt className="viz-label">Price</dt>
                                <dd className="viz-mono text-xs uppercase">
                                  $$
                                </dd>
                              </div>
                            </dl>

                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/marketplace/products/${product.id}`,
                                )
                              }
                              className="mt-4 w-full rounded-full bg-[var(--viz-ink)] px-4 py-2 text-sm font-medium text-[var(--viz-paper)] transition-colors hover:bg-[var(--viz-well)]"
                            >
                              View product
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="viz-mono rounded-md border border-[var(--viz-line)] px-3 py-2 text-xs tracking-[0.08em] uppercase transition-colors hover:bg-[var(--viz-ground)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                type="button"
                                onClick={() => handlePageChange(page)}
                                className={`viz-mono rounded-md border px-3 py-2 text-xs transition-colors ${
                                  currentPage === page
                                    ? "border-[var(--viz-ink)] bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                                    : "border-[var(--viz-line)] text-[var(--viz-ink)] hover:bg-[var(--viz-ground)]"
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span
                                key={page}
                                className="viz-mono px-2 text-xs text-[var(--viz-muted)]"
                              >
                                …
                              </span>
                            );
                          }
                          return null;
                        },
                      )}

                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="viz-mono rounded-md border border-[var(--viz-line)] px-3 py-2 text-xs tracking-[0.08em] uppercase transition-colors hover:bg-[var(--viz-ground)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>}
          </div>
        </div>
      </div>
    </div>
  );
};

const Products = () => {
  return (
    <Suspense
      fallback={
        <div className="viz-scope flex min-h-screen w-full items-center justify-center px-4">
          <p className="viz-mono text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)]">
            Loading the sample library…
          </p>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
};

export default Products;
