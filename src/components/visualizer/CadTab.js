"use client";

import { useId, useState } from "react";
import { CAD_VIEWS } from "@/utils/visualizer/params";
import ActionBar from "./ActionBar";
import HistoryStrip from "./HistoryStrip";
import NoticesBox from "./NoticesBox";
import { GeneratingOverlay } from "./RenderTab";
import TitleBlock from "./TitleBlock";
import UploadCanvas from "./UploadCanvas";
import { useVisualizerTab } from "./useVisualizerTab";

export default function CadTab() {
  const fieldId = useId();
  const tab = useVisualizerTab({ mode: "cad" });
  const [view, setView] = useState("floor-plan");
  const [prompt, setPrompt] = useState("");

  const handleConvert = () => {
    if (!tab.imagePreview) {
      tab.setValidationError("Upload a photo or floor plan to convert to CAD.");
      return;
    }
    tab.generate({
      message: "Drafting your drawing…",
      promptForHistory: prompt.trim() || null,
      body: {
        image: tab.imagePreview,
        prompt: prompt.trim() || undefined,
        params: { view },
      },
    });
  };

  const viewLabel = CAD_VIEWS.find((v) => v.value === view)?.label;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
      <aside className="lg:col-span-4">
        <div className="viz-panel p-4 sm:p-5">
          <h2 className="viz-serif text-2xl">Image to CAD</h2>
          <p className="mt-1.5 text-xs text-[var(--viz-muted)]">
            Convert a room photo or sketch into a clean 2D architectural
            drawing.
          </p>

          {/* View */}
          <div className="viz-label mt-5">View</div>
          <div className="mt-1.5 flex gap-2">
            {CAD_VIEWS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`flex-1 cursor-pointer rounded-md border p-2 text-center text-sm ${
                  view === value
                    ? "border-[var(--viz-ink)] bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                    : "border-[var(--viz-line)] bg-white hover:bg-[var(--viz-ground)]"
                }`}
                onClick={() => setView(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Edits needed */}
          <div className="mt-4">
            <label className="viz-label" htmlFor={`${fieldId}-prompt`}>
              Edits needed
            </label>
            <textarea
              id={`${fieldId}-prompt`}
              className="mt-1.5 h-24 w-full resize-none rounded-md border border-[var(--viz-line)] bg-white px-3 py-3 text-sm"
              placeholder="Optional adjustments... (e.g. 'label the kitchen area')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
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
          emptyHint="Drag & drop a room photo or floor plan to convert."
          originalImage={tab.originalUpload}
        />
        <TitleBlock
          sheet="C-01"
          rev={tab.historyItems.length}
          verified={tab.isVerified}
          cells={[{ label: "View", value: viewLabel }]}
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
