"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  flaggedRefs,
  geometryBounds,
  isFlagged,
  kindKey,
  snapToGrid,
  stripIds,
  USER_CONFIRMED,
  wallLengthPatch,
  withIds,
} from "@/components/cad-studio/geometry-utils";
import LeftPanel from "@/components/cad-studio/LeftPanel";
import PropertiesPanel from "@/components/cad-studio/PropertiesPanel";
import StudioCanvas from "@/components/cad-studio/StudioCanvas";

const VALID_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const HISTORY_CAP = 50;
const REVIEW_KINDS = new Set(["wall", "opening", "fixture"]);

const CadStudioPage = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [draftGeometry, setDraftGeometry] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [selection, setSelection] = useState(null);
  const [viewMode, setViewMode] = useState("floor");
  const [busy, setBusy] = useState({ state: false, message: "" });
  const [error, setError] = useState(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [editInfo, setEditInfo] = useState(null);
  const [scaleError, setScaleError] = useState(null);
  const [needsReview, setNeedsReview] = useState(false);
  const [history, setHistory] = useState({ past: [], future: [] });
  const [lastWallDrag, setLastWallDrag] = useState(null);
  const [reconcileInfo, setReconcileInfo] = useState(null);

  // Mirror of draftGeometry so history snapshots can be taken without adding
  // the draft itself as a dependency of every commit callback.
  const draftRef = useRef(null);
  // The draft as adopted from the server: landing here via undo/redo means
  // the drawing is no longer dirty.
  const initialDraftRef = useRef(null);

  useEffect(() => {
    draftRef.current = draftGeometry;
  }, [draftGeometry]);

  const mmPerUnit = result?.scale?.mmPerUnit ?? null;
  const effectiveMm =
    Number.isFinite(mmPerUnit) && mmPerUnit > 0 ? mmPerUnit : 1;

  const flagged = useMemo(() => flaggedRefs(draftGeometry), [draftGeometry]);
  const reviewing = needsReview && flagged.length > 0;

  const postCadConvert = async (body, failText) => {
    try {
      const response = await fetch("/api/cad-convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || failText);
        return null;
      }
      return data;
    } catch (err) {
      console.error("Error calling CAD converter:", err);
      setError(failText);
      return null;
    }
  };

  const resetDraftFrom = (geometry) => {
    const draft = withIds(geometry);
    setDraftGeometry(draft);
    draftRef.current = draft;
    initialDraftRef.current = draft;
    setHistory({ past: [], future: [] });
    setDirty(false);
    setSelection(null);
    setLastWallDrag(null);
  };

  const adoptResult = (data, { review = false } = {}) => {
    setResult(data);
    resetDraftFrom(data.geometry);
    setReconcileInfo(null);
    setNeedsReview(review && flaggedRefs(data.geometry).length > 0);
  };

  // One history entry per committed change; pointer drags pass
  // { history: false } per frame and commit their pre-drag snapshot on
  // pointer-up via pushHistory.
  const pushHistory = useCallback((snapshot) => {
    if (!snapshot) return;
    setHistory((h) => ({
      past: [...h.past, snapshot].slice(-HISTORY_CAP),
      future: [],
    }));
  }, []);

  const updateGeometry = useCallback(
    (updater, options) => {
      if (options?.history !== false) pushHistory(draftRef.current);
      setDraftGeometry((prev) => (prev ? updater(prev) : prev));
      setDirty(true);
    },
    [pushHistory],
  );

  const restoreSnapshot = useCallback((target) => {
    setDraftGeometry(target);
    draftRef.current = target;
    setSelection(null);
    setDirty(target !== initialDraftRef.current);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.past.length === 0 || !draftGeometry) return;
    const target = history.past[history.past.length - 1];
    setHistory({
      past: history.past.slice(0, -1),
      future: [draftGeometry, ...history.future].slice(0, HISTORY_CAP),
    });
    restoreSnapshot(target);
  }, [history, draftGeometry, restoreSnapshot]);

  const handleRedo = useCallback(() => {
    if (history.future.length === 0 || !draftGeometry) return;
    const [target, ...future] = history.future;
    setHistory({
      past: [...history.past, draftGeometry].slice(-HISTORY_CAP),
      future,
    });
    restoreSnapshot(target);
  }, [history, draftGeometry, restoreSnapshot]);

  const handleFileSelected = (file) => {
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      setError("Please upload a valid image file (JPG, PNG, WEBP, or SVG).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("File size must be less than 10MB.");
      return;
    }
    setError(null);
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedFile(null);
    setImagePreview(null);
    setResult(null);
    setDraftGeometry(null);
    draftRef.current = null;
    initialDraftRef.current = null;
    setHistory({ past: [], future: [] });
    setDirty(false);
    setSelection(null);
    setError(null);
    setSuggestions([]);
    setEditInfo(null);
    setScaleError(null);
    setNeedsReview(false);
    setLastWallDrag(null);
    setReconcileInfo(null);
  };

  const handleConvert = async () => {
    if (!imagePreview) {
      setError("Please upload a floor plan image first.");
      return;
    }
    if (uploadedFile?.type === "image/svg+xml") {
      setError(
        "SVG files can't be analyzed for CAD conversion. Please upload the plan as a JPG or PNG.",
      );
      return;
    }
    setError(null);
    setSuggestions([]);
    setEditInfo(null);
    setScaleError(null);
    setBusy({
      state: true,
      message: "Analyzing floor plan and extracting wall geometry...",
    });
    const data = await postCadConvert(
      { image: imagePreview },
      "An error occurred while converting the image. Please try again.",
    );
    // Fresh conversions (and only those) enter review mode.
    if (data) adoptResult(data, { review: true });
    setBusy({ state: false, message: "" });
  };

  const handleSuggest = async () => {
    if (!result || !draftGeometry) return;
    setError(null);
    setBusy({ state: true, message: "Generating edit suggestions..." });
    const data = await postCadConvert(
      { geometry: stripIds(draftGeometry), mmPerUnit, suggest: true },
      "An error occurred while fetching suggestions. Please try again.",
    );
    if (data)
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    setBusy({ state: false, message: "" });
  };

  const handleApplyEdit = async () => {
    const prompt = editPrompt.trim();
    if (!result || !draftGeometry || prompt === "") return;
    setError(null);
    setEditInfo(null);
    setBusy({ state: true, message: "Applying edit with AI..." });
    const data = await postCadConvert(
      { geometry: stripIds(draftGeometry), mmPerUnit, editPrompt: prompt },
      "An error occurred while applying the edit. Please try again.",
    );
    if (data) {
      adoptResult(data);
      const applied = data.editApplied !== false;
      setEditInfo({
        applied,
        text:
          data.editSummary ||
          (applied ? "Edit applied." : "The edit could not be applied."),
      });
    }
    setBusy({ state: false, message: "" });
  };

  const handleRerender = async () => {
    if (!result || !draftGeometry) return;
    setError(null);
    setBusy({ state: true, message: "Re-rendering drawing..." });
    const data = await postCadConvert(
      { geometry: stripIds(draftGeometry), mmPerUnit },
      "An error occurred while re-rendering the drawing. Please try again.",
    );
    if (data) adoptResult(data);
    setBusy({ state: false, message: "" });
  };

  const handleDiscard = () => {
    if (!result) return;
    resetDraftFrom(result.geometry);
  };

  const rescaleTo = async (newMmPerUnit) => {
    if (!draftGeometry) return;
    setError(null);
    setBusy({ state: true, message: "Re-scaling drawing..." });
    const data = await postCadConvert(
      { geometry: stripIds(draftGeometry), mmPerUnit: newMmPerUnit },
      "An error occurred while re-scaling the drawing. Please try again.",
    );
    if (data) adoptResult(data);
    setBusy({ state: false, message: "" });
  };

  const handleApplyScale = async (enteredWidthMm) => {
    if (!result?.scale || !result?.planSizeMm || !draftGeometry) return;
    if (
      !Number.isFinite(enteredWidthMm) ||
      enteredWidthMm < 500 ||
      enteredWidthMm > 200000
    ) {
      setScaleError("Enter a plan width between 500 and 200,000 mm.");
      return;
    }
    setScaleError(null);
    await rescaleTo(
      result.scale.mmPerUnit * (enteredWidthMm / result.planSizeMm.width),
    );
  };

  // Two-click calibration: the canvas measured A→B in units, the user typed
  // the real distance; the canvas hands us the resulting mm-per-unit.
  const handleCalibrate = async (newMmPerUnit) => {
    if (!Number.isFinite(newMmPerUnit) || newMmPerUnit <= 0) return;
    await rescaleTo(newMmPerUnit);
  };

  const handleReconcile = async () => {
    if (!result || !draftGeometry) return;
    setError(null);
    setReconcileInfo(null);
    setBusy({ state: true, message: "Reconciling to written dimensions..." });
    const data = await postCadConvert(
      { geometry: stripIds(draftGeometry), mmPerUnit, reconcile: true },
      "An error occurred while reconciling to dimensions. Please try again.",
    );
    if (data) {
      adoptResult(data);
      const info = data.reconcile;
      setReconcileInfo({
        summary: info
          ? `Adjusted ${info.adjusted ?? 0} walls · ${
              info.satisfied ?? 0
            } dimensions satisfied`
          : "Reconciled to written dimensions.",
        conflicting: Array.isArray(info?.conflicting) ? info.conflicting : [],
      });
    }
    setBusy({ state: false, message: "" });
  };

  const handlePlaceAsset = (symbolId, point) => {
    if (!draftGeometry) return;
    const bounds = geometryBounds(draftGeometry);
    const center = point || {
      x: bounds ? (bounds.minX + bounds.maxX) / 2 : 500,
      y: bounds ? (bounds.minY + bounds.maxY) / 2 : 500,
    };
    const asset = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      symbol: symbolId,
      x: snapToGrid(center.x),
      y: snapToGrid(center.y),
      w: null,
      h: null,
      rotation: 0,
    };
    const nextIndex = draftGeometry.assets?.length || 0;
    updateGeometry((prev) => ({
      ...prev,
      assets: [...(prev.assets || []), asset],
    }));
    setSelection({ kind: "asset", index: nextIndex });
  };

  const handleDeleteSelected = useCallback(() => {
    if (!selection || selection.kind === "room") return;
    const key = kindKey(selection.kind);
    const { index } = selection;
    updateGeometry((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== index),
    }));
    setSelection(null);
  }, [selection, updateGeometry]);

  // --- Review pass -----------------------------------------------------------

  const findNextFlagged = useCallback(
    (afterSelection) => {
      if (flagged.length === 0) return null;
      const pos = afterSelection
        ? flagged.findIndex(
            (ref) =>
              ref.kind === afterSelection.kind &&
              ref.index === afterSelection.index,
          )
        : -1;
      const ordered =
        pos >= 0
          ? [...flagged.slice(pos + 1), ...flagged.slice(0, pos)]
          : flagged;
      return ordered.length > 0 ? ordered[0] : null;
    },
    [flagged],
  );

  const handleKeepSelected = useCallback(() => {
    if (!selection || !REVIEW_KINDS.has(selection.kind)) return;
    const key = kindKey(selection.kind);
    const { index } = selection;
    updateGeometry((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((item, i) =>
        i === index ? { ...item, ...USER_CONFIRMED } : item,
      ),
    }));
    const next = findNextFlagged(selection);
    setSelection(next ? { kind: next.kind, index: next.index } : null);
  }, [selection, updateGeometry, findNextFlagged]);

  const handleNextFlagged = useCallback(() => {
    const next = findNextFlagged(selection);
    if (next) setSelection({ kind: next.kind, index: next.index });
  }, [findNextFlagged, selection]);

  const handleConfirmAllFlagged = useCallback(() => {
    updateGeometry((prev) => {
      const next = { ...prev };
      for (const key of ["walls", "openings", "fixtures"]) {
        next[key] = (prev[key] || []).map((item) =>
          isFlagged(item) ? { ...item, ...USER_CONFIRMED } : item,
        );
      }
      return next;
    });
    setSelection(null);
  }, [updateGeometry]);

  const handleSkipReview = useCallback(() => setNeedsReview(false), []);

  // --- Typed exact wall length ----------------------------------------------

  // Keeps the most recently dragged endpoint fixed (it's where the user
  // deliberately placed it) and moves the other one to hit the exact length.
  const handleCommitWallLength = useCallback(
    (index, valueMm) => {
      if (!Number.isFinite(valueMm) || valueMm <= 0) return;
      const units = valueMm / effectiveMm;
      const anchor = lastWallDrag?.index === index ? lastWallDrag.end : "start";
      updateGeometry((prev) => ({
        ...prev,
        walls: (prev.walls || []).map((wall, i) =>
          i === index
            ? {
                ...wall,
                ...wallLengthPatch(wall, units, anchor),
                ...USER_CONFIRMED,
              }
            : wall,
        ),
      }));
    },
    [effectiveMm, lastWallDrag, updateGeometry],
  );

  return (
    <div className="w-full mt-24 pb-10">
      {busy.state && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-xl">
          <div className="bg-white/20 backdrop-blur-md rounded-lg p-8 flex flex-col items-center space-y-4 min-w-[400px] border border-white/30 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
            <p className="text-lg text-center text-black">{busy.message}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        <LeftPanel
          imagePreview={imagePreview}
          onFileSelected={handleFileSelected}
          onRemoveImage={handleRemoveImage}
          onConvert={handleConvert}
          hasResult={!!result}
          editPrompt={editPrompt}
          onEditPromptChange={setEditPrompt}
          suggestions={suggestions}
          onSuggest={handleSuggest}
          onPickSuggestion={setEditPrompt}
          onApplyEdit={handleApplyEdit}
          editInfo={editInfo}
          onPlaceAsset={handlePlaceAsset}
          error={error}
        />
        <StudioCanvas
          viewMode={viewMode}
          result={result}
          draftGeometry={draftGeometry}
          mmPerUnit={mmPerUnit}
          imagePreview={imagePreview}
          selection={selection}
          onSelect={setSelection}
          updateGeometry={updateGeometry}
          onDeleteSelected={handleDeleteSelected}
          dirty={dirty}
          onRerender={handleRerender}
          onDiscard={handleDiscard}
          onPlaceAsset={handlePlaceAsset}
          scaleError={scaleError}
          onApplyScale={handleApplyScale}
          reviewing={reviewing}
          flaggedCount={flagged.length}
          onConfirmAllFlagged={handleConfirmAllFlagged}
          onSkipReview={handleSkipReview}
          onKeepSelected={handleKeepSelected}
          onNextFlagged={handleNextFlagged}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onHistoryCommit={pushHistory}
          onWallEndDragged={setLastWallDrag}
          onCommitWallLength={handleCommitWallLength}
          onCalibrate={handleCalibrate}
          onReconcile={handleReconcile}
          reconcileInfo={reconcileInfo}
        />
        <PropertiesPanel
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selection={selection}
          draftGeometry={draftGeometry}
          mmPerUnit={mmPerUnit}
          updateGeometry={updateGeometry}
          onDeleteSelected={handleDeleteSelected}
          onKeepSelected={handleKeepSelected}
          onCommitWallLength={handleCommitWallLength}
        />
      </div>
    </div>
  );
};

export default CadStudioPage;
