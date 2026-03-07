"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

const ITEMS_PER_PAGE = 10;

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
    if (!dateString) return "N/A";
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
        alert(err.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Error toggling active:", err);
      alert("Failed to update status");
    } finally {
      setTogglingActive(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || !user) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setProductToDelete(null);
        await refreshProducts();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to delete product");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0 || !user) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedProducts.length} selected product(s)? This action cannot be undone.`,
    );
    if (!confirmed) return;
    setBulkDeleting(true);
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
        alert(
          `${failed.length} of ${selectedProducts.length} product(s) could not be deleted.`,
        );
      }
      setSelectedProducts([]);
      await refreshProducts();
    } catch (err) {
      console.error("Error bulk deleting products:", err);
      alert("Failed to delete products.");
    } finally {
      setBulkDeleting(false);
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
      alert("Product name is required");
      return;
    }
    if (!Number.isFinite(productId)) {
      alert("Product ID is required and must be a number");
      return;
    }
    setSubmitting(true);
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
        alert(data.error || "Failed to save product");
        return;
      }
      setShowProductModal(false);
      setEditingProduct(null);
      await refreshProducts();
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Failed to save product");
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
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/vendor/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("CSV upload failed:", result);
        alert(result.error || "Failed to upload CSV file.");
        return;
      }

      await refreshProducts();
    } catch (error) {
      console.error("Error uploading CSV:", error);
      alert("An unexpected error occurred while uploading the CSV file.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg
          className="w-4 h-4 ml-1 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
    return sortConfig.direction === "asc" ? (
      <svg
        className="w-4 h-4 ml-1 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 ml-1 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search for id, name product"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterPanel((open) => !open)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                hasActiveFilters
                  ? "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-xs font-medium text-blue-800">
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
                <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Filters
                    </span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => setFilter("category", e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Brand
                      </label>
                      <select
                        value={filters.brand}
                        onChange={(e) => setFilter("brand", e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilter("status", e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Color
                      </label>
                      <select
                        value={filters.color}
                        onChange={(e) => setFilter("color", e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              onClick={handleUploadClick}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#E8703A" }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>{uploading ? "Uploading..." : "Upload CSV File"}</span>
            </button>
          </div>

          <button
            onClick={handleNewProduct}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>New Product</span>
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={selectedProducts.length === 0 || bulkDeleting}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
                ? "Deleting..."
                : `Bulk Delete${selectedProducts.length > 0 ? ` (${selectedProducts.length})` : ""}`}
            </span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      currentProducts.length > 0 &&
                      selectedProducts.length === currentProducts.length
                    }
                    onChange={toggleAllProducts}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center">
                    ID
                    <SortIcon columnKey="id" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Image
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("product_name")}
                >
                  <div className="flex items-center">
                    Product Name
                    <SortIcon columnKey="product_name" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("product_id")}
                >
                  <div className="flex items-center">
                    Product ID
                    <SortIcon columnKey="product_id" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center">
                    QTY
                    <SortIcon columnKey="id" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center">
                    Date
                    <SortIcon columnKey="created_at" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center">
                    Status
                    <SortIcon columnKey="id" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No products found
                  </td>
                </tr>
              ) : (
                currentProducts.map((product, index) => {
                  const active = isProductActive(product);
                  const isSelected = selectedProducts.includes(product.id);
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProductSelection(product.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {String(index + 1 + startIndex).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-4">
                        {product.image_url && !imageErrors.has(product.id) ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={product.image_url}
                              alt={product.product_name || "Product"}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                              onError={() => {
                                setImageErrors(
                                  (prev) => new Set([...prev, product.id]),
                                );
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {product.product_name || "N/A"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {product.product_id || "N/A"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">40</td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleActive(product)}
                            disabled={togglingActive === product.id}
                            className="text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={active ? "Make inactive" : "Make active"}
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
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
                            onClick={() => handleEditProduct(product)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
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
                            onClick={() => setProductToDelete(product)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {startIndex + 1} - {Math.min(endIndex, filteredProducts.length)}{" "}
              of {filteredProducts.length} Pages
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>The page on</span>
                <select
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingProduct ? "Edit Product" : "New Product"}
              </h2>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productForm.product_name}
                    onChange={(e) =>
                      handleProductFormChange("product_name", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product ID *
                  </label>
                  <input
                    type="number"
                    value={productForm.product_id}
                    onChange={(e) =>
                      handleProductFormChange("product_id", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!editingProduct}
                  />
                  {editingProduct && (
                    <p className="text-xs text-gray-500 mt-1">
                      Product ID cannot be changed when editing
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={productForm.brand_name}
                    onChange={(e) =>
                      handleProductFormChange("brand_name", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={productForm.category_name}
                    onChange={(e) =>
                      handleProductFormChange("category_name", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      value={productForm.color}
                      onChange={(e) =>
                        handleProductFormChange("color", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color Code
                    </label>
                    <input
                      type="text"
                      value={productForm.color_code}
                      onChange={(e) =>
                        handleProductFormChange("color_code", e.target.value)
                      }
                      placeholder="#hex"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) =>
                      handleProductFormChange("description", e.target.value)
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={productForm.image_url}
                    onChange={(e) =>
                      handleProductFormChange("image_url", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Series Name
                    </label>
                    <input
                      type="text"
                      value={productForm.series_name}
                      onChange={(e) =>
                        handleProductFormChange("series_name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thickness
                    </label>
                    <input
                      type="text"
                      value={productForm.thickness}
                      onChange={(e) =>
                        handleProductFormChange("thickness", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size
                  </label>
                  <input
                    type="text"
                    value={productForm.size}
                    onChange={(e) =>
                      handleProductFormChange("size", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={productForm.tags}
                    onChange={(e) =>
                      handleProductFormChange("tags", e.target.value)
                    }
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductModal(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#E8703A" }}
                  >
                    {submitting
                      ? "Saving..."
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete Product
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;
              {productToDelete.product_name || "this product"}&quot;? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
