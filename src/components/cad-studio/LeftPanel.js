"use client";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { SYMBOL_CATEGORIES, SYMBOLS } from "@/utils/cad-symbols";
import SymbolPreview from "./SymbolPreview";

const FALLBACK_CATEGORY_LABELS = {
  living: "Living Room",
  bedroom: "Bed Room",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  decor: "Decor",
};

// SYMBOL_CATEGORIES comes from a parallel module; accept an array of ids,
// an array of {id,label} or an {id: label} map without caring which.
const buildCategoryTabs = () => {
  const tabs = [{ id: "all", label: "All" }];
  if (Array.isArray(SYMBOL_CATEGORIES)) {
    for (const entry of SYMBOL_CATEGORIES) {
      if (typeof entry === "string") {
        tabs.push({
          id: entry,
          label: FALLBACK_CATEGORY_LABELS[entry] || entry,
        });
      } else if (entry?.id) {
        tabs.push({
          id: entry.id,
          label: entry.label || FALLBACK_CATEGORY_LABELS[entry.id] || entry.id,
        });
      }
    }
  } else if (SYMBOL_CATEGORIES && typeof SYMBOL_CATEGORIES === "object") {
    for (const [id, value] of Object.entries(SYMBOL_CATEGORIES)) {
      tabs.push({
        id,
        label:
          typeof value === "string"
            ? value
            : value?.label || FALLBACK_CATEGORY_LABELS[id] || id,
      });
    }
  }
  return tabs;
};

const CATEGORY_TABS = buildCategoryTabs();

const SYMBOL_ENTRIES = Object.entries(SYMBOLS || {}).map(([id, def]) => ({
  id,
  ...def,
}));

const Card = ({ children, className = "" }) => (
  <div className={`viz-panel p-4 ${className}`}>{children}</div>
);

const LeftPanel = ({
  imagePreview,
  onFileSelected,
  onRemoveImage,
  onConvert,
  hasResult,
  editPrompt,
  onEditPromptChange,
  suggestions,
  onSuggest,
  onPickSuggestion,
  onApplyEdit,
  editInfo,
  onPlaceAsset,
  error,
}) => {
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const visibleSymbols = useMemo(() => {
    const query = search.trim().toLowerCase();
    return SYMBOL_ENTRIES.filter(
      (entry) =>
        (category === "all" || entry.category === category) &&
        (query === "" ||
          (entry.label || entry.id).toLowerCase().includes(query)),
    );
  }, [search, category]);

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-3">
      {/* Header */}
      <Card className="py-3">
        <h2 className="viz-serif text-xl leading-tight">Image to CAD</h2>
        <p className="viz-label mt-1">Plan → drawing</p>
      </Card>

      {/* Upload */}
      <Card>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
          onChange={handleInputChange}
          className="hidden"
        />
        {imagePreview
          ? <div className="relative">
              <div className="relative w-full h-32 rounded-xl border border-[var(--viz-line)] bg-[var(--viz-ground)] overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Uploaded floor plan"
                  fill
                  className="object-contain"
                />
              </div>
              <button
                type="button"
                onClick={onRemoveImage}
                aria-label="Remove image"
                className="absolute -top-2 -right-2 bg-red-600 text-[var(--viz-paper)] rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700 cursor-pointer"
              >
                ×
              </button>
            </div>
          : <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="w-full border-2 border-dashed border-[var(--viz-line)] rounded-lg p-5 text-center hover:border-[var(--viz-muted)] transition-colors cursor-pointer"
            >
              <svg
                className="h-7 w-7 mx-auto text-[var(--viz-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="block mt-2 text-sm text-[var(--viz-muted)]">
                Drag &amp; drop or choose file to upload.
              </span>
              <span className="viz-mono block mt-1 text-xs text-[var(--viz-muted)]">
                JPG, PNG, WEBP or SVG · max 10MB
              </span>
            </button>}
        <button
          type="button"
          onClick={onConvert}
          disabled={!imagePreview}
          className="viz-btn mt-3 w-full rounded-full bg-[var(--viz-ink)] text-[var(--viz-paper)] py-2.5 cursor-pointer hover:bg-black disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)] disabled:cursor-not-allowed"
        >
          Convert to CAD
        </button>
        {error && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-300 rounded-md">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
      </Card>

      {/* Edits needed */}
      <Card>
        <h3 className="viz-serif text-lg mb-2">Edits needed</h3>
        <textarea
          rows={4}
          value={editPrompt}
          onChange={(event) => onEditPromptChange(event.target.value)}
          placeholder='In your words — e.g. "add a double bed in bedroom 1"'
          className="w-full border border-[var(--viz-line)] bg-white rounded-md px-3 py-2 text-sm resize-none"
        />
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={onSuggest}
            disabled={!hasResult}
            className="viz-mono rounded-full border border-[var(--viz-line)] px-3 py-1 text-xs cursor-pointer hover:bg-[var(--viz-ground)] disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)] disabled:cursor-not-allowed"
          >
            Suggest
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onPickSuggestion(suggestion)}
                className="rounded-full border border-[var(--viz-line)] bg-white px-2.5 py-1 text-xs text-left cursor-pointer hover:bg-[var(--viz-ground)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onApplyEdit}
          disabled={!hasResult || editPrompt.trim() === ""}
          className="viz-btn mt-3 w-full rounded-full bg-[var(--viz-ink)] text-[var(--viz-paper)] py-2 cursor-pointer hover:bg-black disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)] disabled:cursor-not-allowed"
        >
          Apply edit
        </button>
        {editInfo && (
          <p
            className={`mt-2 text-xs ${
              editInfo.applied ? "text-[var(--viz-blue)]" : "text-amber-700"
            }`}
          >
            {editInfo.text}
          </p>
        )}
      </Card>

      {/* Add Asset */}
      <Card>
        <h3 className="viz-serif text-lg mb-2">Add asset</h3>
        <label className="flex items-center gap-2 rounded-full border border-[var(--viz-line)] bg-white px-3 py-1.5">
          <svg
            className="w-4 h-4 text-[var(--viz-muted)] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
            />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs cursor-pointer ${
                category === tab.id
                  ? "bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                  : "bg-[var(--viz-ground)] text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {visibleSymbols.map((entry) => (
            <button
              key={entry.id}
              type="button"
              draggable={hasResult}
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  "application/x-cad-symbol",
                  entry.id,
                );
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onPlaceAsset(entry.id)}
              disabled={!hasResult}
              title={
                hasResult
                  ? "Click to place at center, or drag onto the canvas"
                  : "Convert a plan to CAD first"
              }
              className="flex flex-col items-center gap-1 rounded-xl border border-[var(--viz-line)] p-2 text-xs text-[var(--viz-ink)] cursor-pointer hover:border-[var(--viz-ink)] disabled:bg-[var(--viz-line)]/50 disabled:text-[var(--viz-muted)] disabled:cursor-not-allowed"
            >
              <SymbolPreview symbol={entry} size={28} />
              <span className="truncate w-full text-center">
                {entry.label || entry.id}
              </span>
            </button>
          ))}
          {visibleSymbols.length === 0 && (
            <p className="viz-mono col-span-2 text-xs text-[var(--viz-muted)] text-center py-3">
              No assets match.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LeftPanel;
