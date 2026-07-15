"use client";

import { useState } from "react";
import { DEFAULT_MODEL, MODEL_OPTIONS } from "@/utils/replicate-models";
import { CAD_VIEWS } from "@/utils/visualizer/params";
import ActionBar from "./ActionBar";
import HistoryStrip from "./HistoryStrip";
import NoticesBox from "./NoticesBox";
import { GeneratingOverlay } from "./RenderTab";
import UploadCanvas from "./UploadCanvas";
import { useVisualizerTab } from "./useVisualizerTab";

export default function CadTab() {
  const tab = useVisualizerTab({ mode: "cad" });
  const [view, setView] = useState("floor-plan");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [prompt, setPrompt] = useState("");

  const handleConvert = () => {
    if (!tab.imagePreview) {
      tab.setValidationError("Upload a photo or floor plan to convert to CAD.");
      return;
    }
    tab.generate({
      message: "Converting to a CAD drawing...",
      promptForHistory: prompt.trim() || null,
      body: {
        model,
        image: tab.imagePreview,
        prompt: prompt.trim() || undefined,
        params: { view },
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
      <aside className="lg:col-span-4">
        <div className="border-1 border-gray-700 rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-bold">Image to CAD Drawings</h2>
          <p className="mt-1 text-xs text-gray-600">
            Convert a room photo or sketch into a clean 2D architectural
            drawing.
          </p>

          {/* View */}
          <div className="mt-4 text-sm font-bold">View</div>
          <div className="flex mt-2 gap-2">
            {CAD_VIEWS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`flex-1 border-1 border-gray-700 rounded-lg p-2 text-center text-sm cursor-pointer ${
                  view === value ? "bg-black text-white" : "bg-white text-black"
                }`}
                onClick={() => setView(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Edits needed */}
          <div className="mt-4">
            <label className="text-sm font-bold">Edits needed</label>
            <textarea
              className="w-full h-24 mt-2 border-1 border-gray-700 rounded-lg px-3 py-3 text-sm resize-none"
              placeholder="Optional adjustments... (e.g. 'label the kitchen area')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
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
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
          emptyHint="Drag & drop a room photo or floor plan to convert."
        />
        <NoticesBox notices={tab.notices} />
        <HistoryStrip
          items={tab.historyItems}
          activeId={tab.activeHistoryId}
          onSelect={tab.handleHistorySelect}
          onDelete={tab.handleHistoryDelete}
        />
        <ActionBar
          showCreativity={false}
          actionLabel="Convert to CAD"
          onAction={handleConvert}
          disabled={!tab.imagePreview || tab.isGenerating.state}
        />
      </section>

      {tab.isGenerating.state && (
        <GeneratingOverlay message={tab.isGenerating.message} />
      )}
    </div>
  );
}
