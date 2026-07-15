"use client";
import React, { useState, useRef, useEffect } from "react";

import Image from "next/image";
import Link from "next/link";

import visualizerIcon from "../../../public/visualizer-icon.png";

const AiMaterialFinder = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("visualizer");
  const [visualizerSpace, setVisualizerSpace] = useState("");
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const fileInputRef = useRef(null);

  // Form state for AI Visualizer
  const [prompt, setPrompt] = useState("");
  const [selectedSpace, setSelectedSpace] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedLighting, setSelectedLighting] = useState("");
  const [selectedColorPalette, setSelectedColorPalette] = useState("");
  const [validationError, setValidationError] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/svg+xml",
      ];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a valid image file (JPG, PNG, WEBP, or SVG)");
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

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
        "image/webp",
        "image/svg+xml",
      ];
      if (validTypes.includes(file.type)) {
        if (file.size <= 10 * 1024 * 1024) {
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
    setImagePreview(null);
    setAnalysisResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async (type) => {
    if (type === "visualizer") {
      // Validate prompt
      if (!prompt || prompt.trim().length === 0) {
        setValidationError("Please enter a prompt to generate an image.");
        return;
      }

      // Clear previous errors
      setValidationError(null);
      setError(null);

      setIsAnalyzing({
        state: true,
        message: "Validating prompt and generating image...",
      });

      try {
        // Prepare request body with optional image
        const requestBody = {
          prompt: prompt.trim(),
          spaceType: visualizerSpace || selectedSpace,
          style: selectedStyle,
          lighting: selectedLighting,
          colorPalette: selectedColorPalette,
        };

        // Include image if available (for image editing)
        if (imagePreview) {
          requestBody.image = imagePreview;
        }

        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle validation errors or API errors
          if (data.error) {
            if (data.suggestion) {
              // Show detailed error with suggestion
              setValidationError(`${data.error}\n\n${data.suggestion}`);
            } else {
              setValidationError(data.error);
            }
          } else {
            setError("Failed to generate image. Please try again.");
          }
          setIsAnalyzing({ state: false, message: "" });
          return;
        }

        if (data.success && data.images && data.images.length > 0) {
          // Display the first generated image
          const generatedImage = data.images[0];

          // Convert base64 to data URL if needed
          if (generatedImage.image) {
            const imageDataUrl = generatedImage.image.startsWith("data:")
              ? generatedImage.image
              : `data:${generatedImage.mimeType || "image/png"};base64,${
                  generatedImage.image
                }`;

            setImagePreview(imageDataUrl);
          }

          setIsAnalyzing({
            state: false,
            message: "Image generated successfully",
          });
        } else {
          setError("No images were generated. Please try a different prompt.");
          setIsAnalyzing({ state: false, message: "" });
        }
      } catch (err) {
        console.error("Error generating image:", err);
        setError(
          "An error occurred while generating the image. Please try again."
        );
        setIsAnalyzing({ state: false, message: "" });
      }
    }
  };

  return (
    <div className="w-full">
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
      <div className="mt-20 sm:mt-28 md:mt-32 lg:mt-40 px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            AI Visualizer
          </h1>
          <div className="w-4 sm:w-5 md:w-6 ml-2 sm:ml-3 md:ml-4">
            <Image
              src={visualizerIcon}
              alt="Visualizer Icon"
              width={24}
              height={24}
              className="sm:w-6 sm:h-6"
            />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 md:gap-8 lg:gap-12 mt-6 sm:mt-8 md:mt-12">
          {/* Image Upload */}
          <div className="w-full lg:w-2/6 border-1 border-gray-700 rounded-lg p-3 sm:p-4">
            {/* Tab Navigation */}
            <div className="flex mb-4 border-b border-gray-200">
              <button
                onClick={() => {
                  setActiveTab("visualizer");
                  setImagePreview(null);
                  setAnalysisResults(null);
                  setError(null);
                }}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "visualizer"
                    ? "text-gray-900 bg-white border-b-2 border-black"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                AI Visualizer
              </button>
              <Link
                href="/cad-studio"
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Image to CAD Converter
              </Link>
            </div>

            {/* AI Visualizer Content */}
            {activeTab === "visualizer" && (
              <div>
                {/* Define your space */}
                <div className="text-sm font-bold">Define your space</div>
                <div className="flex mt-2 gap-8">
                  <button
                    className={`w-1/3 border-1 border-gray-700 rounded-lg p-2 text-center text-sm cursor-pointer ${
                      visualizerSpace === "interior"
                        ? "bg-black text-white"
                        : "bg-white text-black"
                    }`}
                    onClick={() => setVisualizerSpace("interior")}
                  >
                    Interior
                  </button>
                  <button
                    className={`w-1/3 border-1 border-gray-700 rounded-lg p-2 text-center text-sm cursor-pointer ${
                      visualizerSpace === "exterior"
                        ? "bg-black text-white"
                        : "bg-white text-black"
                    }`}
                    onClick={() => setVisualizerSpace("exterior")}
                  >
                    Exterior
                  </button>
                  <button
                    className={`w-1/3 border-1 border-gray-700 rounded-lg p-2 text-center text-sm cursor-pointer ${
                      visualizerSpace === "floor-plan"
                        ? "bg-black text-white"
                        : "bg-white text-black"
                    }`}
                    onClick={() => setVisualizerSpace("floor-plan")}
                  >
                    Floor Plan
                  </button>
                </div>
                {/* Select Space & Style */}
                <div className="flex mt-4 gap-8">
                  <div className="w-1/2">
                    <div className="text-sm font-bold">Select Space</div>
                    <div>
                      <select
                        className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm"
                        value={selectedSpace}
                        onChange={(e) => setSelectedSpace(e.target.value)}
                      >
                        <option value="">Select an option</option>
                        <option value="Living Room">Living Room</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Bathroom">Bathroom</option>
                        <option value="Bedroom">Bedroom</option>
                        <option value="Dining Room">Dining Room</option>
                        <option value="Office">Office</option>
                      </select>
                    </div>
                  </div>
                  <div className="w-1/2">
                    <div className="text-sm font-bold">Select Style</div>
                    <div>
                      <select
                        className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm"
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                      >
                        <option value="">Select an option</option>
                        <option value="Modern">Modern</option>
                        <option value="Traditional">Traditional</option>
                        <option value="Scandinavian">Scandinavian</option>
                        <option value="Mid-Century Modern">
                          Mid-Century Modern
                        </option>
                        <option value="Industrial">Industrial</option>
                        <option value="Minimalist">Minimalist</option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* Prompt */}
                <div className="mt-4">
                  <div className="text-sm font-bold">Prompt</div>
                  <textarea
                    className="w-full h-32 mt-2 border-1 border-gray-700 rounded-lg px-3 py-3 text-sm resize-none"
                    placeholder="Describe your interior design vision... (e.g., 'A cozy living room with warm lighting and comfortable seating')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  ></textarea>
                  {validationError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{validationError}</p>
                    </div>
                  )}
                  {error && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                </div>
                {/* Optional */}
                <div className="text-sm font-bold mt-4">Optional</div>
                <div className="flex mt-2 gap-8">
                  <div className="w-1/2">
                    <div className="text-sm font-bold">Lighting</div>
                    <div>
                      <select
                        className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm"
                        value={selectedLighting}
                        onChange={(e) => setSelectedLighting(e.target.value)}
                      >
                        <option value="">Select an option</option>
                        <option value="Natural">Natural</option>
                        <option value="Warm">Warm</option>
                        <option value="Cool">Cool</option>
                        <option value="Ambient">Ambient</option>
                        <option value="Dramatic">Dramatic</option>
                      </select>
                    </div>
                  </div>
                  <div className="w-1/2">
                    <div className="text-sm font-bold">Color Palette</div>
                    <div>
                      <select
                        className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm"
                        value={selectedColorPalette}
                        onChange={(e) =>
                          setSelectedColorPalette(e.target.value)
                        }
                      >
                        <option value="">Select an option</option>
                        <option value="Neutral">Neutral</option>
                        <option value="Warm Tones">Warm Tones</option>
                        <option value="Cool Tones">Cool Tones</option>
                        <option value="Monochrome">Monochrome</option>
                        <option value="Bold & Vibrant">Bold & Vibrant</option>
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
                  <button
                    className="w-full bg-black text-white rounded-lg p-2 text-sm cursor-pointer"
                    onClick={() => handleGenerate("visualizer")}
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="w-full lg:w-4/6 flex items-center justify-center border-1 border-gray-700 rounded-lg p-3 sm:p-4 max-h-[40rem]">
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
                </div>
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600"
                >
                  ×
                </button>
                <div className="text-center">
                  {analysisResults?.productRecommendations &&
                    analysisResults.productRecommendations.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Hover over the blue dots to see product recommendations
                      </p>
                    )}
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
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
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
                  Image format: JPG, PNG, WEBP, & SVG. Max 10MB.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiMaterialFinder;
