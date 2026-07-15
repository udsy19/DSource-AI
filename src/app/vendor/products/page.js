"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const ITEMS_PER_PAGE = 10;

const fieldClasses =
  "w-full rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-3 py-2 text-sm text-[var(--viz-ink)] placeholder:text-[var(--viz-muted)]";

const quietButtonClasses =
  "flex cursor-pointer items-center gap-2 rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-4 py-2 text-sm text-[var(--viz-ink)] transition-colors hover:bg-[var(--viz-ground)]";

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [imageErrors, setImageErrors] = useState(new Set());
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [togglingActive, setTogglingActive] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  // Inline feedback (no browser alert/confirm dialogs on this surface).
  const [pageNotice, setPageNotice] = useState(null);
  const [formError, setFormError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    brand: "",
    status: "", // "" | "active" | "inactive"
    color: "",
  });
  const filterOptions = {
    categories: [
      ...new Set(products.map((p) => p.category_name).filter(Boolean)),
    ].sort(),
    brands: [
      ...new Set(products.map((p) => p.brand_name).filter(Boolean)),
    ].sort(),
    colors: [...new Set(products.map((p) => p.color).filter(Boolean))].sort(),
  };
  const hasActiveFilters =
    filters.category || filters.brand || filters.status || filters.color;
  const clearFilters = () => {
    setFilters({ category: "", brand: "", status: "", color: "" });
    setShowFilterPanel(false);
  };
  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const [productForm, setProductForm] = useState({
    product_name: "",
    product_id: "",
    brand_name: "",
    category_name: "",
    color: "",
    color_code: "",
    color_family: "",
    description: "",
    image_url: "",
    series_name: "",
    thickness: "",
    size: "",
    sub_category: "",
    application: "",
    tags: "",
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (showProductModal) {
      setFormError(null);
      if (editingProduct) {
        setProductForm({
          product_name: editingProduct.product_name || "",
          product_id: String(editingProduct.product_id ?? ""),
          brand_name: editingProduct.brand_name || "",
          category_name: editingProduct.category_name || "",
          color: editingProduct.color || "",
          color_code: editingProduct.color_code || "",
          color_family: editingProduct.color_family || "",
          description: editingProduct.description || "",
          image_url: editingProduct.image_url || "",
          series_name: editingProduct.series_name || "",
          thickness: editingProduct.thickness || "",
          size: editingProduct.size || "",
          sub_category: Array.isArray(editingProduct.sub_category)
            ? editingProduct.sub_category.join(", ")
            : editingProduct.sub_category || "",
          application: Array.isArray(editingProduct.application)
            ? editingProduct.application.join(", ")
            : editingProduct.application || "",
          tags: Array.isArray(editingProduct.tags)
            ? editingProduct.tags.join(", ")
            : editingProduct.tags || "",
        });
      } else {
        setProductForm({
          product_name: "",
          product_id: "",
          brand_name: "",
          category_name: "",
          color: "",
          color_code: "",
          color_family: "",
          description: "",
          image_url: "",
          series_name: "",
          thickness: "",
          size: "",
          sub_category: "",
          application: "",
          tags: "",
        });
      }
    }
  }, [showProductModal, editingProduct]);

  const refreshProducts = async () => {
    try {
      const response = await fetch("/api/products-list");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setFilteredProducts(data.products || []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Error refreshing products:", err);
    }
  };

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/products-list");
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProducts(data.products || []);
        setFilteredProducts(data.products || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on search and filters
  useEffect(() => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.product_id?.toString().includes(query) ||
          product.product_name?.toLowerCase().includes(query) ||
          product.id?.toString().includes(query),
      );
    }

    if (filters.category) {
      filtered = filtered.filter(
        (p) =>
          (p.category_name || "").toLowerCase() ===
          filters.category.toLowerCase(),
      );
    }
    if (filters.brand) {
      filtered = filtered.filter(
        (p) =>
          (p.brand_name || "").toLowerCase() === filters.brand.toLowerCase(),
      );
    }
    if (filters.status === "active") {
      filtered = filtered.filter((p) => p.is_active !== false);
    } else if (filters.status === "inactive") {
      filtered = filtered.filter((p) => p.is_active === false);
    }
    if (filters.color) {
      filtered = filtered.filter(
        (p) => (p.color || "").toLowerCase() === filters.color.toLowerCase(),
      );
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, products, filters]);

  // Handle sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });

    const sorted = [...filteredProducts].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      if (key === "created_at") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || "";
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredProducts(sorted);
  };

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isProductActive = (product) => product.is_active !== false;

  const handleNewProduct = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleToggleActive = async (product) => {
    if (!user) return;
    setTogglingActive(product.id);
    setPageNotice(null);
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isProductActive(product) }),
      });
      if (response.ok) {
        await refreshProducts();
      } else {
        const err = await response.json().catch(() => ({}));
        setPageNotice(err.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Error toggling active:", err);
      setPageNotice("Failed to update status");
    } finally {
      setTogglingActive(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || !user) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setProductToDelete(null);
        await refreshProducts();
      } else {
        const err = await response.json().catch(() => ({}));
        setDeleteError(err.error || "Failed to delete product");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      setDeleteError("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  // Opens the inline confirmation dialog; the deletion itself runs from it.
  const handleBulkDelete = () => {
    if (selectedProducts.length === 0 || !user) return;
    setShowBulkConfirm(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedProducts.length === 0 || !user) return;
    setBulkDeleting(true);
    setPageNotice(null);
    try {
      const results = await Promise.allSettled(
        selectedProducts.map((id) =>
          fetch(`/api/products/${id}`, { method: "DELETE" }),
        ),
      );
      const failed = results.filter(
        (r) =>
          r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok),
      );
      if (failed.length > 0) {
        setPageNotice(
          `${failed.length} of ${selectedProducts.length} product(s) could not be deleted.`,
        );
      }
      setSelectedProducts([]);
      await refreshProducts();
    } catch (err) {
      console.error("Error bulk deleting products:", err);
      setPageNotice("Failed to delete products.");
    } finally {
      setBulkDeleting(false);
      setShowBulkConfirm(false);
    }
  };

  const handleProductFormChange = (field, value) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const productId = Number(productForm.product_id);
    if (!productForm.product_name?.trim()) {
      setFormError("Product name is required");
      return;
    }
    if (!Number.isFinite(productId)) {
      setFormError("Product ID is required and must be a number");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const toArray = (v) => {
        if (!v || typeof v !== "string") return null;
        const arr = v
          .split(/[,|]/)
          .map((s) => s.trim())
          .filter(Boolean);
        return arr.length ? arr : null;
      };
      const payload = {
        product_name: productForm.product_name.trim(),
        brand_name: productForm.brand_name.trim() || null,
        category_name: productForm.category_name.trim() || null,
        color: productForm.color.trim() || null,
        color_code: productForm.color_code.trim() || null,
        color_family: productForm.color_family.trim() || null,
        description: productForm.description.trim() || null,
        image_url: productForm.image_url.trim() || null,
        series_name: productForm.series_name.trim() || null,
        thickness: productForm.thickness.trim() || null,
        size: productForm.size.trim() || null,
        sub_category: toArray(productForm.sub_category),
        application: toArray(productForm.application),
        tags: toArray(productForm.tags),
      };
      if (!editingProduct) {
        payload.product_id = productId;
      }
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products";
      const method = editingProduct ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(data.error || "Failed to save product");
        return;
      }
      setShowProductModal(false);
      setEditingProduct(null);
      await refreshProducts();
    } catch (err) {
      console.error("Error saving product:", err);
      setFormError("Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle product selection
  const toggleProductSelection = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  // Toggle all products
  const toggleAllProducts = () => {
    if (selectedProducts.length === currentProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(currentProducts.map((p) => p.id));
    }
  };

  const handleUploadClick = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setPageNotice(null);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/vendor/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("CSV upload failed:", result);
        setPageNotice(result.error || "Failed to upload CSV file.");
        return;
      }

      await refreshProducts();
    } catch (error) {
      console.error("Error uploading CSV:", error);
      setPageNotice(
        "An unexpected error occurred while uploading the CSV file.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg
          className="ml-1 h-4 w-4 text-[var(--viz-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortConfig.direction === "asc"
      ? <svg
          className="ml-1 h-4 w-4 text-[var(--viz-blue)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      : <svg
          className="ml-1 h-4 w-4 text-[var(--viz-blue)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>;
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="viz-mono text-sm text-[var(--viz-muted)]">
          Fetching your catalog…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <input
            type="text"
            placeholder="Search by ID or name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] py-2 pr-10 pl-4 text-sm text-[var(--viz-ink)] placeholder:text-[var(--viz-muted)]"
          />
          <svg
            className="absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-[var(--viz-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterPanel((open) => !open)}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors ${
                hasActiveFilters
                  ? "border-[var(--viz-blue)] bg-[var(--viz-blue)]/5 text-[var(--viz-blue-deep)]"
                  : "border-[var(--viz-line)] bg-[var(--viz-paper)] text-[var(--viz-ink)] hover:bg-[var(--viz-ground)]"
              }`}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span>Filter</span>
              {hasActiveFilters && (
                <span className="viz-mono ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--viz-blue)] text-xs text-[var(--viz-paper)]">
                  {
                    [
                      filters.category,
                      filters.brand,
                      filters.status,
                      filters.color,
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>
            {showFilterPanel && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden="true"
                  onClick={() => setShowFilterPanel(false)}
                />
                <div className="viz-panel absolute top-full left-0 z-20 mt-1 w-72 p-4 shadow-lg">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="viz-label">Filters</span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="cursor-pointer text-xs text-[var(--viz-blue)] hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="filter-category"
                        className="viz-label mb-1 block"
                      >
                        Category
                      </label>
                      <select
                        id="filter-category"
                        value={filters.category}
                        onChange={(e) => setFilter("category", e.target.value)}
                        className="viz-select w-full rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-2 py-1.5 text-sm text-[var(--viz-ink)]"
                      >
                        <option value="">All categories</option>
                        {filterOptions.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="filter-brand"
                        className="viz-label mb-1 block"
                      >
                        Brand
                      </label>
                      <select
                        id="filter-brand"
                        value={filters.brand}
                        onChange={(e) => setFilter("brand", e.target.value)}
                        className="viz-select w-full rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-2 py-1.5 text-sm text-[var(--viz-ink)]"
                      >
                        <option value="">All brands</option>
                        {filterOptions.brands.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="filter-status"
                        className="viz-label mb-1 block"
                      >
                        Status
                      </label>
                      <select
                        id="filter-status"
                        value={filters.status}
                        onChange={(e) => setFilter("status", e.target.value)}
                        className="viz-select w-full rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-2 py-1.5 text-sm text-[var(--viz-ink)]"
                      >
                        <option value="">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="filter-color"
                        className="viz-label mb-1 block"
                      >
                        Color
                      </label>
                      <select
                        id="filter-color"
                        value={filters.color}
                        onChange={(e) => setFilter("color", e.target.value)}
                        className="viz-select w-full rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-2 py-1.5 text-sm text-[var(--viz-ink)]"
                      >
                        <option value="">All colors</option>
                        {filterOptions.colors.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={uploading}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-[var(--viz-ink)] px-5 py-2 text-sm font-semibold text-[var(--viz-paper)] transition-colors hover:bg-[var(--viz-well)] disabled:cursor-not-allowed disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)]"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>{uploading ? "Uploading…" : "Upload CSV"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleNewProduct}
            className={quietButtonClasses}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>New product</span>
          </button>

          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedProducts.length === 0 || bulkDeleting}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>
              {bulkDeleting
                ? "Deleting…"
                : `Bulk delete${selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ""}`}
            </span>
          </button>
        </div>
      </div>

      {/* Inline feedback — errors explain and direct, never a browser alert. */}
      {pageNotice && (
        <div className="flex items-start justify-between gap-4 rounded-md border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{pageNotice}</p>
          <button
            type="button"
            onClick={() => setPageNotice(null)}
            className="viz-mono shrink-0 cursor-pointer text-xs uppercase tracking-[0.08em] text-red-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="viz-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[var(--viz-line)]">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      currentProducts.length > 0 &&
                      selectedProducts.length === currentProducts.length
                    }
                    onChange={toggleAllProducts}
                    aria-label="Select all products on this page"
                    className="h-4 w-4 accent-[var(--viz-blue)]"
                  />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left transition-colors hover:bg-[var(--viz-ground)]"
                  onClick={() => handleSort("id")}
                >
                  <div className="viz-label flex items-center">
                    ID
                    <SortIcon columnKey="id" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="viz-label">Image</span>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left transition-colors hover:bg-[var(--viz-ground)]"
                  onClick={() => handleSort("product_name")}
                >
                  <div className="viz-label flex items-center">
                    Product name
                    <SortIcon columnKey="product_name" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left transition-colors hover:bg-[var(--viz-ground)]"
                  onClick={() => handleSort("product_id")}
                >
                  <div className="viz-label flex items-center">
                    Product ID
                    <SortIcon columnKey="product_id" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left transition-colors hover:bg-[var(--viz-ground)]"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="viz-label flex items-center">
                    Date
                    <SortIcon columnKey="created_at" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="viz-label">Status</span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="viz-label">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--viz-line)]">
              {currentProducts.length === 0
                ? <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <span className="viz-mono text-sm text-[var(--viz-muted)]">
                        No products found — adjust the filters or upload a CSV.
                      </span>
                    </td>
                  </tr>
                : currentProducts.map((product, index) => {
                    const active = isProductActive(product);
                    const isSelected = selectedProducts.includes(product.id);
                    return (
                      <tr
                        key={product.id}
                        className="transition-colors hover:bg-[var(--viz-ground)]"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProductSelection(product.id)}
                            aria-label={`Select ${product.product_name || "product"}`}
                            className="h-4 w-4 accent-[var(--viz-blue)]"
                          />
                        </td>
                        <td className="viz-mono px-4 py-4 text-sm text-[var(--viz-muted)]">
                          {String(index + 1 + startIndex).padStart(2, "0")}
                        </td>
                        <td className="px-4 py-4">
                          {product.image_url && !imageErrors.has(product.id)
                            ? <div className="h-12 w-12 overflow-hidden rounded-md border border-[var(--viz-line)] bg-[var(--viz-ground)]">
                                <Image
                                  src={product.image_url}
                                  alt={product.product_name || "Product"}
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-cover"
                                  onError={() => {
                                    setImageErrors(
                                      (prev) => new Set([...prev, product.id]),
                                    );
                                  }}
                                />
                              </div>
                            : <div className="viz-mono flex h-12 w-12 items-center justify-center rounded-md border border-[var(--viz-line)] bg-[var(--viz-ground)] text-[10px] text-[var(--viz-muted)]">
                                No image
                              </div>}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-[var(--viz-ink)]">
                          {product.product_name || "—"}
                        </td>
                        <td className="viz-mono px-4 py-4 text-sm text-[var(--viz-muted)]">
                          {product.product_id || "—"}
                        </td>
                        <td className="viz-mono px-4 py-4 text-sm text-[var(--viz-muted)]">
                          {formatDate(product.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`viz-mono inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${
                              active
                                ? "border-[var(--viz-blue)]/40 bg-[var(--viz-blue)]/5 text-[var(--viz-blue-deep)]"
                                : "border-[var(--viz-line)] text-[var(--viz-muted)]"
                            }`}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(product)}
                              disabled={togglingActive === product.id}
                              className="cursor-pointer text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                              title={active ? "Make inactive" : "Make active"}
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditProduct(product)}
                              className="cursor-pointer text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]"
                              title="Edit"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setProductToDelete(product);
                              }}
                              className="cursor-pointer text-[var(--viz-muted)] transition-colors hover:text-red-700"
                              title="Delete"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--viz-line)] px-4 py-4">
            <div className="viz-mono text-sm text-[var(--viz-muted)]">
              {startIndex + 1}–{Math.min(endIndex, filteredProducts.length)} of{" "}
              {filteredProducts.length} products
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="products-page-select" className="viz-label">
                  Page
                </label>
                <select
                  id="products-page-select"
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="viz-select rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-2 py-1 text-sm text-[var(--viz-ink)]"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="cursor-pointer rounded-md border border-[var(--viz-line)] p-2 transition-colors hover:bg-[var(--viz-ground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className="cursor-pointer rounded-md border border-[var(--viz-line)] p-2 transition-colors hover:bg-[var(--viz-ground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A261E]/60 backdrop-blur-sm">
          <div className="viz-panel mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-xl">
            <div className="p-6">
              <h2 className="viz-serif mb-4 text-xl">
                {editingProduct ? "Edit product" : "New product"}
              </h2>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="product-name"
                    className="viz-label mb-1 block"
                  >
                    Product name *
                  </label>
                  <input
                    id="product-name"
                    type="text"
                    value={productForm.product_name}
                    onChange={(e) =>
                      handleProductFormChange("product_name", e.target.value)
                    }
                    className={fieldClasses}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="product-id" className="viz-label mb-1 block">
                    Product ID *
                  </label>
                  <input
                    id="product-id"
                    type="number"
                    value={productForm.product_id}
                    onChange={(e) =>
                      handleProductFormChange("product_id", e.target.value)
                    }
                    className={fieldClasses}
                    required
                    disabled={!!editingProduct}
                  />
                  {editingProduct && (
                    <p className="mt-1 text-xs text-[var(--viz-muted)]">
                      Product ID cannot be changed when editing
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="product-brand"
                    className="viz-label mb-1 block"
                  >
                    Brand name
                  </label>
                  <input
                    id="product-brand"
                    type="text"
                    value={productForm.brand_name}
                    onChange={(e) =>
                      handleProductFormChange("brand_name", e.target.value)
                    }
                    className={fieldClasses}
                  />
                </div>
                <div>
                  <label
                    htmlFor="product-category"
                    className="viz-label mb-1 block"
                  >
                    Category
                  </label>
                  <input
                    id="product-category"
                    type="text"
                    value={productForm.category_name}
                    onChange={(e) =>
                      handleProductFormChange("category_name", e.target.value)
                    }
                    className={fieldClasses}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="product-color"
                      className="viz-label mb-1 block"
                    >
                      Color
                    </label>
                    <input
                      id="product-color"
                      type="text"
                      value={productForm.color}
                      onChange={(e) =>
                        handleProductFormChange("color", e.target.value)
                      }
                      className={fieldClasses}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="product-color-code"
                      className="viz-label mb-1 block"
                    >
                      Color code
                    </label>
                    <input
                      id="product-color-code"
                      type="text"
                      value={productForm.color_code}
                      onChange={(e) =>
                        handleProductFormChange("color_code", e.target.value)
                      }
                      placeholder="#hex"
                      className={fieldClasses}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="product-description"
                    className="viz-label mb-1 block"
                  >
                    Description
                  </label>
                  <textarea
                    id="product-description"
                    value={productForm.description}
                    onChange={(e) =>
                      handleProductFormChange("description", e.target.value)
                    }
                    rows={3}
                    className={fieldClasses}
                  />
                </div>
                <div>
                  <label
                    htmlFor="product-image-url"
                    className="viz-label mb-1 block"
                  >
                    Image URL
                  </label>
                  <input
                    id="product-image-url"
                    type="url"
                    value={productForm.image_url}
                    onChange={(e) =>
                      handleProductFormChange("image_url", e.target.value)
                    }
                    className={fieldClasses}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="product-series"
                      className="viz-label mb-1 block"
                    >
                      Series name
                    </label>
                    <input
                      id="product-series"
                      type="text"
                      value={productForm.series_name}
                      onChange={(e) =>
                        handleProductFormChange("series_name", e.target.value)
                      }
                      className={fieldClasses}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="product-thickness"
                      className="viz-label mb-1 block"
                    >
                      Thickness
                    </label>
                    <input
                      id="product-thickness"
                      type="text"
                      value={productForm.thickness}
                      onChange={(e) =>
                        handleProductFormChange("thickness", e.target.value)
                      }
                      className={fieldClasses}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="product-size"
                    className="viz-label mb-1 block"
                  >
                    Size
                  </label>
                  <input
                    id="product-size"
                    type="text"
                    value={productForm.size}
                    onChange={(e) =>
                      handleProductFormChange("size", e.target.value)
                    }
                    className={fieldClasses}
                  />
                </div>
                <div>
                  <label
                    htmlFor="product-tags"
                    className="viz-label mb-1 block"
                  >
                    Tags (comma-separated)
                  </label>
                  <input
                    id="product-tags"
                    type="text"
                    value={productForm.tags}
                    onChange={(e) =>
                      handleProductFormChange("tags", e.target.value)
                    }
                    placeholder="tag1, tag2, tag3"
                    className={fieldClasses}
                  />
                </div>
                {formError && (
                  <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </p>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductModal(false);
                      setEditingProduct(null);
                    }}
                    className={quietButtonClasses}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="cursor-pointer rounded-full bg-[var(--viz-ink)] px-5 py-2 text-sm font-semibold text-[var(--viz-paper)] transition-colors hover:bg-[var(--viz-well)] disabled:cursor-not-allowed disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)]"
                  >
                    {submitting
                      ? "Saving…"
                      : editingProduct
                        ? "Update"
                        : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A261E]/60 backdrop-blur-sm">
          <div className="viz-panel mx-4 w-full max-w-md p-6 shadow-xl">
            <h3 className="viz-serif mb-2 text-xl">Delete product</h3>
            <p className="mb-6 text-sm text-[var(--viz-muted)]">
              Are you sure you want to delete &quot;
              {productToDelete.product_name || "this product"}&quot;? This
              action cannot be undone.
            </p>
            {deleteError && (
              <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setProductToDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
                className={`${quietButtonClasses} disabled:opacity-60`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="cursor-pointer rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-[var(--viz-paper)] transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A261E]/60 backdrop-blur-sm">
          <div className="viz-panel mx-4 w-full max-w-md p-6 shadow-xl">
            <h3 className="viz-serif mb-2 text-xl">Delete selected products</h3>
            <p className="mb-6 text-sm text-[var(--viz-muted)]">
              Are you sure you want to delete {selectedProducts.length} selected
              product(s)? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                disabled={bulkDeleting}
                className={`${quietButtonClasses} disabled:opacity-60`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={bulkDeleting}
                className="cursor-pointer rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-[var(--viz-paper)] transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
