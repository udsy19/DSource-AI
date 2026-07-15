"use client";

import { useRef, useState } from "react";
import { IMAGE_TYPES } from "./useVisualizerTab";

// Minimum drag size (in 0-1000 normalized units) to count as a selection
// rather than a click.
const MIN_DRAG_UNITS = 20;

/**
 * Shared canvas: a dark "lightbox" well so renders read true. Shows the
 * image preview (with remove / reset-to-original) or an upload dropzone
 * when empty.
 *
 * When `onRegionSelect` is provided, dragging a box directly on the image
 * calls it with a Gemini-style [ymin, xmin, ymax, xmax] box in 0-1000 —
 * precise manual selection for reverse search.
 */
export default function UploadCanvas({
  imagePreview,
  onFile,
  onRemove,
  onReset,
  canReset,
  emptyHint,
  overlay = null,
  onRegionSelect = null,
}) {
  const fileInputRef = useRef(null);
  const wrapperRef = useRef(null);
  const [drag, setDrag] = useState(null); // {x0,y0,x1,y1} in 0-1000 units

  const toUnits = (event) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const clamp = (v) => Math.min(1000, Math.max(0, Math.round(v)));
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 1000),
      y: clamp(((event.clientY - rect.top) / rect.height) * 1000),
    };
  };

  const handlePointerDown = (event) => {
    // Only start a selection on the image itself (not hotspots/buttons).
    if (!onRegionSelect || event.target.tagName !== "IMG") return;
    const point = toUnits(event);
    if (!point) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ x0: point.x, y0: point.y, x1: point.x, y1: point.y });
  };

  const handlePointerMove = (event) => {
    if (!drag) return;
    const point = toUnits(event);
    if (!point) return;
    setDrag((prev) => (prev ? { ...prev, x1: point.x, y1: point.y } : prev));
  };

  const handlePointerUp = () => {
    if (!drag) return;
    const box = [
      Math.min(drag.y0, drag.y1),
      Math.min(drag.x0, drag.x1),
      Math.max(drag.y0, drag.y1),
      Math.max(drag.x0, drag.x1),
    ];
    setDrag(null);
    // Tiny drags are treated as clicks, not selections.
    if (box[2] - box[0] >= MIN_DRAG_UNITS && box[3] - box[1] >= MIN_DRAG_UNITS) {
      onRegionSelect?.(box);
    }
  };

  const dragRect = drag
    ? {
        left: `${Math.min(drag.x0, drag.x1) / 10}%`,
        top: `${Math.min(drag.y0, drag.y1) / 10}%`,
        width: `${Math.abs(drag.x1 - drag.x0) / 10}%`,
        height: `${Math.abs(drag.y1 - drag.y0) / 10}%`,
      }
    : null;

  return (
    <div className="flex min-h-[24rem] flex-1 items-center justify-center rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-well)] p-3 sm:min-h-[30rem] sm:p-4">
      {imagePreview
        ? <div className="relative flex h-full min-h-[24rem] w-full items-center justify-center">
            {/* Shrink-wrapped wrapper: overlay children position in % of the
                actual image, not the letterboxed container. */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer handlers implement drag-select on the image; hotspots stay buttons */}
            <div
              ref={wrapperRef}
              className={`relative inline-block ${onRegionSelect ? "cursor-crosshair touch-none" : ""}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => setDrag(null)}
            >
              {/* Data-URL / signed-URL images can't go through next/image optimization. */}
              {/* biome-ignore lint/performance/noImgElement: data/signed URLs cannot use next/image */}
              <img
                src={imagePreview}
                alt="Canvas"
                draggable={false}
                className="block max-h-[34rem] max-w-full select-none rounded-lg object-contain"
              />
              {overlay}
              {dragRect && (
                <span
                  className="pointer-events-none absolute rounded border-2 border-dashed border-[var(--viz-blue)] bg-[var(--viz-blue)]/10"
                  style={dragRect}
                />
              )}
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-sm text-white hover:bg-red-600"
              aria-label="Remove image"
            >
              ×
            </button>
            {canReset && (
              <button
                type="button"
                onClick={onReset}
                className="viz-mono absolute bottom-2 right-2 rounded-full border border-[var(--viz-line)] bg-[var(--viz-paper)]/95 px-3 py-1 text-xs hover:bg-[var(--viz-paper)]"
              >
                Reset to original photo
              </button>
            )}
          </div>
        : <button
            type="button"
            className="w-full cursor-pointer rounded-lg border-2 border-dashed border-stone-600 bg-transparent p-10 text-center transition-colors hover:border-stone-400 sm:p-16"
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
              className="mx-auto h-8 w-8 text-stone-400"
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
            <p className="mt-2 text-sm text-stone-300">
              {emptyHint ?? "Drag & drop or choose a photo to upload."}
            </p>
            <p className="viz-mono mt-1 text-xs text-stone-500">
              JPG, PNG or WEBP · max 10MB
            </p>
          </button>}
    </div>
  );
}
