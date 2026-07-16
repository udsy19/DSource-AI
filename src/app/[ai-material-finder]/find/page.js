"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useSpec } from "../../../contexts/SpecContext";

const AiMaterialFinder = () => {
  const { addProductToSpec } = useSpec();
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const productsScrollRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productCategorySelected, setProductCategorySelected] = useState("All");
  const [isAnalyzing, setIsAnalyzing] = useState({ state: false, message: "" });
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Check which categories are available in the database
  const checkCategoryAvailability = async (categoryLabels) => {
    if (!categoryLabels || categoryLabels.length === 0) return [];

    try {
      const categoriesQuery = categoryLabels.join(",");
      const apiUrl = `/api/get-products?categories=${encodeURIComponent(
        categoriesQuery,
      )}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const availableCategories = (data.categories || []).map(
        (cat) => cat.label,
      );

      return availableCategories;
    } catch (error) {
      console.error("Error checking category availability:", error);
      return [];
    }
  };

  const toggleCategory = (index) => {
    setCategories((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const scrollProductsLeft = () => {
    if (productsScrollRef.current) {
      productsScrollRef.current.scrollBy({ left: -200, behavior: "smooth" });
    }
  };

  const scrollProductsRight = () => {
    if (productsScrollRef.current) {
      productsScrollRef.current.scrollBy({ left: 200, behavior: "smooth" });
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/svg+xml",
      ];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a valid image file (JPG, PNG, or SVG)");
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      setUploadedImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/svg+xml",
      ];
      if (validTypes.includes(file.type)) {
        if (file.size <= 10 * 1024 * 1024) {
          setUploadedImage(file);
          const reader = new FileReader();
          reader.onload = (e) => {
            setImagePreview(e.target.result);
          };
          reader.readAsDataURL(file);
        } else {
          alert("File size must be less than 10MB");
        }
      } else {
        alert("Please upload a valid image file (JPG, PNG, or SVG)");
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const removeImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setError(null);
    setIsAnalyzing({ state: false, message: "" });
    setCategories([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMouseEnter = (category) => {
    if (products.length > 0) {
      handleProductCategorySelection(category.label);
    }

    setCategories((prev) =>
      prev.map((c) =>
        c.label === category.label
          ? { ...c, hovered: true }
          : { ...c, hovered: false },
      ),
    );
  };

  const handleMouseLeave = () => {
    setCategories((prev) => prev.map((c) => ({ ...c, hovered: false })));
  };

  const handleGenerateProducts = () => {
    // Get selected categories (only available ones can be selected)
    const selectedCategories = categories
      .filter((cat) => cat.selected && cat.available)
      .map((cat) => cat.label);

    // If no categories are selected, show an error or return early
    if (selectedCategories.length === 0) {
      alert(
        "Please select at least one available category to generate products",
      );
      return;
    }

    setIsAnalyzing({
      state: true,
      message: "Generating products for selected categories",
    });

    // Build query string with selected categories
    const categoriesQuery = selectedCategories.join(",");
    const apiUrl = `/api/get-products?categories=${encodeURIComponent(
      categoriesQuery,
    )}`;

    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setProducts(data.categories || []);
        setIsAnalyzing({
          state: false,
          message: "Products generated successfully",
        });
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setIsAnalyzing({
          state: false,
          message: "Failed to generate products. Please try again.",
        });
        alert("Failed to fetch products. Please try again.");
      });
  };

  const handleProductCategorySelection = (category) => {
    setProductCategorySelected(category);
    if (products.length > 0) {
      if (category !== "All") {
        setFilteredProducts(products.filter((c) => c.label === category));
      } else {
        setFilteredProducts(products);
      }
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: analysis must run only when a new image is uploaded; checkCategoryAvailability is recreated each render and would retrigger it
  useEffect(() => {
    // Create fake analysis loading component
    // Add fake product categories
    if (uploadedImage) {
      setIsAnalyzing({
        state: true,
        message: "Analysing uploaded image for possible categories",
      });
      const timer = setTimeout(() => {
        const formData = new FormData();
        formData.append(
          "image",
          uploadedImage,
          uploadedImage.name || "uploaded-image",
        );

        fetch("/api/analyze-image", {
          method: "POST",
          body: formData,
        })
          .then((res) => res.json())
          .then(async (data) => {
            if (data.success) {
              console.log(data);
              const normalizedCategories = Array.isArray(data.categories)
                ? data.categories.map((category) => {
                    const x =
                      typeof category?.position?.x === "number"
                        ? Math.round(category.position.x * 100)
                        : null;
                    const y =
                      typeof category?.position?.y === "number"
                        ? Math.round(category.position.y * 100)
                        : null;

                    return {
                      label: category?.label ?? "Unknown",
                      selected: false,
                      hovered: false,
                      confidence: category?.confidence ?? null,
                      reasoning: category?.reasoning ?? "",
                      position:
                        x !== null && y !== null
                          ? {
                              x: `${x}%`,
                              y: `${y}%`,
                            }
                          : null,
                      available: false, // Will be updated after checking
                    };
                  })
                : [];

              // Check which categories are available in the database
              setCheckingAvailability(true);
              const categoryLabels = normalizedCategories.map(
                (cat) => cat.label,
              );
              const availableCategories =
                await checkCategoryAvailability(categoryLabels);

              // Update categories with availability status
              const categoriesWithAvailability = normalizedCategories.map(
                (category) => ({
                  ...category,
                  available: availableCategories.includes(category.label),
                }),
              );

              setCategories(categoriesWithAvailability);
              setError(null);
              setCheckingAvailability(false);
            } else {
              setError(
                data?.error ||
                  "We couldn't understand this image. Please try another interior photo.",
              );
              setCategories([]);
              setCheckingAvailability(false);
            }
          })
          .catch((err) => {
            console.error(err);
            setError(
              "Something went wrong while analyzing the image. Please try again.",
            );
            setCategories([]);
            setCheckingAvailability(false);
          })
          .finally(() => {
            setIsAnalyzing({ state: false, message: "" });
          });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [uploadedImage]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the filter exactly when a new product list arrives; the handler is recreated each render
  useEffect(() => {
    handleProductCategorySelection("All");
  }, [products]);

  console.log(imagePreview);
  console.log(uploadedImage);

  return (
    <div className="viz-scope w-full">
      {/* Analysis in progress — a plate label on a scrim, not a spinner card */}
      {isAnalyzing.state && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2a261e]/60 p-4 pb-10 backdrop-blur-sm sm:items-center sm:pb-4">
          <div className="w-full max-w-xl rounded-xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-6 shadow-2xl">
            <div className="flex items-baseline justify-between gap-4">
              <p className="viz-label">In the studio</p>
              <p className="viz-mono text-[11px] tracking-widest text-[var(--viz-muted)] uppercase">
                Reading the room
              </p>
            </div>
            <p className="viz-serif mt-3 text-xl italic sm:text-2xl">
              {isAnalyzing.message}
            </p>
            {/* The plotter draws along the rule */}
            <div className="mt-5 h-[3px] overflow-hidden rounded-full bg-[var(--viz-line)]/50">
              <div className="viz-scan h-full w-1/4 rounded-full bg-[var(--viz-blue)]" />
            </div>
            <p className="mt-3 max-w-md text-xs text-[var(--viz-muted)]">
              We name every piece we can see, then check what&rsquo;s stocked
              near you. Your photo stays untouched.
            </p>
          </div>
        </div>
      )}

      <div className="px-4 pt-24 pb-16 sm:px-6 sm:pt-32 md:px-8 lg:px-12">
        {/* Masthead folio: meta line over an ink rule, deck at the baseline */}
        <header>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">DSource Studio</p>
            <Link
              href="/ai-material-finder/tutorial"
              className="viz-label shrink-0 hover:text-[var(--viz-ink)]"
            >
              View tutorial →
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
                AI Material Finder
              </h1>
              <div className="pb-1 lg:text-right">
                <p className="viz-serif max-w-md text-base italic text-[var(--viz-muted)] sm:text-lg">
                  Show us the room you love. We&rsquo;ll find the pieces in it.
                </p>
                <p className="viz-mono mt-2 text-[11px] tracking-[0.08em] text-[var(--viz-muted)] uppercase">
                  01 Upload · 02 Match · 03 Shop
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 lg:grid-cols-12 lg:gap-10">
          {/* The plate: dark well with registration marks */}
          <div
            className={`${
              categories.length > 0 ? "lg:col-span-8" : "lg:col-span-12"
            }`}
          >
            <div className="relative flex flex-col">
              <span className="viz-crop viz-crop-tl" aria-hidden="true" />
              <span className="viz-crop viz-crop-tr" aria-hidden="true" />
              <span className="viz-crop viz-crop-bl" aria-hidden="true" />
              <span className="viz-crop viz-crop-br" aria-hidden="true" />

              <div className="flex min-h-[24rem] flex-1 items-center justify-center rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-well)] p-3 sm:min-h-[30rem] sm:p-4">
                {imagePreview
                  ? <div className="relative flex w-full items-center justify-center">
                      {/* Data-URL previews can't go through next/image optimization. */}
                      {/* biome-ignore lint/performance/noImgElement: data URLs cannot use next/image */}
                      <img
                        src={imagePreview}
                        alt="The room you uploaded"
                        draggable={false}
                        className="block max-h-[70vh] max-w-full select-none rounded-lg object-contain"
                      />
                      {categories.length > 0 && (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-sm text-white hover:bg-red-600"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  : <button
                      type="button"
                      className="w-full cursor-pointer rounded-lg border-2 border-dashed border-stone-600 bg-transparent px-6 py-16 text-center transition-colors hover:border-stone-400 sm:py-24"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={handleClick}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/svg+xml"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <p className="viz-serif text-lg italic text-stone-200">
                        Every search starts with a picture. Bring yours.
                      </p>
                      <p className="mt-2 text-sm text-stone-400">
                        Drag &amp; drop or choose a photo to upload.
                      </p>
                      <p className="viz-mono mt-1 text-xs text-stone-500">
                        JPG, PNG or SVG · max 10MB
                      </p>
                    </button>}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* The match list */}
          <div
            className={`lg:col-span-4 ${
              categories.length > 0 ? "block" : "hidden"
            }`}
          >
            {products.length > 0
              ? <div className="flex flex-col">
                  <h2 className="viz-serif text-2xl">Your matches</h2>

                  {/* Category filter: a typeset run on a hairline, arrows to leaf */}
                  <div className="relative mt-4 border-b border-[var(--viz-line)]">
                    <button
                      type="button"
                      onClick={scrollProductsLeft}
                      aria-label="Scroll categories left"
                      className="absolute top-1/2 left-0 z-10 -translate-y-1/2 cursor-pointer bg-[var(--viz-paper)] pr-1 text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={scrollProductsRight}
                      aria-label="Scroll categories right"
                      className="absolute top-1/2 right-0 z-10 -translate-y-1/2 cursor-pointer bg-[var(--viz-paper)] pl-1 text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
                    >
                      →
                    </button>

                    <div
                      ref={productsScrollRef}
                      className="hide-scrollbar mx-5 overflow-x-auto"
                    >
                      <div className="flex min-w-max gap-1">
                        <button
                          type="button"
                          aria-pressed={productCategorySelected === "All"}
                          className={`viz-mono cursor-pointer px-3 py-2 text-xs tracking-[0.08em] uppercase transition-colors duration-200 ${
                            productCategorySelected === "All"
                              ? "text-[var(--viz-ink)] underline underline-offset-8"
                              : "text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
                          }`}
                          onClick={() => handleProductCategorySelection("All")}
                        >
                          All
                        </button>
                        {products.map((category) => (
                          <button
                            type="button"
                            key={category.label}
                            aria-pressed={
                              productCategorySelected === category.label
                            }
                            className={`viz-mono cursor-pointer px-3 py-2 text-xs tracking-[0.08em] uppercase transition-colors duration-200 ${
                              productCategorySelected === category.label
                                ? "text-[var(--viz-ink)] underline underline-offset-8"
                                : "text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
                            }`}
                            onClick={() =>
                              handleProductCategorySelection(category.label)
                            }
                          >
                            {category.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="hide-scrollbar max-h-[42rem] overflow-y-auto py-2">
                    {filteredProducts.map((category) => (
                      <div key={category.label} className="my-2">
                        {category.products.map((product, index) => (
                          <div
                            key={`${category.label}-${product.title}-${index}`}
                            className="my-3 flex gap-4 rounded-lg border border-[var(--viz-line)] bg-white p-3"
                          >
                            <div
                              className="h-24 w-28 shrink-0 rounded-md bg-[var(--viz-ground)] sm:h-28 sm:w-32"
                              style={{
                                backgroundImage: `url(${product.image})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            />
                            <div className="flex min-w-0 flex-col justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-semibold">
                                  {product.title}
                                </h3>
                                <p className="viz-mono mt-1 text-[11px] text-[var(--viz-muted)]">
                                  $$$ · {product.brand}
                                </p>
                                <p className="viz-mono text-[11px] text-[var(--viz-muted)]">
                                  Colour · {product.color}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  className="rounded-md border border-[var(--viz-line)] px-3 py-1 text-xs transition-colors duration-200 hover:bg-[var(--viz-ground)]"
                                  href={product.link || "/marketplace"}
                                >
                                  View product ↗
                                </Link>
                                <button
                                  type="button"
                                  className="cursor-pointer rounded-md bg-[var(--viz-ink)] px-3 py-1 text-xs text-[var(--viz-paper)] transition-colors duration-200 hover:bg-[var(--viz-well)]"
                                  onClick={() => {
                                    addProductToSpec(product, category.label);
                                  }}
                                >
                                  Add to spec
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              : <div className="viz-panel flex flex-col rounded-2xl p-5">
                  <h2 className="viz-serif text-2xl">Choose your pieces</h2>
                  {/* Options set as type, not boxes — struck names aren't stocked */}
                  <fieldset className="mt-4">
                    <legend className="viz-label">Found in your photo</legend>
                    <div className="mt-3 flex flex-wrap gap-x-1 gap-y-2">
                      {categories.map((category, index) => (
                        <button
                          type="button"
                          key={category.label}
                          aria-pressed={category.selected}
                          disabled={!category.available}
                          onMouseEnter={() => handleMouseEnter(category)}
                          onMouseLeave={() => handleMouseLeave()}
                          onClick={() => {
                            if (category.available) {
                              toggleCategory(index);
                            }
                          }}
                          className={`rounded-md px-2 py-1 text-sm transition-colors duration-200 ${
                            !category.available
                              ? "cursor-not-allowed text-[var(--viz-muted)] line-through"
                              : category.selected
                                ? "cursor-pointer bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                                : `cursor-pointer underline-offset-4 ${
                                    category.hovered
                                      ? "underline"
                                      : "hover:underline"
                                  }`
                          }`}
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <p className="viz-mono mt-3 text-[11px] text-[var(--viz-muted)]">
                    {checkingAvailability
                      ? "Checking what's stocked near you…"
                      : "Struck-through pieces aren't stocked locally yet."}
                  </p>
                  <button
                    type="button"
                    className="mt-6 w-full cursor-pointer rounded-full bg-[var(--viz-ink)] px-6 py-3 text-sm text-[var(--viz-paper)] transition-colors duration-200 hover:bg-[var(--viz-well)]"
                    onClick={handleGenerateProducts}
                  >
                    Find matching products
                  </button>
                </div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiMaterialFinder;
