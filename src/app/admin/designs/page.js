"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, ErrorNote, fmtDate } from "@/components/admin/ui";

export default function AdminDesignsPage() {
  const [designs, setDesigns] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch("/api/admin/designs");
      setDesigns(data.designs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id) => {
    if (!confirm("Remove this design?")) return;
    try {
      await adminFetch(`/api/admin/designs/${id}`, { method: "DELETE" });
      setDesigns((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">
        Generated Designs
      </h1>
      <ErrorNote message={error} />

      {loading
        ? <p className="text-sm text-gray-500">Loading…</p>
        : designs.length === 0
          ? <p className="text-sm text-gray-500">No designs generated yet.</p>
          : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {designs.map((d) => (
                <div
                  key={d.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                >
                  {d.url
                    ? // biome-ignore lint/performance/noImgElement: signed Storage URL, not a static asset
                      <img
                        src={d.url}
                        alt={d.prompt || "Generated design"}
                        className="aspect-square w-full object-cover"
                      />
                    : <div className="flex aspect-square items-center justify-center bg-gray-50 text-xs text-gray-400">
                        (image unavailable)
                      </div>}
                  <div className="space-y-1 p-3">
                    <p
                      className="truncate text-xs text-gray-700"
                      title={d.prompt}
                    >
                      {d.prompt || "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {fmtDate(d.created_at)}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      {d.user_id
                        ? <Link
                            href={`/admin/users/${d.user_id}`}
                            className="truncate text-xs text-gray-500 hover:underline"
                          >
                            {d.email || d.user_id.slice(0, 8)}
                          </Link>
                        : <span className="text-xs text-gray-400">—</span>}
                      <button
                        type="button"
                        onClick={() => remove(d.id)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>}
    </div>
  );
}
