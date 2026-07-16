"use client";

import { useEffect, useState } from "react";
import { MAX_MOODBOARD_PRODUCTS } from "@/utils/visualizer/params";

/**
 * Picks products from the user's catalog (scraped_product_list via
 * /api/products-list) to feature on a mood board. Selection is capped at
 * MAX_MOODBOARD_PRODUCTS and only products with images are offered.
 */
export default function ProductPickerModal({
  open,
  selected,
  onConfirm,
  onClose,
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [picked, setPicked] = useState(selected);

  useEffect(() => {
    if (!open) return;
    setPicked(selected);
    setLoading(true);
    setLoadError(null);
    fetch("/api/products-list")
      .then(async (res) => {
        if (res.status === 401) {
          throw new Error("Log in to add products from your catalog.");
        }
        if (!res.ok) throw new Error("Couldn't load your products.");
        return res.json();
      })
      .then((data) => {
        setProducts(
          (data.products ?? []).filter((p) => p.image_url).slice(0, 100),
        );
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [open, selected]);

  if (!open) return null;

  const togglePick = (product) => {
    setPicked((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      if (prev.length >= MAX_MOODBOARD_PRODUCTS) return prev;
      return [
        ...prev,
        {
          id: product.id,
          name: product.product_name,
          imageUrl: product.image_url,
          // Spec fields for board captions. Price columns are optional in the
          // catalog schema, so read them defensively.
          brand: product.brand_name ?? null,
          price: product.price_inr ?? product.price ?? null,
        },
      ];
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#262521]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="viz-serif text-xl">
            Add products ({picked.length}/{MAX_MOODBOARD_PRODUCTS})
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

        <div className="mt-4 flex-1 overflow-y-auto">
          {loading && (
            <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
          )}
          {loadError && (
            <p className="text-sm text-red-600 py-8 text-center">{loadError}</p>
          )}
          {!loading && !loadError && products.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">
              No products with images in your catalog yet.
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {products.map((product) => {
              const isPicked = picked.some((p) => p.id === product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => togglePick(product)}
                  className={`text-left rounded-lg border-2 overflow-hidden bg-white ${
                    isPicked
                      ? "border-[var(--viz-blue)]"
                      : "border-[var(--viz-line)]"
                  }`}
                >
                  {/* Catalog images are remote-host URLs already whitelisted for next/image, but thumbnails here are transient — plain img keeps it simple. */}
                  {/* biome-ignore lint/performance/noImgElement: data/signed URLs cannot use next/image */}
                  <img
                    src={product.image_url}
                    alt={product.product_name || "Product"}
                    className="w-full h-20 object-cover"
                  />
                  <span className="block px-2 py-1 text-xs truncate">
                    {product.product_name}
                  </span>
                </button>
              );
            })}
          </div>
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
