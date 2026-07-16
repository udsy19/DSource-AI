"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSpec } from "@/contexts/SpecContext";
import {
  CREATIVITY_LEVELS,
  ROOM_TYPES,
  SPACE_KIND_LABELS,
} from "@/utils/visualizer/params";
import ActionBar, { CREATIVITY_LABELS } from "./ActionBar";
import Depth3DViewer from "./Depth3DViewer";
import HistoryStrip from "./HistoryStrip";
import HotspotOverlay from "./HotspotOverlay";
import MatchResultsModal from "./MatchResultsModal";
import MaterialsPanel from "./MaterialsPanel";
import NoticesBox from "./NoticesBox";
import PanoViewer from "./PanoViewer";
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

// Refresh guard: the working brief survives a reload via sessionStorage.
// Image data URIs are far too big for it — only the stored base path and the
// active version id are kept, and the canvas comes back from server history.
const SESSION_STORAGE_KEY = "viz-session-render";

/**
 * @param {object|null} restore  Full render row from GET /api/renders/[id]
 *   (deep link ?render=<id>) — restored into the session once loaded.
 * @param {string|null} restoreId  The raw ?render param; its presence
 *   disables the sessionStorage rehydrate so the deep link wins.
 */
export default function RenderTab({ restore = null, restoreId = null }) {
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
    referenceImage: null,
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
  // Folio this restored session is filed under (null for unfiled sessions).
  // Spec additions carry it so they land in the folio's own spec bucket.
  const folioId = tab.restoredSession?.projectId ?? null;
  const [folioName, setFolioName] = useState(null);
  const folioNameCacheRef = useRef(new Map());
  const [designMaterials, setDesignMaterials] = useState([]);
  // Materials rebuilt from a restored render's layer graph. Layers store only
  // {id, name, label, price} — no image/link — so these render as quiet
  // "restored" chips rather than full MaterialsPanel rows.
  const [restoredMaterials, setRestoredMaterials] = useState([]);

  // --- 3D parallax view + layer graph for this design session ---
  const [depthView, setDepthView] = useState(null); // {image, depth}
  const [loading3D, setLoading3D] = useState(false);
  const [panoView, setPanoView] = useState(null); // {pano}
  const [loadingPano, setLoadingPano] = useState(false);
  const [editsLog, setEditsLog] = useState([]); // {kind, summary, at}

  // Hotspots belong to a specific image. Detection is expensive (a Gemini
  // vision call), so results are cached per image for the session — coming
  // back to an already-scanned version restores its dots instantly.
  const detectionCacheRef = useRef(new Map());
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on image change only
  useEffect(() => {
    setComponents(detectionCacheRef.current.get(tab.imagePreview) ?? []);
    setFindError(null);
    setSearchingLabel(null);
    setSearchStage(null);
  }, [tab.imagePreview]);

  // Pinned materials belong to the design session — reset on a new photo,
  // not on every chained edit of the same base.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on base-photo change only
  useEffect(() => {
    setDesignMaterials([]);
    setRestoredMaterials([]);
    setEditsLog([]);
  }, [tab.originalUpload]);

  // Session restore: whenever a render is restored (history click, deep
  // link, refresh guard), rebuild THIS tab's working state from that row.
  // Declared after the reset effects above so its seeding wins the commit —
  // and switching between history items swaps state instead of accumulating.
  useEffect(() => {
    const restored = tab.restoredSession;
    if (!restored) return;

    const layers = restored.layers ?? null;
    setEditsLog(Array.isArray(layers?.edits) ? layers.edits : []);
    setComponents(Array.isArray(layers?.components) ? layers.components : []);
    setRestoredMaterials(
      Array.isArray(layers?.materials) ? layers.materials : [],
    );
    setDesignMaterials([]);

    if (restored.keepControls) return;
    const params = restored.params ?? null;
    setControls((prev) => ({
      ...prev,
      ...(params
        ? {
            spaceKind: params.spaceKind ?? "interior",
            roomType: params.roomType ?? null,
            style: params.style ?? null,
            lighting: params.lighting ?? null,
            colorPalette: params.colorPalette ?? null,
            flooring: params.flooring ?? null,
            wallFinish: params.wallFinish ?? null,
            furnitureDensity: params.furnitureDensity ?? null,
          }
        : {}),
      prompt: restored.prompt ?? "",
      referenceImage: null,
    }));
    const creativity = CREATIVITY_LEVELS.indexOf(params?.creativity);
    if (creativity >= 0) setCreativityIndex(creativity);
  }, [tab.restoredSession]);

  // Resolve the folio's name (once per folio, cached for the tab) so spec
  // buckets adopt it. A miss is fine — the bucket keeps a default name.
  useEffect(() => {
    if (!folioId) {
      setFolioName(null);
      return;
    }
    const cached = folioNameCacheRef.current.get(folioId);
    if (cached !== undefined) {
      setFolioName(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) return;
        const data = await res.json();
        const name =
          (data.projects ?? []).find((p) => p.id === folioId)?.name ?? null;
        folioNameCacheRef.current.set(folioId, name);
        if (!cancelled) setFolioName(name);
      } catch {
        // Name lookup is a nicety — spec filing works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [folioId]);

  // Deep link (?render=<id>): restore the fetched row once it arrives.
  const deepLinkAppliedRef = useRef(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: restoreSession is stable (useCallback)
  useEffect(() => {
    if (!restore || deepLinkAppliedRef.current === restore.id) return;
    deepLinkAppliedRef.current = restore.id;
    tab.restoreSession(restore);
  }, [restore]);

  // Refresh guard, part 1 — rehydrate the brief from sessionStorage on
  // mount (skipped when a deep link owns this visit).
  const rehydratedRef = useRef(false);
  const pendingHistoryIdRef = useRef(null);
  useEffect(() => {
    if (restoreId || rehydratedRef.current) return;
    rehydratedRef.current = true;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "null",
      );
      if (!saved) return;
      if (saved.controls && typeof saved.controls === "object") {
        setControls((prev) => ({
          ...prev,
          ...saved.controls,
          // Reference data URIs are never stored — only their absence flag.
          referenceImage: null,
        }));
      }
      if (
        Number.isInteger(saved.creativityIndex) &&
        saved.creativityIndex >= 0 &&
        saved.creativityIndex < CREATIVITY_LEVELS.length
      ) {
        setCreativityIndex(saved.creativityIndex);
      }
      if (typeof saved.activeHistoryId === "string") {
        pendingHistoryIdRef.current = saved.activeHistoryId;
      }
    } catch {
      // A malformed draft never blocks the tab.
    }
  }, [restoreId]);

  // Refresh guard, part 2 — once server history arrives, put the last
  // active version back on the canvas, keeping the rehydrated controls.
  // biome-ignore lint/correctness/useExhaustiveDependencies: guarded by pendingHistoryIdRef
  useEffect(() => {
    const pendingId = pendingHistoryIdRef.current;
    if (!pendingId) return;
    const item = tab.historyItems.find((i) => i.id === pendingId);
    if (!item) return;
    pendingHistoryIdRef.current = null;
    tab.restoreSession(item, { keepControls: true });
  }, [tab.historyItems]);

  // Refresh guard, part 3 — debounce-save the brief per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            controls: { ...controls, referenceImage: null },
            referenceAttached: Boolean(controls.referenceImage),
            creativityIndex,
            activeHistoryId: tab.activeHistoryId,
            baseImagePath: tab.baseImagePath,
          }),
        );
      } catch {
        // Quota/private-mode failures are fine — the guard is best-effort.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [controls, creativityIndex, tab.activeHistoryId, tab.baseImagePath]);

  /**
   * Serializable layer graph for this design session (base -> edits ->
   * components -> materials). Sent with each generate so persistence keeps
   * the design's construction history — future 3D/history features render
   * from this data. Server-side sanitizeLayers enforces caps.
   */
  const buildLayers = (nextEdit) => {
    const edits = [...editsLog, ...(nextEdit ? [nextEdit] : [])];
    return {
      version: 1,
      editCount: edits.length,
      edits: edits.slice(-20),
      components: components.map((c) => ({
        label: c.label,
        category: c.category,
        box_2d: c.box_2d,
      })),
      // Restored materials chain through so an edit on a reopened session
      // keeps the design's full bill of materials.
      materials: [...restoredMaterials, ...designMaterials].map((m) => ({
        id: String(m.id),
        name: m.name,
        label: m.label,
        price: typeof m.price === "number" ? m.price : null,
      })),
    };
  };

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
    const edit = {
      kind: "render",
      summary:
        controls.prompt.trim() ||
        [controls.style, controls.lighting, controls.colorPalette]
          .filter(Boolean)
          .join(", ") ||
        "parameter render",
      at: new Date().toISOString(),
    };
    setEditsLog((prev) => [...prev, edit]);
    tab.generate({
      message: "Rendering the room you briefed…",
      promptForHistory: controls.prompt.trim() || null,
      body: {
        image: tab.imagePreview,
        prompt: controls.prompt.trim() || undefined,
        referenceImage: controls.referenceImage || undefined,
        variedSeed: controls.variedSeed,
        layers: buildLayers(edit),
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

  // Persisted renders are re-signed server-side by id — signed URLs in the
  // history list expire after an hour, which broke detect/search on old
  // sessions ("Could not detect components").
  const activeRenderId =
    tab.historyItems.find((i) => i.id === tab.activeHistoryId && i.persisted)
      ?.id ??
    tab.restoredSession?.id ??
    null;

  const handleDetect = async () => {
    if (!tab.imagePreview || detecting) return;
    setDetecting(true);
    setFindError(null);
    try {
      const res = await fetch("/api/detect-components", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: tab.imagePreview,
          renderId: activeRenderId ?? undefined,
        }),
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
      detectionCacheRef.current.set(tab.imagePreview, data.components);
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
          renderId: activeRenderId ?? undefined,
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

  // Restored folio sessions file spec additions into the folio's bucket;
  // unfiled sessions pass no options and land in the active bucket as before.
  const specFolioOptions = () =>
    folioId ? { projectId: folioId, projectName: folioName ?? undefined } : {};

  const handleAddToSpec = (match) => {
    addProductToSpec(
      specProductFromMatch(match),
      matchResult?.label || match.category || "Uncategorized",
      specFolioOptions(),
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
    const edit = {
      kind: "swap",
      summary: `Swapped in: ${match.name}`.slice(0, 160),
      at: new Date().toISOString(),
    };
    setEditsLog((prev) => [...prev, edit]);
    tab.generate({
      message: `Placing “${match.name}” into your render...`,
      promptForHistory: `Swapped in: ${match.name}`,
      body: {
        image: tab.imagePreview,
        swap: { productId, label: componentLabel, box: swapBox },
        params: {},
        layers: buildLayers(edit),
      },
    });
  };

  /** Compute a depth map for the current image and open the 3D parallax view. */
  const handleView3D = async () => {
    if (!tab.imagePreview || loading3D) return;
    setLoading3D(true);
    setFindError(null);
    try {
      const res = await fetch("/api/depth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: tab.imagePreview }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFindError(data.error || "Could not build the 3D view.");
        return;
      }
      setDepthView({ image: tab.imagePreview, depth: data.depth });
    } catch {
      setFindError("Could not build the 3D view. Please try again.");
    } finally {
      setLoading3D(false);
    }
  };

  /** Expand the current image into a panorama and open the 360° view. */
  const handleView360 = async () => {
    if (!tab.imagePreview || loadingPano) return;
    setLoadingPano(true);
    setFindError(null);
    try {
      const res = await fetch("/api/pano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: tab.imagePreview }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFindError(data.error || "Could not build the 360° view.");
        return;
      }
      setPanoView({ pano: data.pano });
    } catch {
      setFindError("Could not build the 360° view. Please try again.");
    } finally {
      setLoadingPano(false);
    }
  };

  const handleAddAllToSpec = () => {
    for (const material of designMaterials) {
      addProductToSpec(
        specProductFromMatch(material.match),
        material.label || material.match?.category || "Uncategorized",
        specFolioOptions(),
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

        {/* Materials restored from a saved session. Layers persist only
            id/name/label/price — no image or link — so these stay quiet
            chips instead of full panel rows. */}
        {restoredMaterials.length > 0 && (
          <div className="mt-3 rounded-xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="viz-label">
                Materials in this design · {restoredMaterials.length}
              </p>
              <p className="viz-mono text-[10px] tracking-[0.08em] text-[var(--viz-muted)] uppercase">
                Restored
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {restoredMaterials.map((m) => (
                <span
                  key={`${m.id}-${m.label}`}
                  className="viz-mono rounded-full border border-[var(--viz-line)] bg-white px-3 py-1 text-[11px]"
                >
                  {[
                    m.name || m.label || m.id,
                    typeof m.price === "number"
                      ? `₹${m.price.toLocaleString("en-IN")}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Restored sessions filed into a folio keep a quiet way back. */}
        {folioId && (
          <p className="viz-mono mt-3 text-[11px] text-[var(--viz-muted)]">
            Restored session —{" "}
            <Link
              href={`/folios/${folioId}`}
              className="underline hover:text-[var(--viz-ink)]"
            >
              open its folio{folioName ? ` “${folioName}”` : ""} →
            </Link>
          </p>
        )}

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
            <button
              type="button"
              onClick={handleView3D}
              disabled={loading3D || Boolean(searchingLabel)}
              className={`rounded-lg border border-[var(--viz-ink)] px-4 py-2 text-sm font-medium ${
                loading3D
                  ? "cursor-wait opacity-50"
                  : "cursor-pointer hover:bg-[var(--viz-ink)] hover:text-[var(--viz-paper)]"
              }`}
            >
              {loading3D ? "Building 3D view..." : "View in 3D"}
            </button>
            <button
              type="button"
              onClick={handleView360}
              disabled={loadingPano || Boolean(searchingLabel)}
              className={`rounded-lg border border-[var(--viz-ink)] px-4 py-2 text-sm font-medium ${
                loadingPano
                  ? "cursor-wait opacity-50"
                  : "cursor-pointer hover:bg-[var(--viz-ink)] hover:text-[var(--viz-paper)]"
              }`}
            >
              {loadingPano ? "Building 360° view..." : "View 360°"}
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
          onUpdate={tab.handleHistoryUpdate}
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

      {depthView && (
        <Depth3DViewer
          image={depthView.image}
          depth={depthView.depth}
          onClose={() => setDepthView(null)}
        />
      )}

      {panoView && (
        <PanoViewer pano={panoView.pano} onClose={() => setPanoView(null)} />
      )}

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
