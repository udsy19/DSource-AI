"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";

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
    searchParams.get("commercial") || ""
  );
  const [selectedResidential, setSelectedResidential] = useState(
    searchParams.get("residential") || ""
  );
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedPatterns, setSelectedPatterns] = useState([]);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [sortBy, setSortBy] = useState(
    searchParams.get("sort") || "recommended"
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
              .filter(Boolean)
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
              sc.toLowerCase().includes(categoryParam.toLowerCase())
            ))
      );
    }

    // Filter by commercial/residential
    if (selectedCommercial === "true") {
      filtered = filtered.filter((p) =>
        p.tags?.some((tag) => tag.toLowerCase().includes("commercial"))
      );
    }

    if (selectedResidential === "true") {
      filtered = filtered.filter((p) =>
        p.tags?.some((tag) => tag.toLowerCase().includes("residential"))
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
            sc.toLowerCase().includes(pattern.toLowerCase())
          )
        );
      });
    }

    // Sort products
    switch (sortBy) {
      case "price-low":
        // Since we don't have price data, sort by name
        filtered.sort((a, b) =>
          a.product_name?.localeCompare(b.product_name || "")
        );
        break;
      case "price-high":
        filtered.sort((a, b) =>
          b.product_name?.localeCompare(a.product_name || "")
        );
        break;
      case "newest":
        filtered.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        break;
      case "recommended":
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
    [searchParams, router]
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
            p.color
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
            p.color
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
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-xl">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
            {categoryParam
              ? categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)
              : "All Products"}
          </h1>

          {/* Category Thumbnails - Show patterns/series first, then categories */}
          {!categoryParam && (patterns.length > 0 || categories.length > 0) && (
            <div className="flex justify-center gap-6 mb-8 overflow-x-auto pb-4">
              {[...patterns, ...categories].slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  onClick={() => updateParams("category", item)}
                  className="flex flex-col items-center cursor-pointer flex-shrink-0 group"
                >
                  <div
                    className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-gray-400 transition-all"
                    style={{
                      backgroundImage: `url(${getCategoryThumbnail(item)})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <span className="mt-2 text-sm font-medium text-gray-700 text-center max-w-[80px] truncate">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside
            className={`lg:w-64 flex-shrink-0 ${
              showFilters ? "block" : "hidden"
            } lg:block`}
          >
            <div className="bg-gray-50 rounded-lg p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Commercial/Residential */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Type
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="type"
                      checked={selectedCommercial === "true"}
                      onChange={(e) => {
                        setSelectedCommercial(e.target.checked ? "true" : "");
                        setSelectedResidential("");
                        updateParams(
                          "commercial",
                          e.target.checked ? "true" : ""
                        );
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Commercial</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="type"
                      checked={selectedResidential === "true"}
                      onChange={(e) => {
                        setSelectedResidential(e.target.checked ? "true" : "");
                        setSelectedCommercial("");
                        updateParams(
                          "residential",
                          e.target.checked ? "true" : ""
                        );
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Residential</span>
                  </label>
                </div>
              </div>

              {/* Brands */}
              {brands.length > 0 && (
                <div className="mb-6">
                  <details className="group">
                    <summary className="text-sm font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                      <span>Brand</span>
                      <span className="text-gray-400 group-open:rotate-90 transition-transform">
                        ›
                      </span>
                    </summary>
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {brands.map((brand) => (
                        <label key={brand} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={(e) => {
                              const newBrands = e.target.checked
                                ? [...selectedBrands, brand]
                                : selectedBrands.filter((b) => b !== brand);
                              setSelectedBrands(newBrands);
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{brand}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Colors */}
              {colors.length > 0 && (
                <div className="mb-6">
                  <details className="group">
                    <summary className="text-sm font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                      <span>Color</span>
                      <span className="text-gray-400 group-open:rotate-90 transition-transform">
                        ›
                      </span>
                    </summary>
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {colors.map((color) => (
                        <label key={color} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedColors.includes(color)}
                            onChange={(e) => {
                              const newColors = e.target.checked
                                ? [...selectedColors, color]
                                : selectedColors.filter((c) => c !== color);
                              setSelectedColors(newColors);
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{color}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Pattern/Style */}
              {patterns.length > 0 && (
                <div className="mb-6">
                  <details className="group">
                    <summary className="text-sm font-semibold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                      <span>Pattern</span>
                      <span className="text-gray-400 group-open:rotate-90 transition-transform">
                        ›
                      </span>
                    </summary>
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {patterns.map((pattern) => (
                        <label key={pattern} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedPatterns.includes(pattern)}
                            onChange={(e) => {
                              const newPatterns = e.target.checked
                                ? [...selectedPatterns, pattern]
                                : selectedPatterns.filter((p) => p !== pattern);
                              setSelectedPatterns(newPatterns);
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">
                            {pattern}
                          </span>
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header with Sort */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <button
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  Filters
                </button>
                <h2 className="text-xl font-semibold text-gray-900">
                  {categoryParam ? categoryParam : "All Products"} (
                  {filteredProducts.length})
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Sort By:</label>
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recommended">Recommended</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {paginatedProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  No products found matching your filters.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedProducts.map((product) => {
                    const colorVariants = getColorVariants(product);

                    return (
                      <div
                        key={product.id}
                        className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {/* Product Image */}
                        <div className="relative aspect-square bg-gray-100">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.product_name || "Product"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                          {/* Heart Icon */}
                          <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors">
                            <svg
                              className="w-5 h-5 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
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

                        {/* Product Info */}
                        <div className="p-4">
                          {/* Color Swatches */}
                          {(product.color_code || colorVariants.length > 0) && (
                            <div className="flex items-center gap-2 mb-3">
                              {/* Show current product's color first */}
                              {product.color_code && (
                                <div
                                  className="w-6 h-6 rounded-full border border-gray-300"
                                  style={{
                                    backgroundColor: product.color_code,
                                  }}
                                  title={product.color || "Color"}
                                />
                              )}
                              {/* Show color variants */}
                              {colorVariants
                                .slice(0, product.color_code ? 2 : 3)
                                .map((variant, idx) => (
                                  <div
                                    key={idx}
                                    className="w-6 h-6 rounded-full border border-gray-300"
                                    style={{
                                      backgroundColor: variant.colorCode,
                                    }}
                                    title={variant.color}
                                  />
                                ))}
                              {/* Show +X indicator if there are more variants */}
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
                                return remaining > 0 ? (
                                  <span className="text-xs text-gray-500">
                                    +{remaining}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          )}

                          {/* Price (placeholder) */}
                          <div className="text-lg font-semibold text-gray-900 mb-1">
                            $$
                          </div>

                          {/* Product Type */}
                          <div className="text-xs text-gray-500 mb-1">
                            {product.sub_category?.[0] ||
                              product.category_name ||
                              "Product"}
                          </div>

                          {/* Brand */}
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {product.brand_name || "Unknown Brand"}
                          </div>

                          {/* Color */}
                          <div className="text-sm text-gray-600 mb-4">
                            {product.color || "N/A"}
                          </div>

                          {/* View Product Button */}
                          <button
                            onClick={() =>
                              router.push(`/marketplace/products/${product.id}`)
                            }
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
                          >
                            View Product
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                              onClick={() => handlePageChange(page)}
                              className={`px-4 py-2 border rounded-md text-sm font-medium ${
                                currentPage === page
                                  ? "bg-gray-900 text-white border-gray-900"
                                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
                            <span key={page} className="px-2">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }
                    )}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
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
        <div className="w-full h-screen flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
};

export default Products;
