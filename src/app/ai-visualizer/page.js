"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";

import visualizerIcon from "../../../public/visualizer-icon.png";
import HistoryStrip from "@/components/visualizer/HistoryStrip";
import RenderControls from "@/components/visualizer/RenderControls";
import { DEFAULT_MODEL } from "@/utils/replicate-models";
import { CREATIVITY_LEVELS, ROOM_TYPES } from "@/utils/visualizer/params";

// SVG is deliberately not accepted: the image-edit models reject SVG input.
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const TABS = [
  { key: "render", label: "AI Render", enabled: true },
  { key: "moodboard", label: "Mood board", enabled: false },
  { key: "cad", label: "Image to CAD", enabled: false },
];

const CREATIVITY_LABELS = ["Precise", "Balance", "Creative"];

const AiVisualizer = () => {
  // --- Image state ---
  const [originalUpload, setOriginalUpload] = useState(null); // the user's upload
  const [imagePreview, setImagePreview] = useState(null); // current canvas / edit base
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);

  // --- Render parameters (composed into a prompt server-side) ---
  const [controls, setControls] = useState({
    spaceKind: "interior",
    roomType: null,
    style: null,
    lighting: null,
    colorPalette: null,
    model: DEFAULT_MODEL,
    prompt: "",
    variedSeed: true,
  });
  const [creativityIndex, setCreativityIndex] = useState(1); // 0..2

  // --- Flow state ---
  const [isGenerating, setIsGenerating] = useState({
    state: false,
    message: "",
  });
  const [validationError, setValidationError] = useState(null);
  const [error, setError] = useState(null);
  const [notices, setNotices] = useState([]);

  // --- History (session renders first, then persisted ones) ---
  const [sessionHistory, setSessionHistory] = useState([]);
  const [serverHistory, setServerHistory] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  const handleControlChange = (key, value) => {
    setControls((prev) => {
      const next = { ...prev, [key]: value };
      // Edge case: switching space kind invalidates the room selection.
      if (
        key === "spaceKind" &&
        prev.roomType &&
        !(ROOM_TYPES[value] ?? []).includes(prev.roomType)
      ) {
        next.roomType = null;
      }
      return next;
    });
  };

  // --- Upload handling ---
  const acceptImageFile = (file) => {
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Please upload a valid image file (JPG, PNG, or WEBP).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File size must be less than 10MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalUpload(e.target.result);
      setImagePreview(e.target.result);
      setActiveHistoryId(null);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setOriginalUpload(null);
    setImagePreview(null);
    setActiveHistoryId(null);
    setError(null);
    setNotices([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- History ---
  const fetchServerHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/renders");
      if (!res.ok) return;
      const data = await res.json();
      setServerHistory(
        (data.renders ?? []).map((r) => ({ ...r, persisted: true }))
      );
      if (data.notice) {
        setNotices((prev) =>
          prev.includes(data.notice) ? prev : [...prev, data.notice]
        );
      }
    } catch {
      // History is optional — never block the page on it.
    }
  }, []);

  useEffect(() => {
    fetchServerHistory();
    return () => abortRef.current?.abort();
  }, [fetchServerHistory]);

  const handleHistorySelect = (item) => {
    setImagePreview(item.imageUrl);
    setActiveHistoryId(item.id);
  };

  const handleHistoryDelete = async (item) => {
    try {
      const res = await fetch(`/api/renders/${item.id}`, { method: "DELETE" });
      if (res.ok || res.status === 404) {
        setServerHistory((prev) => prev.filter((r) => r.id !== item.id));
        if (activeHistoryId === item.id) setActiveHistoryId(null);
      }
    } catch {
      // Leave the item in place if deletion failed.
    }
  };

  // --- Generate ---
  const handleGenerate = async () => {
    if (!imagePreview) {
      setValidationError(
        "Please upload a room photo first — every model edits your uploaded image."
      );
      return;
    }

    setValidationError(null);
    setError(null);
    setNotices([]);
    setIsGenerating({ state: true, message: "Generating your render..." });

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: controls.model,
          image: imagePreview,
          prompt: controls.prompt.trim() || undefined,
          variedSeed: controls.variedSeed,
          params: {
            spaceKind: controls.spaceKind,
            roomType: controls.roomType,
            style: controls.style,
            lighting: controls.lighting,
            colorPalette: controls.colorPalette,
            creativity: CREATIVITY_LEVELS[creativityIndex],
          },
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (response.status === 401) {
        setValidationError("Please log in to generate renders.");
        return;
      }

      if (!response.ok) {
        setValidationError(
          data.error || "Failed to generate the render. Please try again."
        );
        return;
      }

      const generated = data.images?.[0];
      if (!data.success || !generated?.image) {
        setError("No render was produced. Please try again.");
        return;
      }

      const dataUrl = `data:${generated.mimeType || "image/png"};base64,${
        generated.image
      }`;
      setImagePreview(dataUrl);

      const historyItem = {
        id: data.renderId ?? `session-${Date.now()}`,
        imageUrl: dataUrl,
        prompt: controls.prompt.trim() || null,
        model: data.model,
        persisted: Boolean(data.renderId),
        createdAt: new Date().toISOString(),
      };
      setSessionHistory((prev) => [historyItem, ...prev]);
      setActiveHistoryId(historyItem.id);

      const serverNotices = Array.isArray(data.notices) ? data.notices : [];
      if (data.adherence?.retried) {
        serverNotices.unshift(
          "We automatically retried once to better match your parameters."
        );
      }
      setNotices(serverNotices);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Error generating render:", err);
      setError("An error occurred while generating. Please try again.");
    } finally {
      setIsGenerating({ state: false, message: "" });
    }
  };

  const historyItems = [...sessionHistory, ...serverHistory];
  const canResetToOriginal =
    originalUpload && imagePreview && imagePreview !== originalUpload;

  return (
    <div className="w-full">
      {isGenerating.state && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-xl p-4">
          <div className="bg-white/20 backdrop-blur-md rounded-lg p-8 flex flex-col items-center space-y-4 w-full max-w-[400px] border border-white/30 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
            <p className="text-lg text-center text-black">
              {isGenerating.message}
            </p>
            <p className="text-xs text-center text-gray-700">
              We verify your parameters were applied and retry automatically if
              needed — this can take a minute.
            </p>
          </div>
        </div>
      )}

      <div className="mt-20 sm:mt-28 md:mt-32 lg:mt-40 px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Header row: title, mode pills, tutorial */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-8">
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
          <div className="flex flex-wrap gap-2 sm:gap-3 lg:mx-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                disabled={!tab.enabled}
                title={tab.enabled ? undefined : "Coming soon"}
                className={`px-4 sm:px-6 py-2 rounded-full text-sm font-semibold ${
                  tab.enabled
                    ? "bg-black text-white cursor-pointer"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link
            href="/ai-material-finder/tutorial"
            className="hidden lg:block text-sm font-semibold border-2 border-black rounded-full px-6 py-2 hover:bg-gray-100"
          >
            View Tutorial
          </Link>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 mt-6 sm:mt-8">
          {/* Left: controls */}
          <aside className="lg:col-span-4">
            <RenderControls
              values={controls}
              onChange={handleControlChange}
              validationError={validationError}
              error={error}
            />
          </aside>

          {/* Right: canvas + history + action bar */}
          <section className="lg:col-span-8 flex flex-col">
            <div className="flex-1 min-h-[24rem] sm:min-h-[30rem] flex items-center justify-center border-1 border-gray-700 rounded-2xl p-3 sm:p-4 bg-gray-50">
              {imagePreview ? (
                <div className="relative w-full h-full min-h-[24rem]">
                  {/* Data-URL / signed-URL images can't go through next/image optimization. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Room render"
                    className="absolute inset-0 w-full h-full object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                  {canResetToOriginal && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(originalUpload);
                        setActiveHistoryId(null);
                      }}
                      className="absolute bottom-2 right-2 bg-white/90 border border-gray-400 rounded-full px-3 py-1 text-xs hover:bg-white"
                    >
                      Reset to original photo
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="border-2 border-dashed border-gray-300 rounded-lg p-10 sm:p-16 text-center cursor-pointer hover:border-gray-400 transition-colors w-full bg-transparent"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    acceptImageFile(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_TYPES.join(",")}
                    onChange={(e) => acceptImageFile(e.target.files[0])}
                    className="hidden"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 mx-auto text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-gray-500 text-sm mt-2">
                    Drag &amp; drop or choose a room photo to upload.
                  </p>
                  <p className="text-gray-500 text-sm">
                    Image format: JPG, PNG &amp; WEBP. Max 10MB.
                  </p>
                </button>
              )}
            </div>

            {notices.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                {notices.map((notice) => (
                  <p key={notice} className="text-xs text-amber-800">
                    {notice}
                  </p>
                ))}
              </div>
            )}

            <HistoryStrip
              items={historyItems}
              activeId={activeHistoryId}
              onSelect={handleHistorySelect}
              onDelete={handleHistoryDelete}
            />

            {/* Action bar: creativity + generate (per Figma) */}
            <div className="mt-4 border-1 border-gray-300 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex-1 bg-gray-100 rounded-xl px-4 py-3">
                <div className="text-sm font-semibold">AI Creativity Level</div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={creativityIndex}
                  onChange={(e) => setCreativityIndex(Number(e.target.value))}
                  className="w-full mt-2 accent-black"
                  aria-label="AI creativity level"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  {CREATIVITY_LABELS.map((label, i) => (
                    <span
                      key={label}
                      className={i === creativityIndex ? "font-bold" : ""}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!imagePreview || isGenerating.state}
                className={`rounded-full px-10 py-3 text-sm font-semibold ${
                  !imagePreview || isGenerating.state
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-black text-white cursor-pointer hover:bg-gray-800"
                }`}
              >
                ✦ Generate
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AiVisualizer;
