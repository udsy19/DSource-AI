"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const AiMaterialFinder = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("visualizer");
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const fileInputRef = useRef(null);

  // Helper function to fix image URLs
  const fixImageUrl = (url) => {
    if (!url) return "/placeholder.jpg";

    console.log("Original URL:", url);

    // If it's already a full URL, return as is
    if (url.startsWith("http")) {
      console.log("Already full URL:", url);
      return url;
    }

    // Remove any leading slashes and construct the full URL
    const cleanPath = url.replace(/^\/+/, "");
    const finalUrl = `https://pub-132f3882c2074e84999a9ab982950552.r2.dev/${cleanPath}`;
    console.log("Constructed URL:", finalUrl);
    return finalUrl;
  };

  // Auto-call findMaterial when switching to AI Material Finder tab
  useEffect(() => {
    if (
      analysisResults === null &&
      activeTab === "material-finder" &&
      uploadedImage &&
      !isAnalyzing
    ) {
      findMaterial();
    }
  }, [activeTab]);

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
    setAnalysisResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const findMaterial = async () => {
    if (!uploadedImage) {
      setError("Please upload an image first");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResults(null);

    try {
      const formData = new FormData();
      formData.append("image", uploadedImage);

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to analyze image");
      }

      setAnalysisResults(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };
  return (
    <div className="w-full">
      <div className="w-full h-[10vh]"></div>
      <div className="mt-24 px-12">
        <div>
          <h1 className="text-2xl font-bold">
            AI Visualizer & Material Finder
          </h1>
        </div>
        <div className="flex gap-12 mt-4">
          {/* Image Upload */}
          <div className="w-4/6 flex items-center justify-center border-1 border-gray-700 rounded-lg p-4">
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

                  {/* Product Hover Indicators */}
                  {analysisResults?.productRecommendations &&
                    analysisResults.productRecommendations.length > 0 && (
                      <>
                        {analysisResults.productRecommendations.map(
                          (recommendation, index) => (
                            <div
                              key={index}
                              className="flex-1 rounded-lg flex items-center justify-center shadow-md shadow-black/20 absolute"
                              style={{
                                left: `${
                                  recommendation.position?.x || 20 + index * 20
                                }%`,
                                top: `${
                                  recommendation.position?.y || 20 + index * 15
                                }%`,
                              }}
                              onMouseEnter={() =>
                                setHoveredProduct(recommendation)
                              }
                              onMouseLeave={() => setHoveredProduct(null)}
                            >
                              {/* Hover Indicator Dot */}
                              <div className="w-4 h-4 bg-gray-700 rounded-full border-2 border-white shadow-lg animate-pulse"></div>

                              {/* Product Card */}
                              {hoveredProduct === recommendation && (
                                <div className="w-96 absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                                  <div className="flex bg-white rounded-lg shadow-xl border border-gray-200 p-4">
                                    <div className="w-1/3">
                                      <Image
                                        src={fixImageUrl(
                                          recommendation.productDetails
                                            ?.image_url
                                        )}
                                        alt={
                                          recommendation.productDetails
                                            ?.product_name || "Product"
                                        }
                                        width={400}
                                        height={200}
                                        className="border-2 border-gray-200 rounded-lg object-cover"
                                      />
                                    </div>
                                    <div className="w-2/3 flex flex-col justify-between pl-4">
                                      <div>
                                        <h2 className="text-sm font-bold">
                                          {recommendation.productDetails?.product_name.substring(
                                            0,
                                            25
                                          ) || "Product Name"}
                                        </h2>
                                        <p className="text-xs text-gray-500">
                                          {recommendation.productDetails
                                            ?.brand_name || "Brand"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {recommendation.productDetails
                                            ?.category_name || "Category"}
                                        </p>
                                      </div>
                                      <div>
                                        <a
                                          href={`https://materialdepot.in/${
                                            recommendation.productDetails
                                              ?.product_material_depot_variant_handle ||
                                            ""
                                          }/product`}
                                          className="text-xs text-blue-600 hover:text-blue-800"
                                          target="_blank"
                                        >
                                          View Product →
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Arrow pointing to dot */}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </>
                    )}
                </div>
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  ×
                </button>
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    File: {uploadedImage?.name} (
                    {(uploadedImage?.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                  {analysisResults?.productRecommendations &&
                    analysisResults.productRecommendations.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Hover over the blue dots to see product recommendations
                      </p>
                    )}
                </div>
                {/* <div className="mt-2 text-center">
                  <p className="text-sm text-gray-600">
                    File: {uploadedImage?.name} (
                    {(uploadedImage?.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                  <button
                    onClick={findMaterial}
                    disabled={isAnalyzing}
                    className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? "Analyzing..." : "Find Material"}
                  </button>
                </div> */}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
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
          {/* Form */}
          <div className="w-2/6 border-1 border-gray-700 rounded-lg p-4">
            {/* Tab Navigation */}
            <div className="flex mb-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("visualizer")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "visualizer"
                    ? "text-gray-900 bg-white border-b-2 border-black"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                AI Visualizer
              </button>
              <button
                onClick={() => setActiveTab("material-finder")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "material-finder"
                    ? "text-gray-900 bg-white border-b-2 border-black"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                AI Material Finder
              </button>
            </div>

            {/* AI Visualizer Content */}
            {activeTab === "visualizer" && (
              <div>
                {/* Define your space */}
                <div className="text-sm font-bold">Define your space</div>
                <div className="flex mt-2 gap-8">
                  <button className="w-1/3 border-1 border-gray-700 rounded-lg p-2 text-center text-sm cursor-pointer">
                    Interior
                  </button>
                  <button className="w-1/3 border-1 border-gray-700 rounded-lg p-2 text-center text-sm cursor-pointer">
                    Exterior
                  </button>
                  <button className="w-1/3 border-1 border-gray-700 rounded-lg p-2 text-center text-sm cursor-pointer">
                    Floor Plan
                  </button>
                </div>
                {/* Select Space & Style */}
                <div className="flex mt-4 gap-8">
                  <div className="w-1/2">
                    <div className="text-sm font-bold">Select Space</div>
                    <div>
                      <select className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm">
                        <option value="">Select an option</option>
                        <option value="option1">Living Room</option>
                        <option value="option2">Kitchen</option>
                        <option value="option3">Bathroom</option>
                      </select>
                    </div>
                  </div>
                  <div className="w-1/2">
                    <div className="text-sm font-bold">Select Style</div>
                    <div>
                      <select className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm">
                        <option value="">Select an option</option>
                        <option value="option1">Modern</option>
                        <option value="option2">Traditional</option>
                        <option value="option4">Scandinavian</option>
                        <option value="option5">Mid-Century Modern</option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* Prompt */}
                <div className="mt-4">
                  <textarea
                    className="w-full h-32 mt-2 border-1 border-gray-700 rounded-lg px-3 py-3 text-sm resize-none"
                    placeholder="Prompt..."
                  ></textarea>
                </div>
                {/* Optional */}
                <div className="text-sm font-bold mt-4">Optional</div>
                <div className="flex mt-2 gap-8">
                  <div className="w-1/2">
                    <div className="text-sm font-bold">Lighting</div>
                    <div>
                      <select className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm">
                        <option value="">Select an option</option>
                        <option value="option1">Living Room</option>
                        <option value="option2">Kitchen</option>
                        <option value="option3">Bathroom</option>
                      </select>
                    </div>
                  </div>
                  <div className="w-1/2">
                    <div className="text-sm font-bold">Color Palette</div>
                    <div>
                      <select className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm">
                        <option value="">Select an option</option>
                        <option value="option1">Modern</option>
                        <option value="option2">Traditional</option>
                        <option value="option4">Scandinavian</option>
                        <option value="option5">Mid-Century Modern</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex mt-4 gap-8">
                  <div className="w-1/2">
                    <div>
                      <select className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm">
                        <option value="">Different Renders Every Time</option>
                        <option value="option1">Living Room</option>
                        <option value="option2">Kitchen</option>
                        <option value="option3">Bathroom</option>
                      </select>
                    </div>
                  </div>
                  <div className="w-1/2">
                    <div>
                      <select className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm">
                        <option value="">Public Render</option>
                        <option value="option1">Modern</option>
                        <option value="option2">Traditional</option>
                        <option value="option4">Scandinavian</option>
                        <option value="option5">Mid-Century Modern</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <button className="w-full bg-black text-white rounded-lg p-2 text-sm cursor-pointer">
                    Generate
                  </button>
                </div>
              </div>
            )}

            {/* AI Material Finder Content */}
            {activeTab === "material-finder" && (
              <div
                className="text-center overflow-y-auto"
                style={{ height: "32rem" }}
              >
                {/* No Image Message */}
                {!uploadedImage && !isAnalyzing && (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="text-gray-500 text-sm">
                      Please upload an image first to analyze materials
                    </div>
                  </div>
                )}

                {/* Spinner Animation */}
                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-sm text-gray-600">
                      Analyzing image...
                    </p>
                  </div>
                )}

                {/* Error Display */}
                {error && !isAnalyzing && (
                  <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Analysis Results */}
                {analysisResults && !isAnalyzing && (
                  <div className="mt-4 text-left">
                    <h3 className="font-bold text-sm mb-2">
                      Product Recommendations:
                    </h3>

                    {/* Product Recommendations */}
                    {analysisResults.productRecommendations &&
                      analysisResults.productRecommendations.length > 0 && (
                        <div className="space-y-4">
                          {analysisResults.productRecommendations.map(
                            (recommendation, index) => (
                              <div
                                key={index}
                                className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
                              >
                                {/* Card Header */}
                                <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-3 text-white">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold">
                                      #{index + 1}{" "}
                                      {recommendation.product.category_name}
                                    </h4>
                                    <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded-full font-semibold">
                                      {(
                                        recommendation.confidence * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <p className="text-xs text-blue-100 mt-1">
                                    {recommendation.product.sub_category}
                                  </p>
                                </div>

                                {/* Card Content */}
                                <div className="p-4">
                                  {/* Product Image and Basic Info */}
                                  {recommendation.productDetails && (
                                    <div className="flex gap-3 mb-3">
                                      <div className="w-20 h-20 flex-shrink-0">
                                        {recommendation.productDetails
                                          .image_url ? (
                                          <img
                                            src={fixImageUrl(
                                              recommendation.productDetails
                                                .image_url
                                            )}
                                            alt={
                                              recommendation.productDetails
                                                .product_name
                                            }
                                            className="w-full h-full object-cover rounded-lg border border-gray-200"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                                            <span className="text-xs text-gray-500">
                                              No Image
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-semibold text-gray-900 truncate">
                                          {recommendation.productDetails
                                            .product_name || "Product Name"}
                                        </h5>
                                        <p className="text-xs text-gray-600">
                                          {recommendation.productDetails
                                            .brand || "Brand"}
                                        </p>
                                        <p className="text-sm font-bold text-green-600 mt-1">
                                          {recommendation.productDetails
                                            .price || "Price N/A"}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Product Details */}
                                  <div className="space-y-2 mb-3">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">
                                        Color:
                                      </span>
                                      <span className="font-medium">
                                        {recommendation.product.color}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">
                                        Location:
                                      </span>
                                      <span className="font-medium">
                                        {recommendation.interior_location}
                                      </span>
                                    </div>
                                    {recommendation.productDetails
                                      ?.dimensions && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-600">
                                          Dimensions:
                                        </span>
                                        <span className="font-medium">
                                          {
                                            recommendation.productDetails
                                              .dimensions
                                          }
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* AI Reasoning */}
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-700">
                                      <strong>Why this fits:</strong>{" "}
                                      {recommendation.reasoning}
                                    </p>
                                  </div>

                                  {/* Product Link */}
                                  {recommendation.productDetails
                                    ?.product_material_depot_variant_handle && (
                                    <div className="mt-3">
                                      <Link
                                        href={`https://materialdepot.in/${recommendation.productDetails.product_material_depot_variant_handle}/product`}
                                        className="w-full bg-gray-700 text-white text-xs py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors text-center block"
                                        target="_blank"
                                      >
                                        View Product →
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}

                    {/* Validation Results */}
                    {analysisResults.validation && (
                      <div className="mt-4 p-2 bg-gray-50 rounded-lg">
                        <p className="text-xs font-semibold">
                          Space Type: {analysisResults.validation.spaceType}
                        </p>
                        <p className="text-xs">
                          Confidence:{" "}
                          {(
                            analysisResults.validation.confidence * 100
                          ).toFixed(1)}
                          %
                        </p>
                        <p className="text-xs">
                          Reasoning: {analysisResults.validation.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiMaterialFinder;
