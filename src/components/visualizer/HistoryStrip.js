"use client";

import RenderActionsMenu from "@/components/folios/RenderActionsMenu";

/**
 * Horizontal strip of previous versions for this mode. Items are either
 * session renders (data URLs, this visit) or persisted renders (signed URLs
 * from /api/renders). Persisted items with folio metadata (post-migration)
 * get a quiet actions menu: favorite, file into a folio, archive.
 */
export default function HistoryStrip({
  items,
  activeId,
  onSelect,
  onDelete,
  onUpdate,
}) {
  return (
    <div className="viz-panel mt-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="viz-label">Versions</div>
        <div className="text-xs text-[var(--viz-muted)]">
          Every render is kept — try anything.
        </div>
      </div>
      {items.length === 0
        ? <p className="viz-mono mt-2 text-xs text-[var(--viz-muted)]">
            No versions yet — REV 01 appears here after your first render.
          </p>
        : <div className="mt-2 overflow-x-auto hide-scrollbar">
            <div className="flex min-w-max gap-3">
              {items.map((item) => (
                <div key={item.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className={`block h-20 w-24 cursor-pointer overflow-hidden rounded-lg border-2 sm:h-24 sm:w-32 ${
                      activeId === item.id
                        ? "border-[var(--viz-blue)]"
                        : "border-transparent"
                    }`}
                    title={item.prompt || item.model || "Render"}
                  >
                    {/* Thumbnails come from data URLs or short-lived signed URLs — next/image can't optimize either. */}
                    {/* biome-ignore lint/performance/noImgElement: data/signed URLs cannot use next/image */}
                    <img
                      src={item.imageUrl}
                      alt={item.prompt || "Previous render"}
                      className="h-full w-full object-cover"
                    />
                  </button>
                  {item.isFavorite && (
                    <span className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--viz-paper)]/90 text-[10px] leading-none text-[var(--viz-blue)]">
                      <span aria-hidden="true">★</span>
                      <span className="sr-only">Favorited</span>
                    </span>
                  )}
                  {item.persisted && onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className="absolute -top-1.5 -right-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white group-hover:flex hover:bg-red-600"
                      aria-label="Delete render"
                    >
                      ×
                    </button>
                  )}
                  {/* Folio fields are absent until the projects migration is
                      applied — hide the menu rather than offer actions that
                      would fail. */}
                  {item.persisted &&
                    onUpdate &&
                    item.isFavorite !== undefined && (
                      <RenderActionsMenu item={item} onUpdate={onUpdate} />
                    )}
                </div>
              ))}
            </div>
          </div>}
    </div>
  );
}
