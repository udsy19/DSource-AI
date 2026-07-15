"use client";

/**
 * Horizontal strip of previous renders (per Figma wireframe).
 * Items are either session renders (data URLs, this visit) or persisted
 * renders (signed URLs from /api/renders).
 */
export default function HistoryStrip({ items, activeId, onSelect, onDelete }) {
  if (!items.length) {
    return (
      <div className="mt-4 border-1 border-gray-300 rounded-2xl p-4 flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-24 h-20 sm:w-32 sm:h-24 rounded-lg bg-gray-100 border border-dashed border-gray-300"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 border-1 border-gray-300 rounded-2xl p-4 overflow-x-auto hide-scrollbar">
      <div className="flex gap-3 min-w-max">
        {items.map((item) => (
          <div key={item.id} className="relative group">
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={`block w-24 h-20 sm:w-32 sm:h-24 rounded-lg overflow-hidden border-2 cursor-pointer ${
                activeId === item.id ? "border-black" : "border-transparent"
              }`}
              title={item.prompt || item.model || "Render"}
            >
              {/* Thumbnails come from data URLs or short-lived signed URLs — next/image can't optimize either. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.prompt || "Previous render"}
                className="w-full h-full object-cover"
              />
            </button>
            {item.persisted && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex bg-red-500 text-white rounded-full w-5 h-5 items-center justify-center text-xs hover:bg-red-600"
                aria-label="Delete render"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
