"use client";

import Link from "next/link";
import { useState } from "react";

const formatPrice = (match) => {
  if (typeof match.price !== "number") return null;
  return `₹${match.price.toLocaleString("en-IN")}${match.priceUnit || ""}${
    match.priceStale ? " (older price)" : ""
  }`;
};

/**
 * Closest-match results for one detected component: the searched crop plus
 * enriched product cards (material-bank API or the user's own catalog).
 * `onAddToSpec(match)` / `onSwap(match)` are optional actions supplied by
 * the hosting tab.
 */
export default function MatchResultsModal({
  result,
  onClose,
  onAddToSpec = null,
  onSwap = null,
}) {
  const [addedIds, setAddedIds] = useState([]);
  if (!result) return null;
  const { label, matches, croppedImage, notice, searchQuery } = result;

  const handleAdd = (match) => {
    onAddToSpec?.(match);
    setAddedIds((prev) =>
      prev.includes(match.id) ? prev : [...prev, match.id],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#262521]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="viz-serif text-xl">
            Closest matches{label ? ` — ${label}` : ""}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {searchQuery && (
          <p className="mt-1 text-xs text-gray-500">
            Searched the material bank for: “{searchQuery}”
          </p>
        )}

        {/* min-h-0 lets this flex child shrink so overflow-y actually scrolls. */}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex gap-4 items-start">
            {croppedImage && (
              <div className="sticky top-0 w-32 shrink-0">
                <div className="viz-label mb-1">Searched region</div>
                {/* biome-ignore lint/performance/noImgElement: data URI cannot use next/image */}
                <img
                  src={croppedImage}
                  alt="Searched region"
                  className="w-full rounded-lg border border-gray-200"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {notice && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {notice}
                </p>
              )}
              {matches.length === 0 && !notice && (
                <p className="text-sm text-gray-500 p-3">
                  No close matches found in your material bank.
                </p>
              )}
              <div className="space-y-3">
                {matches.map((match) => {
                  const price = formatPrice(match);
                  const isExternal = match.link?.startsWith("http");
                  return (
                    <div
                      key={match.id}
                      className="flex gap-3 rounded-xl border border-[var(--viz-line)] bg-white p-3"
                    >
                      {/* biome-ignore lint/performance/noImgElement: transient catalog thumbnails */}
                      <img
                        src={match.imageUrl}
                        alt={match.name || "Product"}
                        className="w-24 h-20 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold truncate">
                            {match.name || "Untitled product"}
                          </h4>
                          {typeof match.similarity === "number" && (
                            <span className="viz-mono shrink-0 rounded-full bg-[var(--viz-blue)] px-2 py-0.5 text-xs text-white">
                              {Math.round(match.similarity * 100)}%
                            </span>
                          )}
                        </div>
                        {match.matchNote && (
                          <p className="viz-mono mt-0.5 truncate text-[11px] text-[var(--viz-blue)]">
                            ▸ {match.matchNote}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 truncate">
                          {[
                            match.brand,
                            match.category,
                            match.color || match.finish,
                            match.size,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {(price || match.supplier || match.series) && (
                          <p className="text-xs text-gray-700 truncate">
                            {[
                              price,
                              match.supplier,
                              match.series ? `Series: ${match.series}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {onSwap && match.id?.startsWith("mb-") && (
                            <button
                              type="button"
                              onClick={() => onSwap(match)}
                              className="rounded-full bg-[var(--viz-blue)] px-3 py-1 text-xs font-semibold text-white transition-colors hover:opacity-85"
                            >
                              Swap into render
                            </button>
                          )}
                          {onAddToSpec && (
                            <button
                              type="button"
                              onClick={() => handleAdd(match)}
                              disabled={addedIds.includes(match.id)}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                addedIds.includes(match.id)
                                  ? "cursor-default border-green-600 text-green-700"
                                  : "border-black hover:bg-black hover:text-white"
                              }`}
                            >
                              {addedIds.includes(match.id)
                                ? "Added to spec ✓"
                                : "Add to spec"}
                            </button>
                          )}
                          {match.link &&
                            (isExternal
                              ? <a
                                  href={match.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-full border border-black px-3 py-1 text-xs font-semibold transition-colors hover:bg-black hover:text-white"
                                >
                                  Supplier ↗
                                </a>
                              : <Link
                                  href={match.link}
                                  className="rounded-full border border-black px-3 py-1 text-xs font-semibold transition-colors hover:bg-black hover:text-white"
                                >
                                  View Product
                                </Link>)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
