"use client";

import { useEffect, useRef, useState } from "react";
import { IMAGE_TYPES } from "./useVisualizerTab";

// Minimum drag size (in 0-1000 normalized units) to count as a selection
// rather than a click.
const MIN_DRAG_UNITS = 20;

/**
 * Shared canvas: a dark "lightbox" plate with registration marks, so
 * renders read true. Shows the image (which "develops" on in print-like
 * steps) or an engraved invitation when empty.
 *
 * When `onRegionSelect` is provided, dragging a box directly on the image
 * calls it with a Gemini-style [ymin, xmin, ymax, xmax] box in 0-1000 —
 * precise manual selection for reverse search.
 *
 * When `originalImage` is provided and differs from the preview, a
 * before/after compare mode is offered: a draggable divider between the
 * original photo and the current render.
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
  originalImage = null,
}) {
  const fileInputRef = useRef(null);
  const wrapperRef = useRef(null);
  const [drag, setDrag] = useState(null); // {x0,y0,x1,y1} in 0-1000 units
  const [devKey, setDevKey] = useState(0); // restarts the develop animation
  const [comparing, setComparing] = useState(false);
  const [comparePos, setComparePos] = useState(50); // % from the left

  const [roomRatio, setRoomRatio] = useState(null); // original W/H

  const canCompare = Boolean(
    originalImage && imagePreview && imagePreview !== originalImage,
  );

  // A new image develops onto the plate; compare mode never outlives it.
  useEffect(() => {
    if (imagePreview) setDevKey((k) => k + 1);
    setComparing(false);
  }, [imagePreview]);

  // Measure the ORIGINAL photo's aspect so compare mode can pin both layers
  // to one shared box — legacy renders with a snapped ratio would otherwise
  // letterbox differently and slide out of register under the divider.
  useEffect(() => {
    setRoomRatio(null);
    if (!originalImage) return undefined;
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled && probe.naturalWidth > 0 && probe.naturalHeight > 0) {
        setRoomRatio(probe.naturalWidth / probe.naturalHeight);
      }
    };
    probe.src = originalImage;
    return () => {
      cancelled = true;
    };
  }, [originalImage]);

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
    if (!onRegionSelect || comparing || event.target.tagName !== "IMG") return;
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
    if (
      box[2] - box[0] >= MIN_DRAG_UNITS &&
      box[3] - box[1] >= MIN_DRAG_UNITS
    ) {
      onRegionSelect?.(box);
    }
  };

  // Compare mode: one aspect box at the ROOM photo's ratio; both layers fill
  // it with identical object-contain letterboxing, so the divider stays in
  // register even when a render's stored ratio differs from the original.
  const compareBox =
    comparing && canCompare && roomRatio
      ? {
          aspectRatio: String(roomRatio),
          width: `min(100%, calc(75vh * ${roomRatio}))`,
        }
      : null;

  const dragRect = drag
    ? {
        left: `${Math.min(drag.x0, drag.x1) / 10}%`,
        top: `${Math.min(drag.y0, drag.y1) / 10}%`,
        width: `${Math.abs(drag.x1 - drag.x0) / 10}%`,
        height: `${Math.abs(drag.y1 - drag.y0) / 10}%`,
      }
    : null;

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Registration marks — the plate corners */}
      <span className="viz-crop viz-crop-tl" aria-hidden="true" />
      <span className="viz-crop viz-crop-tr" aria-hidden="true" />
      <span className="viz-crop viz-crop-bl" aria-hidden="true" />
      <span className="viz-crop viz-crop-br" aria-hidden="true" />

      <div className="flex min-h-[24rem] flex-1 items-center justify-center rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-well)] p-3 sm:min-h-[30rem] sm:p-4">
        {imagePreview
          ? <div className="relative flex h-full min-h-[24rem] w-full items-center justify-center">
              {/* Shrink-wrapped wrapper: overlay children position in % of the
                  actual image, not the letterboxed container. */}
              <div
                ref={wrapperRef}
                key={devKey}
                className={`viz-develop relative ${
                  compareBox ? "block" : "inline-block"
                } ${
                  onRegionSelect && !comparing
                    ? "cursor-crosshair touch-none"
                    : ""
                }`}
                style={compareBox ?? undefined}
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
                  className={
                    compareBox
                      ? "absolute inset-0 h-full w-full select-none rounded-lg object-contain"
                      : "block max-h-[75vh] max-w-full select-none rounded-lg object-contain"
                  }
                />
                <span className="viz-develop-screen" aria-hidden="true" />
                {!comparing && overlay}
                {dragRect && (
                  <span
                    className="pointer-events-none absolute rounded border-2 border-dashed border-[var(--viz-blue)] bg-[var(--viz-blue)]/10"
                    style={dragRect}
                  />
                )}

                {/* Before/after: original clipped to the left of the divider */}
                {comparing && canCompare && (
                  <>
                    {/* biome-ignore lint/performance/noImgElement: data/signed URLs cannot use next/image */}
                    <img
                      src={originalImage}
                      alt="The room before rendering"
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full select-none rounded-lg object-contain"
                      style={{
                        clipPath: `inset(0 ${100 - comparePos}% 0 0)`,
                      }}
                    />
                    <span
                      className="pointer-events-none absolute inset-y-0 w-0.5 bg-[var(--viz-paper)] shadow-[0_0_6px_rgba(0,0,0,0.6)]"
                      style={{ left: `${comparePos}%` }}
                      aria-hidden="true"
                    />
                    <span className="viz-mono pointer-events-none absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] tracking-widest text-white">
                      BEFORE
                    </span>
                    <span className="viz-mono pointer-events-none absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] tracking-widest text-white">
                      AFTER
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={comparePos}
                      onChange={(e) => setComparePos(Number(e.target.value))}
                      aria-label="Compare position"
                      className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                    />
                  </>
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
              <div className="absolute bottom-2 right-2 flex gap-2">
                {canCompare && (
                  <button
                    type="button"
                    onClick={() => setComparing((c) => !c)}
                    className={`viz-mono rounded-full border px-3 py-1 text-xs ${
                      comparing
                        ? "border-[var(--viz-blue)] bg-[var(--viz-blue)] text-white"
                        : "border-[var(--viz-line)] bg-[var(--viz-paper)]/95 hover:bg-[var(--viz-paper)]"
                    }`}
                  >
                    {comparing ? "Exit compare" : "Compare original"}
                  </button>
                )}
                {canReset && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="viz-mono rounded-full border border-[var(--viz-line)] bg-[var(--viz-paper)]/95 px-3 py-1 text-xs hover:bg-[var(--viz-paper)]"
                  >
                    Reset to original photo
                  </button>
                )}
              </div>
            </div>
          : <button
              type="button"
              className="w-full cursor-pointer rounded-lg border-2 border-dashed border-stone-600 bg-transparent px-6 py-10 text-center transition-colors hover:border-stone-400 sm:py-14"
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
              {/* Engraved interior elevation — the room waiting to happen */}
              <svg
                viewBox="0 0 360 208"
                className="mx-auto w-full max-w-sm"
                aria-hidden="true"
              >
                <g
                  stroke="#a39a86"
                  fill="none"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* floor */}
                  <path d="M14 176 H346" strokeDasharray="1 7" opacity=".65" />
                  {/* floor lamp */}
                  <path d="M44 46 H68 L63 62 H49 Z" />
                  <path d="M56 62 V172" />
                  <path d="M44 176 Q56 170 68 176" opacity=".8" />
                  {/* sofa: arms, back, seat, cushion split, feet */}
                  <path d="M92 176 V128 Q92 118 102 118 V106 Q102 94 116 94 H188 Q202 94 202 106 V118 Q212 118 212 128 V176" />
                  <path d="M102 142 H202" />
                  <path d="M152 100 V142" opacity=".7" />
                  <path d="M102 118 V142 M202 118 V142" opacity=".7" />
                  <path d="M100 176 V182 M204 176 V182" opacity=".8" />
                  {/* framed print above the sofa */}
                  <rect x="130" y="42" width="44" height="34" rx="1" />
                  <path
                    d="M136 68 Q146 52 154 62 Q160 68 168 58"
                    opacity=".75"
                  />
                  {/* side table with vase and stem */}
                  <path d="M232 134 H276 M238 134 V176 M270 134 V176" />
                  <path d="M248 134 V122 Q248 112 254 112 Q260 112 260 122 V134" />
                  <path
                    d="M254 112 Q250 100 258 92 M254 112 Q260 102 254 94"
                    opacity=".7"
                  />
                  {/* tall window: frame, mullion, transom, sill */}
                  <rect x="294" y="34" width="52" height="120" rx="2" />
                  <path d="M320 34 V154 M294 92 H346" opacity=".85" />
                  <path d="M288 154 H352" />
                </g>
              </svg>
              <p className="viz-serif mt-4 text-lg italic text-stone-200">
                Every room starts as a sketch. Bring yours.
              </p>
              <p className="mt-2 text-sm text-stone-400">
                {emptyHint ?? "Drag & drop or choose a photo to upload."}
              </p>
              <p className="viz-mono mt-1 text-xs text-stone-500">
                JPG, PNG or WEBP · max 10MB
              </p>
            </button>}
      </div>
    </div>
  );
}
