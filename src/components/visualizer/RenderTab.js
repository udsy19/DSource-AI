"use client";

import { useEffect, useState } from "react";
import { useSpec } from "@/contexts/SpecContext";
import {
  CREATIVITY_LEVELS,
  ROOM_TYPES,
  SPACE_KIND_LABELS,
} from "@/utils/visualizer/params";
import ActionBar, { CREATIVITY_LABELS } from "./ActionBar";
import HistoryStrip from "./HistoryStrip";
import HotspotOverlay from "./HotspotOverlay";
import MatchResultsModal from "./MatchResultsModal";
import MaterialsPanel from "./MaterialsPanel";
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
    flooring: null,
    wallFinish: null,
    furnitureDensity: null,
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

  // --- Materials pinned to this design (via Add-to-Spec / Swap) ---
  const { addProductToSpec } = useSpec();
  const [designMaterials, setDesignMaterials] = useState([]);

  // Hotspots belong to a specific image — clear them whenever it changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on image change only
  useEffect(() => {
    setComponents([]);
    setFindError(null);
    setSearchingLabel(null);
    setSearchStage(null);
  }, [tab.imagePreview]);

  // Pinned materials belong to the design session — reset on a new photo,
  // not on every chained edit of the same base.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on base-photo change only
  useEffect(() => {
    setDesignMaterials([]);
  }, [tab.originalUpload]);

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
      message: "Rendering the room you briefed…",
      promptForHistory: controls.prompt.trim() || null,
      body: {
        image: tab.imagePreview,
        prompt: controls.prompt.trim() || undefined,
        variedSeed: controls.variedSeed,
        params: {
          spaceKind: controls.spaceKind,
          roomType: controls.roomType,
          style: controls.style,
          lighting: controls.lighting,
          colorPalette: controls.colorPalette,
          flooring: controls.flooring,
          wallFinish: controls.wallFinish,
          furnitureDensity: controls.furnitureDensity,
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
        resultId: Date.now(),
        label: label || "Selected area",
        box: box_2d,
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

  // --- Pin / spec / swap actions from the match modal ---
  const pinMaterial = (match, componentLabel) => {
    setDesignMaterials((prev) =>
      prev.some((m) => m.id === match.id)
        ? prev
        : [
            ...prev,
            {
              key: `${match.id}-${componentLabel ?? ""}`,
              id: match.id,
              name: match.name,
              brand: match.brand,
              price: match.price ?? null,
              imageUrl: match.imageUrl,
              label: componentLabel,
              link: match.link ?? null,
              match,
            },
          ],
    );
  };

  const specProductFromMatch = (match) => ({
    title: match.name,
    brand: match.brand,
    material: match.category,
    finish: match.finish || "N/A",
    dimensions: match.size || 'W: N/A" H: N/A"',
    color: match.color || match.finish || "N/A",
    price: typeof match.price === "number" ? match.price : 0,
    image: match.imageUrl,
    link: match.link || "/marketplace",
  });

  const handleAddToSpec = (match) => {
    addProductToSpec(
      specProductFromMatch(match),
      matchResult?.label || match.category || "Uncategorized",
    );
    pinMaterial(match, matchResult?.label ?? null);
  };

  const handleSwap = (match) => {
    const productId = Number(String(match.id).replace(/^mb-/, ""));
    if (!Number.isFinite(productId)) return;
    pinMaterial(match, matchResult?.label ?? null);
    const swapBox = matchResult?.box ?? null;
    const componentLabel = matchResult?.label ?? null;
    setMatchResult(null);
    tab.generate({
      message: `Placing “${match.name}” into your render...`,
      promptForHistory: `Swapped in: ${match.name}`,
      body: {
        image: tab.imagePreview,
        swap: { productId, label: componentLabel, box: swapBox },
        params: {},
      },
    });
  };

  const handleAddAllToSpec = () => {
    for (const material of designMaterials) {
      addProductToSpec(
        specProductFromMatch(material.match),
        material.label || material.match?.category || "Uncategorized",
      );
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
          originalImage={tab.originalUpload}
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
          verified={tab.isVerified}
          cells={[
            {
              label: "Space",
              value: controls.roomType ?? SPACE_KIND_LABELS[controls.spaceKind],
            },
            { label: "Style", value: controls.style },
            { label: "Light", value: controls.lighting },
            { label: "Palette", value: controls.colorPalette },
            { label: "Mode", value: CREATIVITY_LABELS[creativityIndex] },
          ]}
        />

        <MaterialsPanel
          materials={designMaterials}
          onRemove={(material) =>
            setDesignMaterials((prev) =>
              prev.filter((m) => m.key !== material.key),
            )
          }
          onAddAllToSpec={handleAddAllToSpec}
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
              <p className="viz-label">Matching “{searchingLabel}”</p>
              <p className="viz-mono text-[11px] text-[var(--viz-muted)]">
                step {Math.max(stageIndex, 0) + 1}/{SEARCH_STAGES.length}
              </p>
            </div>
            <div className="mt-2 flex gap-1.5">
              {SEARCH_STAGES.map((stage, i) => (
                <div key={stage.key} className="flex-1">
                  {/* Track is overflow-hidden; viz-scan sweeps an inner sliver. */}
                  <div
                    className={`h-1.5 overflow-hidden rounded-full ${
                      i < stageIndex
                        ? "bg-[var(--viz-blue)]"
                        : "bg-[var(--viz-ground)]"
                    }`}
                  >
                    {i === stageIndex && (
                      <div className="viz-scan h-full w-1/3 rounded-full bg-[var(--viz-blue)]" />
                    )}
                  </div>
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
        key={matchResult?.resultId ?? "none"}
        result={matchResult}
        onClose={() => setMatchResult(null)}
        onAddToSpec={handleAddToSpec}
        onSwap={handleSwap}
      />

      {tab.isGenerating.state && (
        <GeneratingOverlay message={tab.isGenerating.message} />
      )}
    </div>
  );
}

export function GeneratingOverlay({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2a261e]/60 p-4 pb-10 backdrop-blur-sm sm:items-center sm:pb-4">
      <div className="w-full max-w-xl rounded-xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-6 shadow-2xl">
        <div className="flex items-baseline justify-between gap-4">
          <p className="viz-label">In the studio</p>
          <p className="viz-mono text-[11px] tracking-widest text-[var(--viz-muted)] uppercase">
            Sheet in progress
          </p>
        </div>
        <p className="viz-serif mt-3 text-xl italic sm:text-2xl">{message}</p>
        {/* The plotter draws along the rule */}
        <div className="mt-5 h-[3px] overflow-hidden rounded-full bg-[var(--viz-line)]/50">
          <div className="viz-scan h-full w-1/4 rounded-full bg-[var(--viz-blue)]" />
        </div>
        <p className="mt-3 max-w-md text-xs text-[var(--viz-muted)]">
          We compare the result against your brief and quietly retry if it
          drifts — this can take a minute. Your original photo is untouched.
        </p>
      </div>
    </div>
  );
}
