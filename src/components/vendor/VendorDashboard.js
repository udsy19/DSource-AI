"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const formatTimestamp = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);

const templateUrl = "/templates/vendor-product-template.csv";
const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export default function VendorDashboard({ user, productStats }) {
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadLog, setUploadLog] = useState([]);
  const [toast, setToast] = useState(null);

  const fileLabel = file?.name ?? "No file selected";

  const totalProducts = productStats?.totalProducts ?? 0;

  const totalImports = useMemo(
    () => uploadLog.filter((entry) => entry.status === "success").length,
    [uploadLog]
  );

  const handleUpload = async () => {
    if (!file) {
      setToast({
        type: "error",
        message: "Select a CSV template before upload.",
      });
      return;
    }

    setIsUploading(true);
    setToast(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/vendor/upload", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      const entry = {
        id: generateId(),
        status: response.ok ? "success" : "error",
        message: payload?.message ?? payload?.error ?? "Upload complete",
        inserted: payload?.inserted ?? 0,
        totalRows: payload?.totalRows ?? 0,
        timestamp: new Date(),
      };

      setUploadLog((previous) => [entry, ...previous].slice(0, 5));

      if (response.ok) {
        setFile(null);
        setToast({
          type: "success",
          message: `Imported ${entry.inserted}/${entry.totalRows} rows.`,
        });
        router.refresh();
      } else {
        setToast({ type: "error", message: entry.message });
      }
    } catch (error) {
      setToast({
        type: "error",
        message: error?.message ?? "Upload failed. Please retry.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 rounded-2xl border border-gray-200 bg-white/70 p-8 shadow-sm backdrop-blur">
      <header>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
            Vendor dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">
            Welcome back, {user.email}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Download the template, make your updates, and re-upload to keep the
            marketplace fresh.
          </p>
        </div>
      </header>

      <section className="grid gap-4 rounded-2xl bg-gray-50 p-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            Total Products
          </p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {totalProducts}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Products currently live in the marketplace
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            Imports this session
          </p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {totalImports}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Successful CSV uploads since you signed in
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            1. Download the template
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            The CSV template matches the `scraped_product_list` schema. Use{" "}
            <span className="font-medium text-gray-900">|</span> to separate
            multi-value fields such as sub-categories, applications, or tags.
          </p>
          <a
            href={templateUrl}
            download
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            Download CSV template
            <span aria-hidden>&darr;</span>
          </a>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>• Keep the header row unchanged.</li>
            <li>• `product_id` must be unique per product.</li>
            <li>• Use full image URLs hosted on HTTPS.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            2. Upload completed CSV
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ll validate the file before syncing products to Supabase.
          </p>

          <div className="mt-4 space-y-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm">
            <p className="font-medium text-gray-900">{fileLabel}</p>
            <input
              type="file"
              accept=".csv"
              onChange={(event) => {
                const nextFile = event.target.files?.[0];
                setFile(nextFile ?? null);
              }}
              className="text-xs text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isUploading ? "Uploading..." : "Upload CSV"}
            </button>
            <p className="text-xs text-gray-500">
              Need help? The upload expects UTF-8 CSV files under 5MB. Contact
              the DSource team for larger imports.
            </p>
          </div>
        </div>
      </section>

      {toast && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
