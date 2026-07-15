"use client";

/**
 * "Materials in this design" — products the user pinned to the current
 * render via Add-to-Spec or Swap-into-render. Session-scoped to the current
 * base photo (cleared when a new photo is uploaded).
 */
export default function MaterialsPanel({ materials, onRemove, onAddAllToSpec }) {
  if (!materials.length) return null;

  return (
    <div className="mt-3 rounded-xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="viz-label">
          Materials in this design · {materials.length}
        </p>
        {onAddAllToSpec && (
          <button
            type="button"
            onClick={onAddAllToSpec}
            className="viz-mono rounded-full border border-[var(--viz-ink)] px-3 py-1 text-[11px] hover:bg-[var(--viz-ink)] hover:text-[var(--viz-paper)]"
          >
            Add all to spec
          </button>
        )}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto hide-scrollbar">
        {materials.map((material) => (
          <div
            key={material.key}
            className="flex w-52 shrink-0 items-center gap-2 rounded-lg border border-[var(--viz-line)] bg-white p-2"
          >
            {/* biome-ignore lint/performance/noImgElement: transient catalog thumbnails */}
            <img
              src={material.imageUrl}
              alt={material.name || "Material"}
              className="h-10 w-12 shrink-0 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{material.name}</p>
              <p className="viz-mono truncate text-[10px] text-[var(--viz-muted)]">
                {[
                  material.label,
                  typeof material.price === "number"
                    ? `₹${material.price.toLocaleString("en-IN")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(material)}
              className="shrink-0 px-1 text-sm text-[var(--viz-muted)] hover:text-red-600"
              aria-label={`Remove ${material.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
