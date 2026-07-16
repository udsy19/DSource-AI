"use client";

import { useEffect, useRef, useState } from "react";
import { useSpec } from "@/contexts/SpecContext";
import { MAX_MOODBOARD_PRODUCTS } from "@/utils/visualizer/params";

/**
 * Picks products to pin on a mood board from the two places a user actually
 * has products: their own spec sheet (materials pinned from renders or the
 * marketplace) and a live text search over the material-bank catalog.
 * Selection is capped at MAX_MOODBOARD_PRODUCTS; only items with images are
 * offered (a board pin is an image).
 */
export default function ProductPickerModal({
  open,
  selected,
  onConfirm,
  onClose,
}) {
  const { buckets } = useSpec();
  const [picked, setPicked] = useState(selected);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setPicked(selected);
    setQuery("");
    setResults([]);
    setNotice(null);
  }, [open, selected]);

  // Debounced catalog search.
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/catalog-search?q=${encodeURIComponent(query.trim())}`,
        );
        const data = await res.json();
        setResults(data.products ?? []);
        setNotice(data.notice ?? null);
      } catch {
        setResults([]);
        setNotice("The catalog is not reachable right now.");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  if (!open) return null;

  // Everything on the user's spec sheets (all folios), deduped, image-bearing.
  const specProducts = [];
  const seen = new Set();
  for (const bucket of Object.values(buckets ?? {})) {
    for (const p of bucket.products ?? []) {
      const image =
        p.image && !p.image.includes("placeholder") ? p.image : null;
      if (!image || seen.has(p.name)) continue;
      seen.add(p.name);
      specProducts.push({
        id: p.id,
        name: p.name,
        imageUrl: image,
        brand: p.brand && p.brand !== "Unknown Brand" ? p.brand : null,
        price: typeof p.price === "number" && p.price > 0 ? p.price : null,
      });
    }
  }

  const togglePick = (product) => {
    setPicked((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      if (prev.length >= MAX_MOODBOARD_PRODUCTS) return prev;
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          brand: product.brand ?? null,
          price: product.price ?? null,
        },
      ];
    });
  };

  const renderGrid = (items) => (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {items.map((product) => {
        const isPicked = picked.some((p) => p.id === product.id);
        return (
          <button
            key={product.id}
            type="button"
            onClick={() => togglePick(product)}
            className={`overflow-hidden rounded-lg border-2 bg-white text-left ${
              isPicked ? "border-[var(--viz-blue)]" : "border-[var(--viz-line)]"
            }`}
          >
            {/* biome-ignore lint/performance/noImgElement: transient catalog thumbnails from many supplier hosts */}
            <img
              src={product.imageUrl}
              alt={product.name || "Product"}
              className="h-20 w-full object-cover"
            />
            <span className="block truncate px-2 pt-1 text-xs">
              {product.name}
            </span>
            <span className="viz-mono block truncate px-2 pb-1 text-[10px] text-[var(--viz-muted)]">
              {[
                product.price
                  ? `₹${product.price.toLocaleString("en-IN")}`
                  : null,
                product.brand,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#262521]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="viz-serif text-xl">
            Add products ({picked.length}/{MAX_MOODBOARD_PRODUCTS})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="px-2 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Catalog search — the live material bank with real prices */}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the catalog — 'oak flooring', 'brass wall light'…"
          className="mt-4 w-full rounded-md border border-[var(--viz-line)] bg-white px-3 py-2.5 text-sm"
        />

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {query.trim().length >= 2
            ? <>
                <p className="viz-label mb-2">From the catalog</p>
                {searching && (
                  <p className="py-6 text-center text-sm text-[var(--viz-muted)]">
                    Searching…
                  </p>
                )}
                {!searching && notice && (
                  <p className="py-6 text-center text-sm text-[var(--viz-muted)]">
                    {notice}
                  </p>
                )}
                {!searching && !notice && results.length === 0 && (
                  <p className="py-6 text-center text-sm text-[var(--viz-muted)]">
                    Nothing in the catalog for “{query.trim()}”.
                  </p>
                )}
                {!searching && results.length > 0 && renderGrid(results)}
              </>
            : <>
                <p className="viz-label mb-2">From your spec sheet</p>
                {specProducts.length > 0
                  ? renderGrid(specProducts)
                  : <p className="py-6 text-center text-sm text-[var(--viz-muted)]">
                      Nothing on your spec sheet yet — pin materials from a
                      render (“Find materials in this image”), or search the
                      catalog above.
                    </p>}
              </>}
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-[var(--viz-line)] px-5 py-2 text-sm hover:bg-[var(--viz-ground)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(picked)}
            className="cursor-pointer rounded-lg bg-[var(--viz-blue)] px-5 py-2 text-sm text-white hover:bg-[var(--viz-blue-deep)]"
          >
            Add {picked.length} product{picked.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
