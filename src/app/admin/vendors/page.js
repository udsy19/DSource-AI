"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, ErrorNote, fmtDate, Panel } from "@/components/admin/ui";

export default function AdminVendorsPage() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch(
        `/api/admin/products?q=${encodeURIComponent(query || "")}`,
      );
      setProducts(data.products);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const toggleActive = async (p) => {
    try {
      await adminFetch(`/api/admin/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      setProducts((prev) =>
        prev.map((x) =>
          x.id === p.id ? { ...x, is_active: !x.is_active } : x,
        ),
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">
          Vendors & Products
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(q);
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product…"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Search
          </button>
        </form>
      </div>

      <ErrorNote message={error} />

      <Panel>
        {loading
          ? <p className="text-sm text-gray-500">Loading…</p>
          : products.length === 0
            ? <p className="text-sm text-gray-500">No products.</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>
                      <th className="pb-2 pr-4">Product</th>
                      <th className="pb-2 pr-4">Vendor</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Added</th>
                      <th className="pb-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 pr-4 font-medium text-gray-900">
                          {p.product_name}
                        </td>
                        <td className="py-2 pr-4">
                          {p.created_by
                            ? <Link
                                href={`/admin/users/${p.created_by}`}
                                className="text-gray-600 hover:underline"
                              >
                                {p.vendor_email || p.created_by.slice(0, 8)}
                              </Link>
                            : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {p.is_active
                            ? <span className="text-xs text-green-600">
                                Active
                              </span>
                            : <span className="text-xs text-gray-400">
                                Inactive
                              </span>}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">
                          {fmtDate(p.created_at)}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => toggleActive(p)}
                              className="text-xs font-semibold text-gray-700 hover:underline"
                            >
                              {p.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(p.id)}
                              className="text-xs font-semibold text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
      </Panel>
    </div>
  );
}
