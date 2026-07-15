"use client";

import { useRef } from "react";
import { IMAGE_TYPES } from "./useVisualizerTab";

/**
 * Shared canvas: image preview (with remove / reset-to-original) or an
 * upload dropzone when empty.
 */
export default function UploadCanvas({
  imagePreview,
  onFile,
  onRemove,
  onReset,
  canReset,
  emptyHint,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="flex-1 min-h-[24rem] sm:min-h-[30rem] flex items-center justify-center border-1 border-gray-700 rounded-2xl p-3 sm:p-4 bg-gray-50">
      {imagePreview
        ? <div className="relative w-full h-full min-h-[24rem]">
            {/* Data-URL / signed-URL images can't go through next/image optimization. */}
            {/* biome-ignore lint/performance/noImgElement: data/signed URLs cannot use next/image */}
            <img
              src={imagePreview}
              alt="Canvas"
              className="absolute inset-0 w-full h-full object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600"
              aria-label="Remove image"
            >
              ×
            </button>
            {canReset && (
              <button
                type="button"
                onClick={onReset}
                className="absolute bottom-2 right-2 bg-white/90 border border-gray-400 rounded-full px-3 py-1 text-xs hover:bg-white"
              >
                Reset to original photo
              </button>
            )}
          </div>
        : <button
            type="button"
            className="border-2 border-dashed border-gray-300 rounded-lg p-10 sm:p-16 text-center cursor-pointer hover:border-gray-400 transition-colors w-full bg-transparent"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              onChange={(e) => onFile(e.target.files[0])}
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
              {emptyHint ?? "Drag & drop or choose a photo to upload."}
            </p>
            <p className="text-gray-500 text-sm">
              Image format: JPG, PNG &amp; WEBP. Max 10MB.
            </p>
          </button>}
    </div>
  );
}
