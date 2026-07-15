"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MODEL } from "@/utils/replicate-models";
import {
  CREATIVITY_LEVELS,
  ROOM_TYPES,
  SPACE_KIND_LABELS,
} from "@/utils/visualizer/params";
import ActionBar, { CREATIVITY_LABELS } from "./ActionBar";
import HistoryStrip from "./HistoryStrip";
import HotspotOverlay from "./HotspotOverlay";
import MatchResultsModal from "./MatchResultsModal";
import NoticesBox from "./NoticesBox";
import RenderControls from "./RenderControls";
import TitleBlock from "./TitleBlock";
import UploadCanvas from "./UploadCanvas";
import { useVisualizerTab } from "./useVisualizerTab";

// Ordered stages of the reverse-search pipeline (streamed by the API).
const SEARCH_STAGES = [
  { key: "crop", label: "Crop region" },
  { key: "describe", label: "Identify item" },
  { key: "search", label: "Search catalog" },
  { key: "rerank", label: "Compare candidates" },
];

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

  // --- Reverse material search (detect -> click a dot or drag a box) ---
  const [components, setComponents] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [searchingLabel, setSearchingLabel] = useState(null);
  const [searchStage, setSearchStage] = useState(null); // key in SEARCH_STAGES
  const [matchResult, setMatchResult] = useState(null);
  const [findError, setFindError] = useState(null);

  // Hotspots belong to a specific image — clear them whenever it changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on image change only
  useEffect(() => {
    setComponents([]);
    setFindError(null);
    setSearchingLabel(null);
    setSearchStage(null);
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

  /**
   * Runs reverse search for a region — from a detected hotspot or a
   * hand-dragged box. Reads the API's NDJSON stream so the progress bar
   * reflects the real pipeline stage.
   */
  const handleSearchRegion = async ({ label, category, box_2d }) => {
    if (searchingLabel) return;
    setSearchingLabel(label || "selected area");
    setSearchStage("crop");
    setFindError(null);
    try {
      const res = await fetch("/api/reverse-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: tab.imagePreview,
          box: box_2d,
          label,
          category,
        }),
      });

      // Validation/auth failures come back as plain JSON with an error status.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFindError(data.error || "Reverse search failed.");
        return;
      }

      // Success path is an NDJSON stream: stage events, then the final payload.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let final = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.done) {
              final = event;
            } else if (event.stage) {
              setSearchStage(event.stage);
            }
          } catch {
            // Ignore malformed lines; the final payload is what matters.
          }
        }
      }
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.done) final = event;
        } catch {
          // Trailing partial line — ignore.
        }
      }

      if (!final || !final.success) {
        setFindError(final?.error || "Reverse search failed.");
        return;
      }
      setMatchResult({
        label: label || "Selected area",
        matches: final.matches ?? [],
        croppedImage: final.croppedImage ?? null,
        notice: final.notice ?? null,
        searchQuery: final.searchQuery ?? null,
      });
    } catch {
      setFindError("Reverse search failed. Please try again.");
    } finally {
      setSearchingLabel(null);
      setSearchStage(null);
    }
  };

  const stageIndex = SEARCH_STAGES.findIndex((s) => s.key === searchStage);

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
          onRegionSelect={
            searchingLabel
              ? null
              : (box) =>
                  handleSearchRegion({
                    label: null,
                    category: null,
                    box_2d: box,
                  })
          }
          overlay={
            components.length > 0
              ? <HotspotOverlay
                  components={components}
                  searchingLabel={searchingLabel}
                  onPick={handleSearchRegion}
                />
              : null
          }
        />

        <TitleBlock
          sheet="A-01"
          rev={tab.historyItems.length}
          cells={[
            { label: "Kind", value: SPACE_KIND_LABELS[controls.spaceKind] },
            { label: "Space", value: controls.roomType },
            { label: "Style", value: controls.style },
            { label: "Light", value: controls.lighting },
            { label: "Palette", value: controls.colorPalette },
            { label: "Mode", value: CREATIVITY_LABELS[creativityIndex] },
          ]}
        />

        {/* Reverse material search entry point */}
        {tab.imagePreview && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDetect}
              disabled={detecting || Boolean(searchingLabel)}
              className={`rounded-lg border border-[var(--viz-ink)] px-4 py-2 text-sm font-medium ${
                detecting
                  ? "cursor-wait opacity-50"
                  : "cursor-pointer hover:bg-[var(--viz-ink)] hover:text-[var(--viz-paper)]"
              }`}
            >
              {detecting
                ? "Detecting components..."
                : components.length > 0
                  ? "Re-detect materials"
                  : "Find materials in this image"}
            </button>
            {!searchingLabel && (
              <span className="text-xs text-[var(--viz-muted)]">
                {components.length > 0
                  ? "Click a dot — or drag a box on the image for a precise area."
                  : "Or drag a box directly on the image to search that area."}
              </span>
            )}
            {findError && (
              <span className="text-xs text-red-700">{findError}</span>
            )}
          </div>
        )}

        {/* Live pipeline progress (stages streamed from the API) */}
        {searchingLabel && (
          <div className="mt-3 rounded-xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-3">
            <div className="flex items-center justify-between">
              <p className="viz-label">
                Matching “{searchingLabel}”
              </p>
              <p className="viz-mono text-[11px] text-[var(--viz-muted)]">
                step {Math.max(stageIndex, 0) + 1}/{SEARCH_STAGES.length}
              </p>
            </div>
            <div className="mt-2 flex gap-1.5">
              {SEARCH_STAGES.map((stage, i) => (
                <div key={stage.key} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full ${
                      i < stageIndex
                        ? "bg-[var(--viz-blue)]"
                        : i === stageIndex
                          ? "viz-scan bg-[var(--viz-blue)]/70"
                          : "bg-[var(--viz-ground)]"
                    }`}
                  />
                  <p
                    className={`viz-mono mt-1 text-[10px] ${
                      i === stageIndex
                        ? "text-[var(--viz-blue)]"
                        : i < stageIndex
                          ? "text-[var(--viz-ink)]"
                          : "text-[var(--viz-muted)]"
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>
              ))}
            </div>
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
          actionLabel="Generate render"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#262521]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-6 text-center shadow-2xl">
        <p className="viz-label">Plotting</p>
        <p className="mt-2 text-base">{message}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--viz-ground)]">
          <div className="viz-scan h-full w-1/4 rounded-full bg-[var(--viz-blue)]" />
        </div>
        <p className="mt-3 text-xs text-[var(--viz-muted)]">
          We check that your parameters were applied and retry automatically if
          needed — this can take a minute.
        </p>
      </div>
    </div>
  );
}
