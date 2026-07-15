"use client";

import { useState } from "react";
import { DEFAULT_MODEL } from "@/utils/replicate-models";
import { CREATIVITY_LEVELS, ROOM_TYPES } from "@/utils/visualizer/params";
import ActionBar from "./ActionBar";
import HistoryStrip from "./HistoryStrip";
import NoticesBox from "./NoticesBox";
import RenderControls from "./RenderControls";
import UploadCanvas from "./UploadCanvas";
import { useVisualizerTab } from "./useVisualizerTab";

export default function RenderTab() {
  const tab = useVisualizerTab({ mode: "render" });
  const [creativityIndex, setCreativityIndex] = useState(1);
  const [controls, setControls] = useState({
    spaceKind: "interior",
    roomType: null,
    style: null,
    lighting: null,
    colorPalette: null,
    model: DEFAULT_MODEL,
    prompt: "",
    variedSeed: true,
  });

  const handleControlChange = (key, value) => {
    setControls((prev) => {
      const next = { ...prev, [key]: value };
      // Edge case: switching space kind invalidates the room selection.
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
    if (!tab.imagePreview) {
      tab.setValidationError(
        "Please upload a room photo first — every model edits your uploaded image.",
      );
      return;
    }
    tab.generate({
      message: "Generating your render...",
      promptForHistory: controls.prompt.trim() || null,
      body: {
        model: controls.model,
        image: tab.imagePreview,
        prompt: controls.prompt.trim() || undefined,
        variedSeed: controls.variedSeed,
        params: {
          spaceKind: controls.spaceKind,
          roomType: controls.roomType,
          style: controls.style,
          lighting: controls.lighting,
          colorPalette: controls.colorPalette,
          creativity: CREATIVITY_LEVELS[creativityIndex],
        },
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
      <aside className="lg:col-span-4">
        <RenderControls
          values={controls}
          onChange={handleControlChange}
          validationError={tab.validationError}
          error={tab.error}
        />
      </aside>

      <section className="lg:col-span-8 flex flex-col">
        <UploadCanvas
          imagePreview={tab.imagePreview}
          onFile={tab.acceptImageFile}
          onRemove={tab.removeImage}
          onReset={tab.resetToOriginal}
          canReset={tab.canResetToOriginal}
          emptyHint="Drag & drop or choose a room photo to upload."
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
          disabled={!tab.imagePreview || tab.isGenerating.state}
        />
      </section>

      {tab.isGenerating.state && (
        <GeneratingOverlay message={tab.isGenerating.message} />
      )}
    </div>
  );
}

export function GeneratingOverlay({ message }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-xl p-4">
      <div className="bg-white/20 backdrop-blur-md rounded-lg p-8 flex flex-col items-center space-y-4 w-full max-w-[400px] border border-white/30 shadow-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
        <p className="text-lg text-center text-black">{message}</p>
        <p className="text-xs text-center text-gray-700">
          We verify your parameters were applied and retry automatically if
          needed — this can take a minute.
        </p>
      </div>
    </div>
  );
}
