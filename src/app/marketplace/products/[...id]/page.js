"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import Reveal from "@/components/Reveal";
import { useSpec } from "../../../../contexts/SpecContext";

const ProductDetailsContent = () => {
  const params = useParams();
  const { addProductToSpec } = useSpec();

  // Handle catch-all route: [...id] means params.id is an array
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Image gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [images, setImages] = useState([]);

  // Selection state
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    essentials: false,
    installation: false,
    about: false,
    additional: false,
  });

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Product not found");
            return;
          }
          throw new Error("Failed to fetch product");
        }

        const data = await response.json();
        setProduct(data.product);

        // Set up images array (main image + related product images)
        const imageArray = [];
        if (data.product.image_url) {
          imageArray.push({
            url: data.product.image_url,
            color: data.product.color,
            id: data.product.id,
          });
        }

        // Add related product images as thumbnails
        if (data.relatedProducts && data.relatedProducts.length > 0) {
          data.relatedProducts.forEach((p) => {
            if (p.image_url && p.id !== data.product.id) {
              imageArray.push({
                url: p.image_url,
                color: p.color,
                id: p.id,
              });
            }
          });
        }

        setImages(imageArray);
        setSelectedColor(data.product.color_code || null);

        // Set initial pattern from series_name or sub_category
        if (data.product.series_name) {
          setSelectedPattern(data.product.series_name);
        } else if (
          Array.isArray(data.product.sub_category) &&
          data.product.sub_category.length > 0
        ) {
          setSelectedPattern(data.product.sub_category[0]);
        }

        setRelatedProducts(data.relatedProducts || []);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  // Get unique colors from related products
  const availableColors = React.useMemo(() => {
    const colors = new Map();

    // Add current product color
    if (product?.color && product?.color_code) {
      colors.set(product.color, {
        color: product.color,
        colorCode: product.color_code,
        productId: product.id,
      });
    }

    // Add related product colors
    relatedProducts.forEach((p) => {
      if (p.color && p.color_code && !colors.has(p.color)) {
        colors.set(p.color, {
          color: p.color,
          colorCode: p.color_code,
          productId: p.id,
        });
      }
    });

    return Array.from(colors.values());
  }, [product, relatedProducts]);

  // Get unique patterns/series
  const availablePatterns = React.useMemo(() => {
    const patterns = new Set();

    if (product?.series_name) {
      patterns.add(product.series_name);
    }

    if (Array.isArray(product?.sub_category)) {
      product.sub_category.forEach((sub) => {
        if (sub) patterns.add(sub);
      });
    }

    // Also add from tags if available
    if (Array.isArray(product?.tags)) {
      product.tags.forEach((tag) => {
        if (
          typeof tag === "string" &&
          (tag.includes("Pattern") ||
            tag.includes("Finish") ||
            tag.includes("Texture"))
        ) {
          patterns.add(tag);
        }
      });
    }

    return Array.from(patterns);
  }, [product]);

  // Handle color selection - switch to that product's image if available
  const handleColorSelect = (colorOption) => {
    setSelectedColor(colorOption.colorCode);

    // Find image for this color
    const colorImageIndex = images.findIndex(
      (img) =>
        img.color === colorOption.color || img.id === colorOption.productId,
    );

    if (colorImageIndex >= 0) {
      setSelectedImageIndex(colorImageIndex);
    }
  };

  // Handle add to spec
  const handleAddToSpec = () => {
    if (!product) return;

    const productData = {
      title: product.product_name || "Untitled Product",
      brand: product.brand_name || "Unknown Brand",
      color: product.color || "N/A",
      image: product.image_url || "/api/images/placeholder.png",
      link: `/marketplace/products/${product.id}`,
      price: 100, // Placeholder price
      material: product.category_name || "N/A",
      finish: product.sub_category?.[0] || "N/A",
      dimensions: product.size || "N/A",
    };

    addProductToSpec(productData, product.category_name || "Uncategorized");

    // Show feedback (you could add a toast notification here)
    alert("Product added to spec!");
  };

  // Toggle collapsible section
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Check if product is in stock (based on tags)
  const isInStock = React.useMemo(() => {
    if (!product?.tags) return true;
    const tags = Array.isArray(product.tags) ? product.tags : [];
    return !tags.some(
      (tag) =>
        typeof tag === "string" && tag.toLowerCase().includes("out of stock"),
    );
  }, [product]);

  if (loading) {
    return (
      <div className="viz-scope flex min-h-screen w-full items-center justify-center px-4">
        <p className="viz-mono text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)]">
          Pulling this sample from the library…
        </p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="viz-scope min-h-screen w-full px-4 pt-24 sm:px-8 sm:pt-32">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Product not found"} — head back to the library and pick
          another sample.
        </div>
      </div>
    );
  }

  const mainImage = images[selectedImageIndex] || images[0];

  const specCells = [
    { label: "Code", value: product.product_id || product.id },
    { label: "Brand", value: product.brand_name },
    { label: "Color", value: product.color },
    { label: "Price", value: "$100 /sq.ft" },
    { label: "Stock", value: isInStock ? "In stock" : "Out of stock" },
  ];

  const detailSections = [
    {
      key: "essentials",
      title: "The essentials",
      content: (
        <dl className="space-y-1.5">
          {product.size && (
            <div className="flex gap-3">
              <dt className="viz-label w-24 flex-shrink-0">Size</dt>
              <dd className="viz-mono text-xs uppercase">{product.size}</dd>
            </div>
          )}
          {product.thickness && (
            <div className="flex gap-3">
              <dt className="viz-label w-24 flex-shrink-0">Thickness</dt>
              <dd className="viz-mono text-xs uppercase">
                {product.thickness}
              </dd>
            </div>
          )}
          {product.category_name && (
            <div className="flex gap-3">
              <dt className="viz-label w-24 flex-shrink-0">Category</dt>
              <dd className="viz-mono text-xs uppercase">
                {product.category_name}
              </dd>
            </div>
          )}
          {product.brand_name && (
            <div className="flex gap-3">
              <dt className="viz-label w-24 flex-shrink-0">Brand</dt>
              <dd className="viz-mono text-xs uppercase">
                {product.brand_name}
              </dd>
            </div>
          )}
        </dl>
      ),
    },
    {
      key: "installation",
      title: "Installation information",
      content: (
        <>
          <p>
            {product.description?.includes("Application") ||
            product.description?.includes("Best Suited For")
              ? product.description
                  .split("Best Suited For:")[1]
                  ?.split("\n\n")[0] ||
                "Installation information will be provided upon request."
              : "Installation information will be provided upon request."}
          </p>
          {Array.isArray(product.application) &&
            product.application.length > 0 && (
              <p className="viz-mono mt-3 text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                Applications · {product.application.join(" · ")}
              </p>
            )}
        </>
      ),
    },
    {
      key: "about",
      title: "About the product",
      content: (
        <p className="leading-relaxed">
          {product.description || "Product information coming soon."}
        </p>
      ),
    },
    {
      key: "additional",
      title: "Additional details",
      content: (
        <div className="space-y-1.5">
          {product.series_name && (
            <div className="flex gap-3">
              <span className="viz-label w-24 flex-shrink-0">Series</span>
              <span className="viz-mono text-xs uppercase">
                {product.series_name}
              </span>
            </div>
          )}
          {product.color_family && (
            <div className="flex gap-3">
              <span className="viz-label w-24 flex-shrink-0">Color family</span>
              <span className="viz-mono text-xs uppercase">
                {product.color_family}
              </span>
            </div>
          )}
          {Array.isArray(product.tags) && product.tags.length > 0 && (
            <p className="viz-mono pt-1 text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]">
              {product.tags.slice(0, 10).join(" · ")}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pb-24">
        {/* Folio masthead */}
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">
              {product.sub_category?.[0] || product.category_name || "Sample"}
            </p>
            <p className="viz-label">{product.product_id || product.id}</p>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <h1 className="viz-serif text-3xl leading-tight sm:text-4xl">
              {product.product_name || product.brand_name || "Product"}
            </h1>
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* The plate — product imagery */}
          <div className="flex flex-col">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-ground)]">
              {mainImage?.url
                ? <>
                    <Image
                      src={mainImage.url}
                      alt={product.product_name || "Product"}
                      fill
                      className="object-cover"
                      priority
                    />
                    <button
                      type="button"
                      onClick={() => setIsFavorite(!isFavorite)}
                      aria-label={
                        isFavorite ? "Remove from saved" : "Save for later"
                      }
                      aria-pressed={isFavorite}
                      className="absolute top-4 right-4 z-10 rounded-full border border-[var(--viz-line)] bg-[var(--viz-paper)] p-2 transition-colors hover:bg-[var(--viz-ground)]"
                    >
                      <svg
                        className={`h-5 w-5 ${
                          isFavorite
                            ? "text-[var(--viz-blue)]"
                            : "text-[var(--viz-muted)]"
                        }`}
                        fill={isFavorite ? "currentColor" : "none"}
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
                  </>
                : <div className="viz-mono flex h-full w-full items-center justify-center text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)]">
                    No image on file
                  </div>}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {images.slice(0, 3).map((img, index) => (
                  <button
                    key={img.id ?? img.url}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-pressed={selectedImageIndex === index}
                    className={`relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      selectedImageIndex === index
                        ? "border-[var(--viz-blue)]"
                        : "border-[var(--viz-line)] hover:border-[var(--viz-muted)]"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* The facts — spec cells and selections */}
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

            {/* Color selection */}
            {availableColors.length > 0 && (
              <div className="mt-6">
                <p className="viz-label mb-3">Color</p>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((colorOption) => (
                    <button
                      key={colorOption.color}
                      type="button"
                      onClick={() => handleColorSelect(colorOption)}
                      aria-label={colorOption.color}
                      aria-pressed={selectedColor === colorOption.colorCode}
                      className={`h-9 w-9 rounded-full border-2 transition-all ${
                        selectedColor === colorOption.colorCode
                          ? "scale-110 border-[var(--viz-blue)]"
                          : "border-[var(--viz-line)] hover:border-[var(--viz-muted)]"
                      }`}
                      style={{ backgroundColor: colorOption.colorCode }}
                      title={colorOption.color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pattern selection — a typeset run, not a chip grid */}
            {availablePatterns.length > 0 && (
              <div className="mt-6">
                <p className="viz-label mb-2">Pattern</p>
                <div className="flex flex-wrap gap-x-1 gap-y-1 text-sm">
                  {availablePatterns.slice(0, 3).map((pattern) => (
                    <button
                      key={pattern}
                      type="button"
                      onClick={() => setSelectedPattern(pattern)}
                      aria-pressed={selectedPattern === pattern}
                      className={`rounded px-1.5 py-0.5 transition-colors ${
                        selectedPattern === pattern
                          ? "bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                          : "text-[var(--viz-ink)] hover:bg-[var(--viz-ground)]"
                      }`}
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAddToSpec}
                className="flex-1 rounded-full bg-[var(--viz-ink)] px-6 py-3 text-sm font-medium text-[var(--viz-paper)] transition-colors hover:bg-[var(--viz-well)]"
              >
                Add to spec
              </button>
              <button
                type="button"
                onClick={() => {
                  // Open product in new tab or navigate
                  window.open(product.image_url || "#", "_blank");
                }}
                className="flex-1 rounded-full border border-[var(--viz-line)] px-6 py-3 text-sm font-medium text-[var(--viz-ink)] transition-colors hover:bg-[var(--viz-ground)]"
              >
                Open full image →
              </button>
            </div>

            {/* Description */}
            <div className="mt-8 border-t border-[var(--viz-line)] pt-6">
              <h2 className="viz-serif text-xl">Description</h2>

              {product.description && (
                <p className="mt-3 leading-relaxed text-[var(--viz-ink)]/85">
                  {product.description.split("\n\n")[0]}
                </p>
              )}

              {/* Collapsible detail sections */}
              <div className="mt-6 divide-y divide-[var(--viz-line)] border-y border-[var(--viz-line)]">
                {detailSections.map(({ key, title, content }) => (
                  <div key={key}>
                    <button
                      type="button"
                      onClick={() => toggleSection(key)}
                      aria-expanded={expandedSections[key]}
                      className="flex w-full items-center justify-between py-3 text-left"
                    >
                      <span className="viz-mono text-xs tracking-[0.08em] uppercase text-[var(--viz-ink)]">
                        {title}
                      </span>
                      <svg
                        className={`h-4 w-4 text-[var(--viz-muted)] transition-transform ${
                          expandedSections[key] ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {expandedSections[key] && (
                      <div className="pb-4 text-sm text-[var(--viz-ink)]/85">
                        {content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductDetails = () => {
  return (
    <Suspense
      fallback={
        <div className="viz-scope flex min-h-screen w-full items-center justify-center px-4">
          <p className="viz-mono text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)]">
            Pulling this sample from the library…
          </p>
        </div>
      }
    >
      <ProductDetailsContent />
    </Suspense>
  );
};

export default ProductDetails;
