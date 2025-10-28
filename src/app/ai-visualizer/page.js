"use client";
import React, { useState, useRef, useEffect } from "react";

import Image from "next/image";
import Link from "next/link";

import visualizerIcon from "../../../public/visualizer-icon.png";

const AiMaterialFinder = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("visualizer");
  const [hoveredProduct, setHoveredProduct] = useState(null);
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

  return (
    <div className="w-full">
      <div className="mt-40 px-12">
        <div className="flex items-center">
          <h1 className="text-4xl font-bold">AI Visualizer</h1>
          <div className="w-6 ml-4">
            <Image src={visualizerIcon} alt="Visualizer Icon" />
          </div>
        </div>
        <div className="flex gap-12 mt-12">
          {/* Image Upload */}
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
                onClick={() => setActiveTab("cad-converter")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "cad-converter"
                    ? "text-gray-900 bg-white border-b-2 border-black"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Image to CAD Converter
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
            {activeTab === "cad-converter" && (
              <div className="px-4">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 mb-4 ">
                  <button className="px-3 py-2 text-sm font-medium bg-white border-b-2 border-black rounded-t-md">
                    Floor plan
                  </button>
                  <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                    2D View
                  </button>
                </div>

                {/* Position Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">Position</span>
                    <svg
                      className="w-4 h-4 text-gray-500"
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
                  </div>

                  {/* Alignment */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Alignment
                    </div>
                    <div className="flex gap-2">
                      {/* Vertical Alignment */}
                      <div className="flex gap-1">
                        <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
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
                              d="M5 10h14M5 10a2 2 0 110-4h14a2 2 0 110 4M5 10v11m14-11v11"
                            />
                          </svg>
                        </button>
                        <button className="p-2 border border-black bg-gray-100 rounded">
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
                              d="M5 12h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v6m14-6v6"
                            />
                          </svg>
                        </button>
                        <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
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
                              d="M5 14h14M5 14a2 2 0 110 4h14a2 2 0 110-4M5 14V3m14 11V3"
                            />
                          </svg>
                        </button>
                      </div>
                      {/* Horizontal Alignment */}
                      <div className="flex gap-1">
                        <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
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
                              d="M3 5h18M3 5a2 2 0 110 4h18a2 2 0 110-4M3 5v18m18-18v18M14 5v18"
                            />
                          </svg>
                        </button>
                        <button className="p-2 border border-black bg-gray-100 rounded">
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
                              d="M5 12h14M5 12a2 2 0 110 4h14a2 2 0 110-4M5 12v6m14-6v6"
                            />
                          </svg>
                        </button>
                        <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
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
                              d="M10 5h14M10 5a2 2 0 110 4h14a2 2 0 110 4M10 5v14m14-14v14M16 5v14"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Size */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Size
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">X</label>
                        <input
                          type="number"
                          value="140"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        &nbsp;
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">Y</label>
                        <input
                          type="number"
                          value="140"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Layout */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Layout
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">W</label>
                        <input
                          type="number"
                          value="140"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        &nbsp;
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">H</label>
                        <input
                          type="number"
                          value="140"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rotation */}
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Rotation
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 border border-gray-300 rounded px-2 py-1">
                        <svg
                          className="w-4 h-4 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <input
                          type="number"
                          value="120"
                          className="w-full text-sm outline-none"
                        />
                      </div>
                      <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
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
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                      <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
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
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                          />
                        </svg>
                      </button>
                      <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
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
                            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 my-4"></div>

                {/* Style Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">Style</span>
                    <svg
                      className="w-4 h-4 text-gray-500"
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
                  </div>

                  {/* Object */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Object
                    </div>
                    <button className="w-full flex items-center gap-3 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-orange-400 rounded flex items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 via-blue-100 to-orange-300 flex flex-wrap">
                          <div className="w-1/2 h-1/2 border border-gray-700"></div>
                          <div className="w-1/2 h-1/2 border-t border-r border-gray-700"></div>
                          <div className="w-1/2 h-1/2 border-l border-b border-gray-700"></div>
                          <div className="w-1/2 h-1/2 border border-gray-700"></div>
                        </div>
                      </div>
                      <span className="flex-1 text-sm text-left">Tiles</span>
                      <svg
                        className="w-4 h-4 text-gray-500"
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
                  </div>

                  {/* Size */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Size
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">X</label>
                        <input
                          type="number"
                          value="140"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        &nbsp;
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">Y</label>
                        <input
                          type="number"
                          value="140"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Texture */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Texture
                    </div>
                    <button className="w-full flex items-center gap-3 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-orange-400 rounded flex items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 via-blue-100 to-orange-300 flex flex-wrap">
                          <div className="w-1/2 h-1/2 border border-gray-700"></div>
                          <div className="w-1/2 h-1/2 border-t border-r border-gray-700"></div>
                          <div className="w-1/2 h-1/2 border-l border-b border-gray-700"></div>
                          <div className="w-1/2 h-1/2 border border-gray-700"></div>
                        </div>
                      </div>
                      <span className="flex-1 text-sm text-left">Tiles</span>
                      <svg
                        className="w-4 h-4 text-gray-500"
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
                  </div>

                  {/* Material */}
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Material
                    </div>
                    <button className="w-full flex items-center gap-3 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-orange-400 rounded flex items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 via-blue-100 to-orange-300 flex flex-wrap">
                          <div className="w-1/2 h-1/2 border border-gray-700"></div>
                          <div className="w-1/2 h-1/2 border-t border-r border-gray-700"></div>
                          <div className="w-1/2 h-1/2 border-l border-b border-gray-700"></div>
                          <div className="w-1/2 h-1/2 border border-gray-700"></div>
                        </div>
                      </div>
                      <span className="flex-1 text-sm text-left">Tiles</span>
                      <svg
                        className="w-4 h-4 text-gray-500"
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
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="w-4/6 max-h-[40rem] flex items-center justify-center border-1 border-gray-700 rounded-lg p-4">
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
      </div>
    </div>
  );
};

export default AiMaterialFinder;
