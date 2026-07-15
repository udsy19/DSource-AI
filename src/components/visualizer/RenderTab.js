"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MODEL } from "@/utils/replicate-models";
import { CREATIVITY_LEVELS, ROOM_TYPES } from "@/utils/visualizer/params";
import ActionBar from "./ActionBar";
import HistoryStrip from "./HistoryStrip";
import HotspotOverlay from "./HotspotOverlay";
import MatchResultsModal from "./MatchResultsModal";
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

  // --- Reverse material search (detect components -> click -> matches) ---
  const [components, setComponents] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [searchingLabel, setSearchingLabel] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [findError, setFindError] = useState(null);

  // Hotspots belong to a specific image — clear them whenever it changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on image change only
  useEffect(() => {
    setComponents([]);
    setFindError(null);
    setSearchingLabel(null);
  }, [tab.imagePreview]);

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

  const handleDetect = async () => {
    if (!tab.imagePreview || detecting) return;
    setDetecting(true);
    setFindError(null);
    try {
      const res = await fetch("/api/detect-components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: tab.imagePreview }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFindError(data.error || "Could not detect components.");
        return;
      }
      if (!data.components.length) {
        setFindError("No shoppable components detected in this image.");
        return;
      }
      setComponents(data.components);
    } catch {
      setFindError("Could not detect components. Please try again.");
    } finally {
      setDetecting(false);
    }
  };

  const handleHotspotPick = async (component) => {
    if (searchingLabel) return;
    setSearchingLabel(component.label);
    setFindError(null);
    try {
      const res = await fetch("/api/reverse-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: tab.imagePreview,
          box: component.box_2d,
          label: component.label,
          category: component.category,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFindError(data.error || "Reverse search failed.");
        return;
      }
      setMatchResult({
        label: component.label,
        matches: data.matches ?? [],
        croppedImage: data.croppedImage ?? null,
        reranked: Boolean(data.reranked),
        rerankReason: data.rerankReason ?? null,
        notice: data.notice ?? null,
        searchQuery: data.searchQuery ?? null,
      });
    } catch {
      setFindError("Reverse search failed. Please try again.");
    } finally {
      setSearchingLabel(null);
    }
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
          overlay={
            components.length > 0
              ? <HotspotOverlay
                  components={components}
                  searchingLabel={searchingLabel}
                  onPick={handleHotspotPick}
                />
              : null
          }
        />

        {/* Reverse material search entry point */}
        {tab.imagePreview && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleDetect}
              disabled={detecting || Boolean(searchingLabel)}
              className={`text-sm font-semibold border-2 border-black rounded-full px-5 py-2 ${
                detecting
                  ? "opacity-50 cursor-wait"
                  : "hover:bg-black hover:text-white cursor-pointer"
              }`}
            >
              {detecting
                ? "Detecting components..."
                : components.length > 0
                  ? "↻ Re-detect materials"
                  : "🔍 Find materials in this image"}
            </button>
            {components.length > 0 && !searchingLabel && (
              <span className="text-xs text-gray-600">
                Click a dot to find the closest matches in your material bank.
              </span>
            )}
            {searchingLabel && (
              <span className="text-xs text-gray-600">
                Searching your material bank for “{searchingLabel}”...
              </span>
            )}
            {findError && (
              <span className="text-xs text-red-600">{findError}</span>
            )}
          </div>
        )}

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

      <MatchResultsModal
        result={matchResult}
        onClose={() => setMatchResult(null)}
      />

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
