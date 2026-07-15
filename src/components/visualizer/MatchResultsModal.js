"use client";

import Link from "next/link";

const formatPrice = (match) => {
  if (typeof match.price !== "number") return null;
  return `₹${match.price.toLocaleString("en-IN")}${match.priceUnit || ""}${
    match.priceStale ? " (older price)" : ""
  }`;
};

/**
 * Closest-match results for one detected component: the searched crop plus
 * enriched product cards (material-bank API or the user's own catalog).
 */
export default function MatchResultsModal({ result, onClose }) {
  if (!result) return null;
  const {
    label,
    matches,
    croppedImage,
    reranked,
    rerankReason,
    notice,
    searchQuery,
  } = result;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
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

        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="flex gap-4 items-start">
            {croppedImage && (
              <div className="w-32 shrink-0">
                <div className="text-xs font-semibold text-gray-600 mb-1">
                  Searched region
                </div>
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
                      className="flex gap-3 bg-gray-50 rounded-xl p-3"
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
                            <span className="shrink-0 text-xs font-semibold bg-black text-white rounded-full px-2 py-0.5">
                              {Math.round(match.similarity * 100)}%
                            </span>
                          )}
                        </div>
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
                        {match.link &&
                          (isExternal
                            ? <a
                                href={match.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-1 text-xs font-semibold border border-black rounded-full px-3 py-1 hover:bg-black hover:text-white transition-colors"
                              >
                                View at supplier ↗
                              </a>
                            : <Link
                                href={match.link}
                                className="inline-block mt-1 text-xs font-semibold border border-black rounded-full px-3 py-1 hover:bg-black hover:text-white transition-colors"
                              >
                                View Product
                              </Link>)}
                      </div>
                    </div>
                  );
                })}
              </div>
              {reranked && rerankReason && (
                <p className="mt-3 text-xs text-gray-500 italic">
                  {rerankReason}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
