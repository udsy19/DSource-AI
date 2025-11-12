"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import uploadIcon from "../../../../public/upload-icon.png";
import identifyIcon from "../../../../public/identify-icon.png";
import shopIcon from "../../../../public/shop-icon.png";
import { useSpec } from "../../../contexts/SpecContext";

const AiMaterialFinder = () => {
  const { specCount, setSpecCount } = useSpec();
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

  // TODO: Implement product retrieval from the database
  // Look for cateogries that are selected and fetch products from the database that match the category
  // Refine [api/get-products] to fetch products from the database that match the category
  const handleGenerateProducts = () => {
    setIsAnalyzing({
      state: true,
      message: "Generating products for selected categories",
    });

    // TODO
    // use "categories" state to fetch products from the database that match the category
    //

    const timer = setTimeout(() => {
      fetch("/api/get-products")
        .then((res) => res.json())
        .then((data) => {
          setProducts(data.categories);
        })
        .catch((err) => {
          console.error(err);
        });

      setIsAnalyzing({
        state: false,
        message: "Products generated successfully",
      });
    }, 5000);

    return () => clearTimeout(timer);
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
          uploadedImage.name || "uploaded-image"
        );

        fetch("/api/analyze-image", {
          method: "POST",
          body: formData,
        })
          .then((res) => res.json())
          .then((data) => {
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
                    };
                  })
                : [];

              setCategories(normalizedCategories);
              setError(null);
            } else {
              setError(
                data?.error ||
                  "We couldn't understand this image. Please try another interior photo."
              );
              setCategories([]);
            }
          })
          .catch((err) => {
            console.error(err);
            setError(
              "Something went wrong while analyzing the image. Please try again."
            );
            setCategories([]);
          })
          .finally(() => {
            setIsAnalyzing({ state: false, message: "" });
          });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [uploadedImage]);

  useEffect(() => {
    handleProductCategorySelection("All");
  }, [products]);

  console.log(categories);

  return (
    <div className="w-full">
      {/* Analysis Loading Modal */}
      {isAnalyzing.state && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-xl">
          <div className="bg-white/20 backdrop-blur-md rounded-lg p-8 flex flex-col items-center space-y-4 min-w-[400px] border border-white/30 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            <p className="text-lg text-center text-black">
              {isAnalyzing.message}
            </p>
          </div>
        </div>
      )}
      <div className="mt-40 px-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center w-1/3">
            <h1 className="text-4xl font-bold">AI Material Finder</h1>
            <div className="w-6 ml-4">
              <Image src={identifyIcon} alt="Identify Icon" />
            </div>
          </div>
          <div className="flex justify-between w-1/3">
            <div className="flex flex-col items-center">
              <div className="w-12 p-3 bg-gray-100 rounded-full border-2 border-black">
                <Image src={uploadIcon} alt="Upload Icon" />
              </div>
              <h2 className="text-lg font-bold mt-4">Upload Image</h2>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 p-3 bg-gray-100 rounded-full border-2 border-black">
                <Image src={identifyIcon} alt="Identify Icon" />
              </div>
              <h2 className="text-lg font-bold mt-4">AI Match</h2>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 p-3 bg-gray-100 rounded-full border-2 border-black">
                <Image src={shopIcon} alt="Shop Icon" />
              </div>
              <h2 className="text-lg font-bold mt-4">Shop</h2>
            </div>
          </div>
          <div className="w-1/3 flex items-center justify-end">
            <Link
              href="/ai-material-finder/tutorial"
              className="text-black px-12 py-3 border-2 border-black rounded-full cursor-pointer hover:bg-gray-800 transition-all duration-300 font-bold"
            >
              View Tutorial
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-12 mt-12">
          {/* Image Upload */}
          <div
            className={`${
              categories.length > 0 ? "col-span-8" : "col-span-12"
            } h-[50rem] flex items-center justify-center border-1 border-gray-700 rounded-lg p-4`}
          >
            {imagePreview ? (
              <div className="relative w-full" style={{ height: "37rem" }}>
                <div
                  className="relative w-full rounded-lg overflow-hidden"
                  style={{ height: "95%" }}
                >
                  <Image
                    src={imagePreview}
                    alt="Uploaded image"
                    fill
                    className="object-contain"
                  />
                  {categories.map(
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
                                      <h4 className="text-xs">Brand: Ikea</h4>
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
                  )}
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
                className="border-2 border-dashed border-gray-300 rounded-lg p-64 text-center cursor-pointer hover:border-gray-400 transition-colors"
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
            className={`col-span-4 h-[50rem] ${
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
                <div className="py-4 h-[42rem] overflow-y-auto hide-scrollbar">
                  {filteredProducts.map((category, index) => (
                    <div key={index} className="my-4">
                      {category.products.map((product, index) => (
                        <div
                          key={index}
                          className="my-4 flex gap-4 bg-gray-100 rounded-lg p-4"
                        >
                          <div
                            className="w-48 h-32 rounded-lg overflow-hidden"
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
                              <h4 className="text-sm">Brand: Ikea</h4>
                              <h4 className="text-xs">Color: Beige</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                className="border-2 border-black px-4 py-1 rounded-lg text-xs cursor-pointer flex items-center justify-center"
                                href="/marketplace"
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
                                className="border-2 border-black px-4 py-1 rounded-lg text-xs cursor-pointer flex items-center justify-center hover:bg-gray-800 hover:text-white transition-all duration-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                                href="/spec-builder"
                                onClick={() => {
                                  setSpecCount(specCount + 1);
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
                  className="grid grid-cols-3 gap-4 mt-4 p-8 rounded-lg"
                  style={{ background: "#E5E7EB" }}
                >
                  {categories.map((category, index) => (
                    <button
                      key={index}
                      onClick={() => toggleCategory(index)}
                      className={`py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/80 shadow-lg shadow-black/10 hover:bg-white/20 hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-300 flex items-center justify-center ${
                        category.hovered
                          ? "scale-110 bg-white/20 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                          : ""
                      }`}
                    >
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
                      <span className="ml-1 text-sm font-bold">
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
