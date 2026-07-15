"use client";

import { useId, useState } from "react";
import {
  ASPECT_RATIOS,
  COLOR_PALETTES,
  CREATIVITY_LEVELS,
  PALETTE_SWATCHES,
  ROOM_TYPES,
  SPACE_KIND_LABELS,
  SPACE_KINDS,
} from "@/utils/visualizer/params";
import ActionBar, { CREATIVITY_LABELS } from "./ActionBar";
import ChipGroup from "./ChipGroup";
import HistoryStrip from "./HistoryStrip";
import NoticesBox from "./NoticesBox";
import ProductPickerModal from "./ProductPickerModal";
import { GeneratingOverlay } from "./RenderTab";
import TitleBlock from "./TitleBlock";
import UploadCanvas from "./UploadCanvas";
import { useVisualizerTab } from "./useVisualizerTab";

export default function MoodboardTab() {
  const fieldId = useId();
  const tab = useVisualizerTab({ mode: "moodboard" });
  const [creativityIndex, setCreativityIndex] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [controls, setControls] = useState({
    spaceKind: "interior",
    roomType: null,
    colorPalette: null,
    aspectRatio: "4:3",
    prompt: "",
  });

  const setControl = (key, value) => {
    setControls((prev) => {
      const next = { ...prev, [key]: value };
      if (
        key === "spaceKind" &&
        prev.roomType &&
        !(ROOM_TYPES[value] ?? []).includes(prev.roomType)
      ) {
        next.roomType = null;
      }
      return next;
    });
  };

  const handleGenerate = () => {
    const hasAnyInput =
      controls.prompt.trim() ||
      controls.roomType ||
      controls.colorPalette ||
      tab.imagePreview ||
      products.length > 0;
    if (!hasAnyInput) {
      tab.setValidationError(
        "Add products, upload an inspiration photo, or set at least one parameter to generate a mood board.",
      );
      return;
    }
    tab.generate({
      message: "Composing your board…",
      promptForHistory: controls.prompt.trim() || null,
      body: {
        image: tab.imagePreview || undefined,
        prompt: controls.prompt.trim() || undefined,
        products: products.map((p) => ({ imageUrl: p.imageUrl })),
        params: {
          spaceKind: controls.spaceKind,
          roomType: controls.roomType,
          colorPalette: controls.colorPalette,
          aspectRatio: controls.aspectRatio,
          creativity: CREATIVITY_LEVELS[creativityIndex],
        },
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
      <aside className="lg:col-span-4">
        <div className="viz-panel p-4 sm:p-5">
          <h2 className="viz-serif text-2xl">Mood Board</h2>
          <p className="mt-1.5 text-xs text-[var(--viz-muted)]">
            Combine your products, colors, and an optional inspiration photo
            into a cohesive mood board.
          </p>

          <div className="viz-label mt-5">Define your space</div>
          <div className="mt-1.5 flex gap-2">
            {SPACE_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className={`flex-1 cursor-pointer rounded-md border p-2 text-center text-sm ${
                  controls.spaceKind === kind
                    ? "border-[var(--viz-ink)] bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                    : "border-[var(--viz-line)] bg-white hover:bg-[var(--viz-ground)]"
                }`}
                onClick={() => setControl("spaceKind", kind)}
              >
                {SPACE_KIND_LABELS[kind]}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="viz-label" htmlFor={`${fieldId}-roomType`}>
              Space
            </label>
            <select
              id={`${fieldId}-roomType`}
              className="viz-select mt-1.5 w-full rounded-md border border-[var(--viz-line)] bg-white px-2.5 py-2 text-sm"
              value={controls.roomType ?? ""}
              onChange={(e) => setControl("roomType", e.target.value || null)}
            >
              <option value="">Select space</option>
              {(ROOM_TYPES[controls.spaceKind] ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Colors — swatch strips like a sample deck */}
          <div className="mt-4">
            <ChipGroup
              label="Colors"
              value={controls.colorPalette}
              options={COLOR_PALETTES}
              onChange={(v) => setControl("colorPalette", v)}
              swatches={PALETTE_SWATCHES}
            />
          </div>

          <div className="mt-4">
            <label className="viz-label" htmlFor={`${fieldId}-format`}>
              Format
            </label>
            <select
              id={`${fieldId}-format`}
              className="viz-select mt-1.5 w-full rounded-md border border-[var(--viz-line)] bg-white px-2.5 py-2 text-sm"
              value={controls.aspectRatio}
              onChange={(e) => setControl("aspectRatio", e.target.value)}
            >
              {ASPECT_RATIOS.map((ratio) => (
                <option key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </option>
              ))}
            </select>
          </div>

          {/* Products */}
          <div className="viz-label mt-5">Add products</div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-1.5 w-full cursor-pointer rounded-md border border-[var(--viz-line)] bg-white p-2 text-sm hover:bg-[var(--viz-ground)]"
          >
            + Add products to mood board
          </button>
          {products.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {products.map((product) => (
                <span
                  key={product.id}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--viz-line)] bg-white py-1 pr-2 pl-1 text-xs"
                >
                  {/* biome-ignore lint/performance/noImgElement: data/signed URLs cannot use next/image */}
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  <span className="max-w-24 truncate">{product.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setProducts((prev) =>
                        prev.filter((p) => p.id !== product.id),
                      )
                    }
                    aria-label={`Remove ${product.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Edits needed */}
          <div className="mt-4">
            <label className="viz-label" htmlFor={`${fieldId}-prompt`}>
              Edits needed
            </label>
            <textarea
              id={`${fieldId}-prompt`}
              className="mt-1.5 h-24 w-full resize-none rounded-md border border-[var(--viz-line)] bg-white px-3 py-3 text-sm"
              placeholder="Describe the board you want... (optional if you added products or parameters)"
              value={controls.prompt}
              onChange={(e) => setControl("prompt", e.target.value)}
            />
            {tab.validationError && (
              <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3">
                <p className="text-sm text-red-700">{tab.validationError}</p>
              </div>
            )}
            {tab.error && (
              <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3">
                <p className="text-sm text-red-700">{tab.error}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="lg:col-span-8 flex flex-col">
        <UploadCanvas
          imagePreview={tab.imagePreview}
          onFile={tab.acceptImageFile}
          onRemove={tab.removeImage}
          onReset={tab.resetToOriginal}
          canReset={tab.canResetToOriginal}
          emptyHint="Optional: drag & drop an inspiration photo — or generate from products and parameters alone."
          originalImage={tab.originalUpload}
        />
        <TitleBlock
          sheet="M-01"
          rev={tab.historyItems.length}
          verified={tab.isVerified}
          cells={[
            {
              label: "Space",
              value: controls.roomType ?? SPACE_KIND_LABELS[controls.spaceKind],
            },
            { label: "Colors", value: controls.colorPalette },
            { label: "Format", value: controls.aspectRatio },
            {
              label: "Products",
              value: products.length ? String(products.length) : null,
            },
            { label: "Mode", value: CREATIVITY_LABELS[creativityIndex] },
          ]}
        />
        <NoticesBox notices={tab.notices} />
        <HistoryStrip
          items={tab.historyItems}
          activeId={tab.activeHistoryId}
          onSelect={tab.handleHistorySelect}
          onDelete={tab.handleHistoryDelete}
        />
        <ActionBar
          creativityIndex={creativityIndex}
          onCreativityChange={setCreativityIndex}
          actionLabel="Generate board"
          onAction={handleGenerate}
          disabled={tab.isGenerating.state}
        />
      </section>

      <ProductPickerModal
        open={pickerOpen}
        selected={products}
        onConfirm={(picked) => {
          setProducts(picked);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />

      {tab.isGenerating.state && (
        <GeneratingOverlay message={tab.isGenerating.message} />
      )}
    </div>
  );
}
