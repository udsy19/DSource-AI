"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Pinning Table — a paper artboard where catalog products, swatches,
 * notes, and developed board images are pinned like samples on a workroom
 * table. Freeform: drag to move, corner handle to resize, stem handle to
 * rotate, click to select. Coordinates are normalized (0..1, center-based)
 * so a board lays out identically at any viewport width.
 */

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Wraps to (-180, 180] and snaps near the cardinal angles. */
const normalizeRotation = (deg) => {
  let d = ((((deg + 180) % 360) + 360) % 360) - 180;
  for (const snap of [0, 90, -90, 180, -180]) {
    if (Math.abs(d - snap) < 3) {
      d = snap === -180 ? 180 : snap;
      break;
    }
  }
  return d;
};

const productCaption = (item) => {
  const { name, price, priceUnit, brand } = item.props ?? {};
  return [
    name ?? item.caption,
    price != null ? `₹${INR.format(price)}${priceUnit ?? ""}` : null,
    brand,
  ]
    .filter(Boolean)
    .join(" · ");
};

/** Text legibility on an arbitrary swatch color. */
const inkOrPaper = (hex) => {
  const n = Number.parseInt(hex?.slice(1) ?? "888888", 16);
  const lum =
    0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 140 ? "var(--viz-ink)" : "var(--viz-paper)";
};

function ItemBody({ item }) {
  switch (item.kind) {
    case "product":
      return (
        <div className="overflow-hidden rounded-md border border-[var(--viz-line)] bg-white shadow-[0_1px_3px_rgba(38,34,26,0.18)]">
          {/* biome-ignore lint/performance/noImgElement: data/signed URLs cannot use next/image */}
          <img
            src={item.imageUrl}
            alt={item.props?.name ?? "Product"}
            className="pointer-events-none block w-full select-none"
            draggable={false}
          />
          <div className="viz-mono truncate border-t border-[var(--viz-line)] bg-[var(--viz-paper)] px-1.5 py-1 text-[9px] uppercase tracking-[0.06em] text-[var(--viz-muted)]">
            {productCaption(item) || "Sample"}
          </div>
        </div>
      );
    case "swatch": {
      const hex = item.props?.hex ?? "#cccccc";
      return (
        <div
          className="flex items-end rounded-lg border border-[rgba(38,34,26,0.15)] shadow-[0_1px_3px_rgba(38,34,26,0.18)]"
          style={{ backgroundColor: hex, aspectRatio: "1 / 1" }}
        >
          <span
            className="viz-mono w-full truncate px-1.5 pb-1 text-[9px] uppercase tracking-[0.06em]"
            style={{ color: inkOrPaper(hex) }}
          >
            {item.props?.label ?? hex}
          </span>
        </div>
      );
    }
    case "text":
      return (
        <div className="rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-3 py-2.5 shadow-[0_1px_3px_rgba(38,34,26,0.18)]">
          <p className="viz-serif text-sm italic leading-snug text-[var(--viz-ink)]">
            {item.caption || "…"}
          </p>
        </div>
      );
    case "image":
      return (
        <div className="viz-develop relative overflow-hidden rounded-md border border-[var(--viz-line)] bg-white shadow-[0_2px_6px_rgba(38,34,26,0.22)]">
          {/* biome-ignore lint/performance/noImgElement: data/signed URLs cannot use next/image */}
          <img
            src={item.imageUrl}
            alt={item.caption ?? "Developed board"}
            className="pointer-events-none block w-full select-none"
            draggable={false}
          />
          <span className="viz-develop-screen" aria-hidden="true" />
        </div>
      );
    default:
      return null;
  }
}

