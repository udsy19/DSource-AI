"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useSpec } from "../../../../contexts/SpecContext";

const ProductDetailsContent = () => {
  const params = useParams();
  const router = useRouter();
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
        const fetchedProduct = data?.product;

        // The response was ok but the payload is missing the product; treat it
        // as not found rather than dereferencing an undefined product.
        if (!fetchedProduct) {
          setError("Product not found");
          return;
        }

        setProduct(fetchedProduct);

        // Set up images array (main image + related product images)
        const imageArray = [];
        if (fetchedProduct.image_url) {
          imageArray.push({
            url: fetchedProduct.image_url,
            color: fetchedProduct.color,
            id: fetchedProduct.id,
          });
        }

        // Add related product images as thumbnails
        if (data.relatedProducts && data.relatedProducts.length > 0) {
          data.relatedProducts.forEach((p) => {
            if (p.image_url && p.id !== fetchedProduct.id) {
              imageArray.push({
                url: p.image_url,
                color: p.color,
                id: p.id,
              });
            }
          });
        }

        setImages(imageArray);
        setSelectedColor(fetchedProduct.color_code || null);

        // Set initial pattern from series_name or sub_category
        if (fetchedProduct.series_name) {
          setSelectedPattern(fetchedProduct.series_name);
        } else if (
          Array.isArray(fetchedProduct.sub_category) &&
          fetchedProduct.sub_category.length > 0
        ) {
          setSelectedPattern(fetchedProduct.sub_category[0]);
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
        img.color === colorOption.color || img.id === colorOption.productId
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
        typeof tag === "string" && tag.toLowerCase().includes("out of stock")
    );
  }, [product]);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading product details...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">
          {error || "Product not found"}
        </div>
      </div>
    );
  }

  const mainImage = images[selectedImageIndex] || images[0];

  return (
    <div className="w-full min-h-screen bg-white py-12 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Left Side - Product Images */}
          <div className="flex flex-col">
            {/* Main Image */}
            <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
              {mainImage?.url ? (
                <>
                  <Image
                    src={mainImage.url}
                    alt={product.product_name || "Product"}
                    fill
                    className="object-cover"
                    priority
                  />
                  {/* Heart Icon */}
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors z-10"
                  >
                    <svg
                      className={`w-6 h-6 ${
                        isFavorite
                          ? "text-red-500 fill-red-500"
                          : "text-gray-600"
                      }`}
                      fill={isFavorite ? "currentColor" : "none"}
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
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.slice(0, 3).map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 relative w-24 h-24 rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index
                        ? "border-gray-900"
                        : "border-gray-200"
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

          {/* Right Side - Product Information */}
          <div className="flex flex-col">
            {/* Category with Share */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                {product.sub_category?.[0] ||
                  product.category_name ||
                  "Product"}
              </span>
              <button
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Share"
              >
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            </div>

            {/* Product Name */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {product.brand_name || product.product_name || "Product Name"}
            </h1>

            {/* Product ID and Color */}
            <p className="text-gray-600 mb-4">
              {product.product_id || product.id} | {product.color || "N/A"}
            </p>

            {/* Price */}
            <div className="text-2xl font-semibold text-gray-900 mb-6">
              $100 /Sq.Ft
            </div>

            {/* Color Selection */}
            {availableColors.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Color
                </label>
                <div className="flex gap-3">
                  {availableColors.map((colorOption, index) => (
                    <button
                      key={index}
                      onClick={() => handleColorSelect(colorOption)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        selectedColor === colorOption.colorCode
                          ? "border-gray-900 scale-110"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      style={{ backgroundColor: colorOption.colorCode }}
                      title={colorOption.color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pattern Selection */}
            {availablePatterns.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Pattern
                </label>
                <div className="flex flex-wrap gap-3">
                  {availablePatterns.slice(0, 3).map((pattern, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedPattern(pattern)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedPattern === pattern
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            <div className="mb-6">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isInStock
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {isInStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={() => {
                  // Open product in new tab or navigate
                  window.open(product.image_url || "#", "_blank");
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
              >
                View Product
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
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>

              <button
                onClick={handleAddToSpec}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
              >
                Add to Spec +
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>

            {/* Description Section */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Description
              </h2>

              {/* Main Description */}
              {product.description && (
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {product.description.split("\n\n")[0]}
                </p>
              )}

              {/* Collapsible Sections */}
              <div className="space-y-2">
                {/* The Essentials */}
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSection("essentials")}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">
                      The Essentials
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedSections.essentials ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedSections.essentials && (
                    <div className="p-4 pt-0 border-t border-gray-200">
                      <div className="space-y-2 text-sm text-gray-700">
                        {product.size && (
                          <div>
                            <span className="font-medium">Size: </span>
                            {product.size}
                          </div>
                        )}
                        {product.thickness && (
                          <div>
                            <span className="font-medium">Thickness: </span>
                            {product.thickness}
                          </div>
                        )}
                        {product.category_name && (
                          <div>
                            <span className="font-medium">Category: </span>
                            {product.category_name}
                          </div>
                        )}
                        {product.brand_name && (
                          <div>
                            <span className="font-medium">Brand: </span>
                            {product.brand_name}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Installation Information */}
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSection("installation")}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">
                      Installation Information
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedSections.installation ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedSections.installation && (
                    <div className="p-4 pt-0 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
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
                          <div className="mt-3">
                            <span className="font-medium text-sm">
                              Applications:{" "}
                            </span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {product.application.map((app, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                >
                                  {app}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* About the Product */}
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSection("about")}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">
                      About the Product
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedSections.about ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedSections.about && (
                    <div className="p-4 pt-0 border-t border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {product.description ||
                          "Product information coming soon."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSection("additional")}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">
                      Additional Details
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedSections.additional ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedSections.additional && (
                    <div className="p-4 pt-0 border-t border-gray-200">
                      <div className="space-y-2 text-sm text-gray-700">
                        {product.series_name && (
                          <div>
                            <span className="font-medium">Series: </span>
                            {product.series_name}
                          </div>
                        )}
                        {product.color_family && (
                          <div>
                            <span className="font-medium">Color Family: </span>
                            {product.color_family}
                          </div>
                        )}
                        {Array.isArray(product.tags) &&
                          product.tags.length > 0 && (
                            <div>
                              <span className="font-medium">Tags: </span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {product.tags.slice(0, 10).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
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
        <div className="w-full min-h-screen flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      }
    >
      <ProductDetailsContent />
    </Suspense>
  );
};

export default ProductDetails;
