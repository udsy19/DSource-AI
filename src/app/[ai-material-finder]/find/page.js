"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import uploadIcon from "../../../../public/upload-icon.png";
import identifyIcon from "../../../../public/identify-icon.png";
import shopIcon from "../../../../public/shop-icon.png";
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
        categoriesQuery
      )}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const availableCategories = (data.categories || []).map(
        (cat) => cat.label
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
        i === index ? { ...item, selected: !item.selected } : item
      )
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
          : { ...c, hovered: false }
      )
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
        "Please select at least one available category to generate products"
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
      categoriesQuery
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

  useEffect(() => {
    if (!uploadedImage) return;

    // Guard against stale responses if the image changes or the component
    // unmounts before the analysis request resolves.
    let ignore = false;

    setIsAnalyzing({
      state: true,
      message: "Analysing uploaded image for possible categories",
    });

    const formData = new FormData();
    formData.append(
      "image",
      uploadedImage,
      uploadedImage.name || "uploaded-image"
    );

    fetch("/api/analyze-image", {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(async (data) => {
        if (ignore) return;
        if (data.success) {
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
          const categoryLabels = normalizedCategories.map((cat) => cat.label);
          const availableCategories = await checkCategoryAvailability(
            categoryLabels
          );
          if (ignore) return;

          // Update categories with availability status
          const categoriesWithAvailability = normalizedCategories.map(
            (category) => ({
              ...category,
              available: availableCategories.includes(category.label),
            })
          );

          setCategories(categoriesWithAvailability);
          setError(null);
          setCheckingAvailability(false);
        } else {
          setError(
            data?.error ||
              "We couldn't understand this image. Please try another interior photo."
          );
          setCategories([]);
          setCheckingAvailability(false);
        }
      })
      .catch((err) => {
        if (ignore) return;
        console.error(err);
        setError(
          "Something went wrong while analyzing the image. Please try again."
        );
        setCategories([]);
        setCheckingAvailability(false);
      })
      .finally(() => {
        if (!ignore) setIsAnalyzing({ state: false, message: "" });
      });

    return () => {
      ignore = true;
    };
  }, [uploadedImage]);

  useEffect(() => {
    handleProductCategorySelection("All");
  }, [products]);

  return (
    <div className="w-full">
      {/* Analysis Loading Modal */}
      {isAnalyzing.state && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-xl p-4">
          <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 sm:p-8 flex flex-col items-center space-y-4 w-full max-w-[400px] border border-white/30 shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-black"></div>
            <p className="text-base sm:text-lg text-center text-black">
              {isAnalyzing.message}
            </p>
          </div>
        </div>
      )}
      <div className="mt-20 sm:mt-28 md:mt-32 lg:mt-40 px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center w-full lg:w-1/3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              AI Material Finder
            </h1>
            <div className="w-4 sm:w-5 md:w-6 ml-2 sm:ml-3 md:ml-4">
              <Image
                src={identifyIcon}
                alt="Identify Icon"
                width={24}
                height={24}
                className="sm:w-6 sm:h-6"
              />
            </div>
          </div>
          <div className="flex justify-between w-full lg:w-1/3 gap-2 sm:gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 sm:w-10 md:w-12 p-2 sm:p-3 bg-gray-100 rounded-full border-2 border-black">
                <Image
                  src={uploadIcon}
                  alt="Upload Icon"
                  width={24}
                  height={24}
                  className="sm:w-6 sm:h-6"
                />
              </div>
              <h2 className="text-xs sm:text-sm md:text-lg font-bold mt-2 sm:mt-4 text-center">
                Upload Image
              </h2>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 sm:w-10 md:w-12 p-2 sm:p-3 bg-gray-100 rounded-full border-2 border-black">
                <Image
                  src={identifyIcon}
                  alt="Identify Icon"
                  width={24}
                  height={24}
                  className="sm:w-6 sm:h-6"
                />
              </div>
              <h2 className="text-xs sm:text-sm md:text-lg font-bold mt-2 sm:mt-4 text-center">
                AI Match
              </h2>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 sm:w-10 md:w-12 p-2 sm:p-3 bg-gray-100 rounded-full border-2 border-black">
                <Image
                  src={shopIcon}
                  alt="Shop Icon"
                  width={24}
                  height={24}
                  className="sm:w-6 sm:h-6"
                />
              </div>
              <h2 className="text-xs sm:text-sm md:text-lg font-bold mt-2 sm:mt-4 text-center">
                Shop
              </h2>
            </div>
          </div>
          <div className="w-full lg:w-1/3 flex items-center justify-start lg:justify-end">
            <Link
              href="/ai-material-finder/tutorial"
              className="text-black px-6 sm:px-8 md:px-12 py-2 sm:py-3 border-2 border-black rounded-full cursor-pointer hover:bg-gray-800 transition-all duration-300 font-bold text-sm sm:text-base"
            >
              View Tutorial
            </Link>
          </div>
        </div>
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8 lg:gap-12 mt-6 sm:mt-8 md:mt-12">
          {/* Image Upload */}
          <div
            className={`${
              categories.length > 0 ? "lg:col-span-8" : "lg:col-span-12"
            } h-auto min-h-[30rem] sm:min-h-[40rem] md:h-[50rem] flex items-center justify-center border-1 border-gray-700 rounded-lg p-3 sm:p-4`}
          >
            {imagePreview ? (
              <div
                className="relative w-full flex items-center justify-center"
                style={{ minHeight: "25rem" }}
              >
                <div
                  className="relative w-full rounded-lg overflow-hidden flex items-center justify-center"
                  style={{ minHeight: "25rem" }}
                >
                  <img
                    src={imagePreview}
                    alt="Uploaded image"
                    className="max-w-full max-h-full object-contain rounded-lg"
                    style={{ maxHeight: "40rem" }}
                  />
                  {/* {categories.map(
                    (category, index) =>
                      category.position && (
                        <div
                          key={index}
                          className="absolute"
                          style={{
                            left: category.position?.x,
                            top: category.position?.y,
                          }}
                        >
                          {category.hovered &&
                            (filteredProducts.length > 0 ? (
                              <div className="absolute -top-10 left-12 w-64 overflow-hidden bg-white/10 backdrop-blur-md border border-2 border-black/80 rounded-lg p-4 z-50">
                                <div className="flex items-center gap-4 ">
                                  <div className="w-24 h-16 rounded-lg overflow-hidden">
                                    <div
                                      className="w-full h-full bg-gray-100"
                                      style={{
                                        backgroundImage: `url(${filteredProducts[0].products[0].image})`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                      }}
                                    ></div>
                                  </div>
                                  <div className="flex flex-col justify-between">
                                    <div>
                                      <h3 className="text-sm font-bold">
                                        {filteredProducts[0].products[0].title}
                                      </h3>
                                      <p className="text-xs font-bold">$$$</p>
                                      <h4 className="text-xs">
                                        Brand:{" "}
                                        {filteredProducts[0].products[0].brand}
                                      </h4>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <button className="w-1/2 border border-black px-2 py-1 rounded text-xs">
                                    View
                                  </button>
                                  <button className="w-1/2 border border-black px-2 py-1 rounded text-xs">
                                    Wishlist
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 absolute -top-10 left-0 w-40 overflow-hidden text-ellipsis whitespace-nowrap bg-white/10 backdrop-blur-md border border-2 border-black/80 rounded-md transition-all duration-300 p-2">
                                <span>
                                  {category.selected ? (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                      className="w-5 h-5 text-black"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                      className="w-4 h-4 text-black"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 4.5v15m7.5-7.5h-15"
                                      />
                                    </svg>
                                  )}
                                </span>
                                {category.label}
                              </div>
                            ))}
                          <div
                            key={index}
                            className="cursor-pointer w-8 h-8 bg-white border border-5 border-black/80 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-black/30"
                            onMouseEnter={() => handleMouseEnter(category)}
                            onMouseLeave={() => handleMouseLeave()}
                            onClick={() => {
                              toggleCategory(index);
                              if (filteredProducts.length > 0) {
                                handleProductCategorySelection(category.label);
                              }
                            }}
                          ></div>
                        </div>
                      )
                  )} */}
                </div>
                {categories.length > 0 && (
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-16 md:p-32 lg:p-64 text-center cursor-pointer hover:border-gray-400 transition-colors w-full"
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
                <div className="p-4 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 mx-auto text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">
                  Drag & drop or choose file to upload.
                </p>
                <p className="text-gray-500 text-sm">
                  Image format: JPG, PNG, & SVG. Max 10MB.
                </p>
              </div>
            )}
          </div>
          <div
            className={`lg:col-span-4 h-auto min-h-[10rem] sm:min-h-[40rem] md:h-[50rem] ${
              categories.length > 0 ? "block" : "hidden"
            }`}
          >
            {products.length > 0 ? (
              <div className="flex flex-col justify-center">
                <h2 className="text-2xl font-bold">AI Material Match</h2>

                <div className="relative mt-4 border border-black rounded-lg">
                  <button
                    onClick={scrollProductsLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={scrollProductsRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </button>

                  <div
                    ref={productsScrollRef}
                    className="overflow-x-auto hide-scrollbar p-4 rounded-lg ml-4 mr-6"
                  >
                    <div className="grid grid-flow-col min-w-max">
                      <div
                        className={`cursor-pointer text-center py-2 px-4 rounded-lg font-semibold ${
                          productCategorySelected === "All"
                            ? "underline"
                            : "text-black/40"
                        }`}
                        onClick={() => handleProductCategorySelection("All")}
                      >
                        All
                      </div>
                      {products.map((category, index) => (
                        <div
                          key={index}
                          className={`cursor-pointer text-center py-2 px-4 rounded-lg font-semibold ${
                            productCategorySelected === category.label
                              ? "underline"
                              : "text-black/40"
                          }`}
                          onClick={() =>
                            handleProductCategorySelection(category.label)
                          }
                        >
                          {category.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="py-4 h-auto min-h-[20rem] sm:min-h-[30rem] md:h-[42rem] max-h-[42rem] overflow-y-auto hide-scrollbar">
                  {filteredProducts.map((category, index) => (
                    <div key={index} className="my-4">
                      {category.products.map((product, index) => (
                        <div
                          key={index}
                          className="my-4 flex gap-4 bg-gray-100 rounded-lg p-4"
                        >
                          <div
                            className="w-32 sm:w-40 md:w-48 h-24 sm:h-28 md:h-32 rounded-lg overflow-hidden flex-shrink-0"
                            style={{
                              backgroundImage: `url(${product.image})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }}
                          ></div>
                          <div className="flex flex-col justify-between">
                            <div>
                              <h3 className="text-md font-bold pt-1">
                                {product.title}
                              </h3>
                              <p className="text-xs font-bold">$$$</p>
                              <h4 className="text-sm">
                                Brand: {product.brand}
                              </h4>
                              <h4 className="text-xs">
                                Color: {product.color}
                              </h4>
                            </div>
                            <div className="flex flex-col lg:flex-row items-center gap-2">
                              <Link
                                className="border-2 border-black px-4 py-1 rounded-lg text-xs cursor-pointer flex items-center justify-center w-full lg:w-auto"
                                href={product.link || "/marketplace"}
                              >
                                <div>View Product</div>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={3}
                                  stroke="currentColor"
                                  className="w-3 h-3 ml-2"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                                  />
                                </svg>
                              </Link>
                              <button
                                className="border-2 border-black px-4 py-1 rounded-lg text-xs cursor-pointer flex items-center justify-center hover:bg-gray-800 hover:text-white transition-all duration-300 focus:outline-none focus:ring-0 focus:ring-offset-0 w-full lg:w-auto"
                                onClick={() => {
                                  addProductToSpec(product, category.label);
                                }}
                              >
                                <div>Add to Spec</div>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={3}
                                  stroke="currentColor"
                                  className="w-3 h-3 ml-2"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4.5v15m7.5-7.5h-15"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-center">
                <h2 className="text-2xl font-bold">Select Products</h2>
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 p-4 sm:p-6 md:p-8 rounded-lg"
                  style={{ background: "#E5E7EB" }}
                >
                  {categories.map((category, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (category.available) {
                          toggleCategory(index);
                        }
                      }}
                      disabled={!category.available}
                      className={`py-2 rounded-lg backdrop-blur-md border shadow-lg shadow-black/10 transition-all duration-300 flex items-center justify-center ${
                        category.available
                          ? category.hovered
                            ? "scale-110 bg-white/20 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.5)] bg-white/10 border-white/80 hover:bg-white/20 hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                            : "bg-white/10 border-white/80 hover:bg-white/20 hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                          : "bg-gray-300/50 border-gray-400/50 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {category.available ? (
                        category.selected ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-5 h-5 text-black"
                          >
                            <path
                              fillRule="evenodd"
                              d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="w-4 h-4 text-black"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4.5v15m7.5-7.5h-15"
                            />
                          </svg>
                        )
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="w-4 h-4 text-gray-500"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18 12H6"
                          />
                        </svg>
                      )}
                      <span
                        className={`ml-1 text-sm font-bold ${
                          category.available ? "text-black" : "text-gray-500"
                        }`}
                      >
                        {category.label}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  className="w-full mt-4 py-4 rounded-full bg-black text-white hover:bg-gray-800 transition-all duration-300"
                  onClick={handleGenerateProducts}
                >
                  Generate Products
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiMaterialFinder;
