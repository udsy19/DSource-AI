"use client";
import React, { useState, useRef } from "react";
import Image from "next/image";

const AiMaterialFinder = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

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
          <h1 className="text-2xl font-bold">AI Material Finder</h1>
        </div>
        <div className="flex gap-12 mt-4">
          {/* Form */}
          <div className="w-2/6 border-1 border-gray-700 rounded-lg p-4">
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
          {/* Image Upload */}
          <div className="w-4/6 flex items-center justify-center border-1 border-gray-700 rounded-lg p-4">
            {imagePreview ? (
              <div className="relative w-full h-full">
                <div className="relative w-full h-96 rounded-lg overflow-hidden">
                  <Image
                    src={imagePreview}
                    alt="Uploaded image"
                    fill
                    className="object-contain"
                  />
                </div>
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  ×
                </button>
                <div className="mt-2 text-center">
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
                </div>
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
        </div>

        {/* Results Section */}
        {(error || analysisResults) && (
          <div className="mt-8 px-12">
            <div className="border-1 border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Analysis Results</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {analysisResults && (
                <div className="space-y-6">
                  {/* Validation Results */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">
                      Image Validation
                    </h3>
                    <p className="text-green-700">
                      <strong>Space Type:</strong>{" "}
                      {analysisResults.validation.spaceType}
                    </p>
                    <p className="text-green-700">
                      <strong>Confidence:</strong>{" "}
                      {(analysisResults.validation.confidence * 100).toFixed(1)}
                      %
                    </p>
                    <p className="text-green-700">
                      <strong>Reasoning:</strong>{" "}
                      {analysisResults.validation.reasoning}
                    </p>
                  </div>

                  {/* Detected Materials */}
                  <div>
                    <h3 className="font-semibold mb-3">Detected Materials</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysisResults.materials.map((material, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-3"
                        >
                          <p className="font-medium">{material.material}</p>
                          <p className="text-sm text-gray-600">
                            Category: {material.category}
                          </p>
                          <p className="text-sm text-gray-600">
                            Sub-category: {material.subCategory}
                          </p>
                          <p className="text-sm text-gray-600">
                            Location: {material.location}
                          </p>
                          <p className="text-sm text-gray-600">
                            Confidence: {(material.confidence * 100).toFixed(1)}
                            %
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Matching Products */}
                  <div>
                    <h3 className="font-semibold mb-3">Matching Products</h3>
                    {analysisResults.matchingProducts.length === 0 ? (
                      <p className="text-gray-600">
                        No matching products found in database.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {analysisResults.matchingProducts.map(
                          (match, index) => (
                            <div
                              key={index}
                              className="border border-gray-200 rounded-lg p-4"
                            >
                              <h4 className="font-medium mb-2">
                                Material: {match.material.material}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {match.products.map((product, productIndex) => (
                                  <div
                                    key={productIndex}
                                    className="bg-gray-50 rounded-lg p-3"
                                  >
                                    <p className="font-medium text-sm">
                                      {product.name || "Unnamed Product"}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Category: {product.category}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Sub-category: {product.sub_category}
                                    </p>
                                    {product.price && (
                                      <p className="text-xs text-green-600 font-medium">
                                        ${product.price}
                                      </p>
                                    )}
                                    {product.url && (
                                      <a
                                        href={product.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        View Product
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiMaterialFinder;