export default function PinningTable({
  aspect = "4:3",
  items,
  selectedId,
  onSelect,
  onItemsChange,
}) {
  const boardRef = useRef(null);
  const gestureRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");

  // Deselect on Escape anywhere in the table.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setEditingId(null);
        onSelect(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSelect]);

  const updateItem = (id, patch) => {
    onItemsChange((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...(typeof patch === "function" ? patch(item) : patch) }
          : item,
      ),
    );
  };

  const beginGesture = (e, item, type) => {
    if (editingId) return;
    e.stopPropagation();
    onSelect(item.id);
    const rect = boardRef.current.getBoundingClientRect();
    const cx = rect.left + item.x * rect.width;
    const cy = rect.top + item.y * rect.height;
    gestureRef.current = {
      type,
      id: item.id,
      rect,
      item0: { ...item },
      startClientX: e.clientX,
      startClientY: e.clientY,
      startDist: Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy)),
      startAngle: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some pointer sources (and synthetic events) don't support capture;
      // the gesture still works through the element's own move events.
    }
  };

  const onPointerMove = (e) => {
    const g = gestureRef.current;
    if (!g) return;
    const { rect, item0 } = g;
    const cx = rect.left + item0.x * rect.width;
    const cy = rect.top + item0.y * rect.height;

    if (g.type === "move") {
      updateItem(g.id, {
        x: clamp(
          item0.x + (e.clientX - g.startClientX) / rect.width,
          0.02,
          0.98,
        ),
        y: clamp(
          item0.y + (e.clientY - g.startClientY) / rect.height,
          0.02,
          0.98,
        ),
      });
    } else if (g.type === "resize") {
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      updateItem(g.id, {
        w: clamp(item0.w * (dist / g.startDist), 0.02, 1),
      });
    } else if (g.type === "rotate") {
      const angle =
        (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
      updateItem(g.id, {
        rotation: normalizeRotation(item0.rotation + angle - g.startAngle),
      });
    }
  };

  const endGesture = () => {
    gestureRef.current = null;
  };

  const nudge = (e, item) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const moves = {
      ArrowLeft: { x: clamp(item.x - step, 0.02, 0.98) },
      ArrowRight: { x: clamp(item.x + step, 0.02, 0.98) },
      ArrowUp: { y: clamp(item.y - step, 0.02, 0.98) },
      ArrowDown: { y: clamp(item.y + step, 0.02, 0.98) },
    };
    if (moves[e.key]) {
      e.preventDefault();
      updateItem(item.id, moves[e.key]);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onItemsChange((prev) => prev.filter((i) => i.id !== item.id));
      onSelect(null);
    }
  };

  const restack = (item, direction) => {
    const zs = items.map((i) => i.z ?? 0);
    updateItem(item.id, {
      z: direction > 0 ? Math.max(...zs) + 1 : Math.min(...zs) - 1,
    });
  };

  const startCaptionEdit = (item) => {
    setEditingId(item.id);
    setDraft(
      item.kind === "product"
        ? (item.props?.name ?? item.caption ?? "")
        : (item.caption ?? ""),
    );
  };

  const commitCaption = (item) => {
    const text = draft.trim();
    if (item.kind === "product") {
      updateItem(item.id, (current) => ({
        caption: text || current.caption,
        props: { ...current.props, name: text || current.props?.name },
      }));
    } else {
      updateItem(item.id, { caption: text });
    }
    setEditingId(null);
  };

  const sorted = [...items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  return (
    <div className="relative">
      {/* Registration marks: the table is the artwork of this sheet. */}
      <span className="viz-crop viz-crop-tl" aria-hidden="true" />
      <span className="viz-crop viz-crop-tr" aria-hidden="true" />
      <span className="viz-crop viz-crop-bl" aria-hidden="true" />
      <span className="viz-crop viz-crop-br" aria-hidden="true" />

      <div
        ref={boardRef}
        data-testid="pinning-table"
        className="relative w-full touch-none select-none overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-paper)] shadow-[inset_0_0_0_1px_rgba(38,34,26,0.02)]"
        style={{ aspectRatio: aspect.replace(":", " / ") }}
        onPointerDown={() => {
          setEditingId(null);
          onSelect(null);
        }}
      >
        {sorted.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="viz-serif text-xl italic text-[var(--viz-muted)]">
              An empty table. Pin your first sample.
            </p>
            <p className="viz-label">
              Add products, a swatch, or a note from the rail
            </p>
          </div>
        )}

        {sorted.map((item) => {
          const selected = item.id === selectedId;
          const editing = item.id === editingId;
          return (
            // biome-ignore lint/a11y/useSemanticElements: a draggable board item cannot be a native button (it contains inputs and nested controls)
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              aria-label={`${item.kind} item${item.caption ? `: ${item.caption}` : ""}`}
              className={`absolute cursor-grab focus:outline-none active:cursor-grabbing ${
                selected ? "z-auto" : ""
              }`}
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                width: `${item.w * 100}%`,
                transform: `translate(-50%, -50%) rotate(${item.rotation ?? 0}deg)`,
              }}
              onPointerDown={(e) => beginGesture(e, item, "move")}
              onPointerMove={onPointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              onKeyDown={(e) => nudge(e, item)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (item.kind === "text" || item.kind === "product") {
                  startCaptionEdit(item);
                }
              }}
            >
              <div
                className={
                  selected
                    ? "rounded-md outline-2 outline-offset-2 outline-[var(--viz-ink)]"
                    : ""
                }
              >
                {editing
                  ? <textarea
                      className="viz-serif w-full resize-none rounded-md border border-[var(--viz-ink)] bg-[var(--viz-paper)] px-2 py-1.5 text-sm italic"
                      rows={item.kind === "text" ? 3 : 1}
                      value={draft}
                      // biome-ignore lint/a11y/noAutofocus: the edit field appears on explicit user action (double-click / caption control)
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commitCaption(item)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          commitCaption(item);
                        }
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  : <ItemBody item={item} />}
              </div>

              {/* The pin */}
              <span
                aria-hidden="true"
                className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-[var(--viz-paper)] bg-[var(--viz-ink)]/70 shadow-[0_1px_2px_rgba(38,34,26,0.35)]"
              />

              {selected && !editing && (
                <>
                  {/* Rotate stem */}
                  <div
                    className="absolute -top-7 left-1/2 flex -translate-x-1/2 cursor-crosshair flex-col items-center"
                    onPointerDown={(e) => beginGesture(e, item, "rotate")}
                    onPointerMove={onPointerMove}
                    onPointerUp={endGesture}
                    onPointerCancel={endGesture}
                  >
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-[var(--viz-blue)] bg-[var(--viz-paper)]" />
                    <span
                      className="h-4 w-px bg-[var(--viz-blue)]"
                      aria-hidden="true"
                    />
                  </div>
                  {/* Resize corner */}
                  <span
                    className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-[var(--viz-blue)] bg-[var(--viz-paper)]"
                    onPointerDown={(e) => beginGesture(e, item, "resize")}
                    onPointerMove={onPointerMove}
                    onPointerUp={endGesture}
                    onPointerCancel={endGesture}
                  />
                  {/* Item controls: spec-sheet voice, not floating chrome */}
                  <div
                    className="absolute -bottom-8 left-1/2 flex items-center gap-px overflow-hidden rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] shadow-[0_1px_3px_rgba(38,34,26,0.18)]"
                    style={{
                      transform: `translateX(-50%) rotate(${-(item.rotation ?? 0)}deg)`,
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="viz-mono cursor-pointer px-2 py-1 text-[10px] hover:bg-[var(--viz-ground)]"
                      aria-label="Bring forward"
                      onClick={() => restack(item, 1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="viz-mono cursor-pointer px-2 py-1 text-[10px] hover:bg-[var(--viz-ground)]"
                      aria-label="Send back"
                      onClick={() => restack(item, -1)}
                    >
                      ↓
                    </button>
                    {(item.kind === "product" || item.kind === "text") && (
                      <button
                        type="button"
                        className="viz-mono cursor-pointer px-2 py-1 text-[10px] hover:bg-[var(--viz-ground)]"
                        aria-label="Edit caption"
                        onClick={() => startCaptionEdit(item)}
                      >
                        ✎
                      </button>
                    )}
                    <button
                      type="button"
                      className="viz-mono cursor-pointer px-2 py-1 text-[10px] text-red-700 hover:bg-[var(--viz-ground)]"
                      aria-label="Remove from board"
                      onClick={() => {
                        onItemsChange((prev) =>
                          prev.filter((i) => i.id !== item.id),
                        );
                        onSelect(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
