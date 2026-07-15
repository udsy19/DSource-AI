"use client";

import { useState } from "react";
import {
  DEFAULT_MOODBOARD_MODEL,
  MOODBOARD_MODEL_OPTIONS,
} from "@/utils/replicate-models";
import {
  ASPECT_RATIOS,
  COLOR_PALETTES,
  CREATIVITY_LEVELS,
  ROOM_TYPES,
  SPACE_KINDS,
} from "@/utils/visualizer/params";
import ActionBar from "./ActionBar";
import HistoryStrip from "./HistoryStrip";
import NoticesBox from "./NoticesBox";
import ProductPickerModal from "./ProductPickerModal";
import { GeneratingOverlay } from "./RenderTab";
import UploadCanvas from "./UploadCanvas";
import { useVisualizerTab } from "./useVisualizerTab";

const SPACE_KIND_LABELS = {
  interior: "Interior",
  exterior: "Exterior",
  "floor-plan": "Floor Plan",
};

export default function MoodboardTab() {
  const tab = useVisualizerTab({ mode: "moodboard" });
  const [creativityIndex, setCreativityIndex] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [controls, setControls] = useState({
    spaceKind: "interior",
    roomType: null,
    colorPalette: null,
    aspectRatio: "4:3",
    model: DEFAULT_MOODBOARD_MODEL,
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
      message: "Composing your mood board...",
      promptForHistory: controls.prompt.trim() || null,
      body: {
        model: controls.model,
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
        <div className="border-1 border-gray-700 rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-bold">Mood Board</h2>
          <p className="mt-1 text-xs text-gray-600">
            Combine your products, colors, and an optional inspiration photo
            into a cohesive mood board.
          </p>

          <div className="mt-4 text-sm font-bold">Define your Space</div>
          <div className="flex mt-2 gap-2">
            {SPACE_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className={`flex-1 border-1 border-gray-700 rounded-lg p-2 text-center text-sm cursor-pointer ${
                  controls.spaceKind === kind
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
                onClick={() => setControl("spaceKind", kind)}
              >
                {SPACE_KIND_LABELS[kind]}
              </button>
            ))}
          </div>

          {[
            {
              label: "Space",
              key: "roomType",
              options: ROOM_TYPES[controls.spaceKind] ?? [],
              placeholder: "Select Space",
            },
            {
              label: "Colors",
              key: "colorPalette",
              options: COLOR_PALETTES,
              placeholder: "Select Colors",
            },
          ].map(({ label, key, options, placeholder }) => (
            <div key={key} className="mt-4">
              <label className="text-sm font-bold">{label}</label>
              <select
                className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm bg-white"
                value={controls[key] ?? ""}
                onChange={(e) => setControl(key, e.target.value || null)}
              >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div className="mt-4">
            <label className="text-sm font-bold">Format</label>
            <select
              className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm bg-white"
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
          <div className="mt-4 text-sm font-bold">Add Products</div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm cursor-pointer hover:bg-gray-50"
          >
            + Add Products to Moodboard
          </button>
          {products.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {products.map((product) => (
                <span
                  key={product.id}
                  className="inline-flex items-center gap-1 bg-gray-100 rounded-full pl-1 pr-2 py-1 text-xs"
                >
                  {/* biome-ignore lint/performance/noImgElement: data/signed URLs cannot use next/image */}
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover"
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
            <label className="text-sm font-bold">Edits needed</label>
            <textarea
              className="w-full h-24 mt-2 border-1 border-gray-700 rounded-lg px-3 py-3 text-sm resize-none"
              placeholder="Describe the board you want... (optional if you added products or parameters)"
              value={controls.prompt}
              onChange={(e) => setControl("prompt", e.target.value)}
            />
            {tab.validationError && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{tab.validationError}</p>
              </div>
            )}
            {tab.error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{tab.error}</p>
              </div>
            )}
          </div>

          {/* Model */}
          <div className="mt-4">
            <label className="text-sm font-bold">Model</label>
            <select
              className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm bg-white"
              value={controls.model}
              onChange={(e) => setControl("model", e.target.value)}
            >
              {MOODBOARD_MODEL_OPTIONS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Mood boards need a model that can combine multiple images.
            </p>
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
          actionLabel="Generate"
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
