"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { SYMBOLS } from "@/utils/cad-symbols";
import {
  CANVAS_MARGIN,
  confidenceTint,
  GRID,
  geometryBounds,
  hostedOpeningsForWall,
  kindKey,
  newUid,
  polygonCentroid,
  reprojectHostedOpenings,
  resolveAssetSize,
  segmentLength,
  snapToGrid,
  USER_CONFIRMED,
} from "./geometry-utils";
import { SymbolShapes } from "./SymbolPreview";

const SELECT_COLOR = "#dc2626";

const ARROW_DELTAS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

const SCALE_SOURCE_TEXT = {
  dimensions: {
    className: "text-green-700",
    text: "Scale read from printed dimensions",
  },
  "door-heuristic": {
    className: "text-amber-700",
    text: "Scale estimated from standard door width — verify",
  },
  assumed: {
    className: "text-red-600",
    text: "No scale found — enter a known measurement",
  },
  user: { className: "text-green-700", text: "Scale set manually" },
};

const DOT_GRID_STYLE = {
  backgroundImage: "radial-gradient(#d4d4d8 1.5px, transparent 1.5px)",
  backgroundSize: "24px 24px",
};

const downloadFile = (content, type, filename) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const isFormTarget = (event) => {
  const tag = event.target?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

const StudioCanvas = ({
  viewMode,
  result,
  draftGeometry,
  mmPerUnit,
  imagePreview,
  selection,
  onSelect,
  updateGeometry,
  onDeleteSelected,
  dirty,
  onRerender,
  onDiscard,
  onPlaceAsset,
  scaleError,
  onApplyScale,
  reviewing,
  flaggedCount,
  onConfirmAllFlagged,
  onSkipReview,
  onKeepSelected,
  onNextFlagged,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onHistoryCommit,
  onWallEndDragged,
  onCommitWallLength,
  onCalibrate,
  onReconcile,
  reconcileInfo,
}) => {
  const svgRef = useRef(null);
  const scaleInputRef = useRef(null);
  const patternId = useId();
  const [drag, setDrag] = useState(null);
  const [showUnderlay, setShowUnderlay] = useState(true);
  const [imageDims, setImageDims] = useState(null);
  // Live modifier state for the snap chip only; drag math reads the event.
  const [mods, setMods] = useState({ bypass: false, ortho: false });
  const [tool, setTool] = useState("select");
  const [wallStart, setWallStart] = useState(null);
  const [wallCursor, setWallCursor] = useState(null);
  // null | { a, b, mm } — two picked points plus the typed real distance.
  const [calibration, setCalibration] = useState(null);
  // Pre-drag snapshot + moved flag so a drag gesture commits exactly one
  // history entry on pointer-up (drag frames pass { history: false }).
  const dragStartRef = useRef(null);
  const dragMovedRef = useRef(false);

  const effectiveMm =
    Number.isFinite(mmPerUnit) && mmPerUnit > 0 ? mmPerUnit : 1;

  // The underlay image's aspect ratio isn't known from geometry alone.
  // Geometry is normalized so the longest image side spans 1000 units.
  useEffect(() => {
    if (!imagePreview) {
      setImageDims(null);
      return undefined;
    }
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      const { naturalWidth, naturalHeight } = img;
      if (!naturalWidth || !naturalHeight) return;
      setImageDims(
        naturalWidth >= naturalHeight
          ? { width: 1000, height: (1000 * naturalHeight) / naturalWidth }
          : { width: (1000 * naturalWidth) / naturalHeight, height: 1000 },
      );
    };
    img.src = imagePreview;
    return () => {
      cancelled = true;
    };
  }, [imagePreview]);

  // Compute the viewBox from the adopted result (not the draft) so the
  // canvas doesn't jitter while elements are being dragged.
  const viewBox = useMemo(() => {
    const bounds = geometryBounds(result?.geometry);
    if (!bounds) {
      const span = 1000 + 2 * CANVAS_MARGIN;
      return { x: -CANVAS_MARGIN, y: -CANVAS_MARGIN, w: span, h: span };
    }
    return {
      x: bounds.minX - CANVAS_MARGIN,
      y: bounds.minY - CANVAS_MARGIN,
      w: bounds.maxX - bounds.minX + 2 * CANVAS_MARGIN,
      h: bounds.maxY - bounds.minY + 2 * CANVAS_MARGIN,
    };
  }, [result]);

  const nudgeSelected = useCallback(
    (dx, dy) => {
      if (!selection) return;
      const key = kindKey(selection.kind);
      const { index } = selection;
      updateGeometry((prev) => {
        const items = prev[key] || [];
        const element = items[index];
        if (!element) return prev;
        let moved;
        if (key === "assets") {
          moved = { ...element, x: element.x + dx, y: element.y + dy };
        } else if (key === "rooms") {
          moved = {
            ...element,
            polygon: (element.polygon || []).map((p) => [p[0] + dx, p[1] + dy]),
          };
        } else {
          moved = {
            ...element,
            x1: element.x1 + dx,
            y1: element.y1 + dy,
            x2: element.x2 + dx,
            y2: element.y2 + dy,
            ...USER_CONFIRMED,
          };
        }
        return {
          ...prev,
          [key]: items.map((item, i) => (i === index ? moved : item)),
        };
      });
    },
    [selection, updateGeometry],
  );

  // Master keyboard map for the floor-plan editor. All handlers are guarded
  // against INPUT/TEXTAREA/SELECT focus (except Escape while calibrating).
  useEffect(() => {
    if (viewMode !== "floor") return undefined;
    const syncMods = (event) =>
      setMods({
        bypass: event.ctrlKey || event.metaKey,
        ortho: event.shiftKey,
      });
    const onKeyDown = (event) => {
      syncMods(event);
      if (event.key === "Escape" && calibration) {
        setCalibration(null);
        return;
      }
      if (isFormTarget(event)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const arrow = ARROW_DELTAS[event.key];
      if (arrow && selection) {
        event.preventDefault();
        const step = event.shiftKey ? 25 : GRID;
        nudgeSelected(arrow[0] * step, arrow[1] * step);
        return;
      }
      switch (event.key) {
        case "Escape":
          if (wallStart) setWallStart(null);
          else if (tool !== "select") setTool("select");
          else onSelect(null);
          return;
        case "Delete":
        case "Backspace":
          onDeleteSelected();
          return;
        case "Enter":
          if (reviewing) {
            event.preventDefault();
            onKeepSelected();
          }
          return;
        case "Tab":
          if (reviewing) {
            event.preventDefault();
            onNextFlagged();
          }
          return;
        default:
          break;
      }
      const lower = event.key.toLowerCase();
      if (lower === "v") {
        setTool("select");
        setWallStart(null);
      } else if (lower === "w") {
        setTool("wall");
      }
    };
    const onKeyUp = syncMods;
    const onBlur = () => setMods({ bypass: false, ortho: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    viewMode,
    calibration,
    wallStart,
    tool,
    reviewing,
    selection,
    nudgeSelected,
    onDeleteSelected,
    onUndo,
    onRedo,
    onKeepSelected,
    onNextFlagged,
    onSelect,
  ]);

  const toSvgPoint = (event) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      ctm.inverse(),
    );
    return { x: point.x, y: point.y };
  };

  const isSelected = (kind, index) =>
    selection?.kind === kind && selection.index === index;

  const startEndpointDrag = (event, kind, index, end) => {
    event.stopPropagation();
    event.target.setPointerCapture?.(event.pointerId);
    dragStartRef.current = draftGeometry;
    dragMovedRef.current = false;
    // Rayon pattern: openings riding this wall are captured at drag start
    // and re-projected on every frame, keeping their t and length.
    const hosted =
      kind === "wall" ? hostedOpeningsForWall(draftGeometry, index) : null;
    setDrag({ type: "endpoint", key: kindKey(kind), index, end, hosted });
  };

  const startMoveDrag = (event, kind, index) => {
    event.stopPropagation();
    const point = toSvgPoint(event);
    onSelect({ kind, index });
    if (!point) return;
    event.target.setPointerCapture?.(event.pointerId);
    dragStartRef.current = draftGeometry;
    dragMovedRef.current = false;
    if (kind === "fixture") {
      const fixture = draftGeometry.fixtures[index];
      setDrag({
        type: "move",
        key: "fixtures",
        index,
        offX: fixture.x1 - point.x,
        offY: fixture.y1 - point.y,
        w: fixture.x2 - fixture.x1,
        h: fixture.y2 - fixture.y1,
      });
    } else if (kind === "asset") {
      const asset = draftGeometry.assets[index];
      setDrag({
        type: "move",
        key: "assets",
        index,
        offX: asset.x - point.x,
        offY: asset.y - point.y,
      });
    }
  };

  const selectOnly = (event, kind, index) => {
    event.stopPropagation();
    onSelect({ kind, index });
  };

  // Snap-to-grid unless Ctrl/Meta is held; Shift constrains the moving point
  // to horizontal/vertical relative to an anchor.
  const resolvePoint = (event, point, anchor) => {
    let { x, y } = point;
    if (anchor && event.shiftKey) {
      if (Math.abs(x - anchor.x) >= Math.abs(y - anchor.y)) y = anchor.y;
      else x = anchor.x;
    }
    if (!(event.ctrlKey || event.metaKey)) {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }
    return { x, y };
  };

  const handlePointerMove = (event) => {
    const point = toSvgPoint(event);
    if (!point) return;
    if (tool === "wall" && wallStart) {
      setWallCursor(resolvePoint(event, point, wallStart));
    }
    if (!drag) return;
    dragMovedRef.current = true;
    if (drag.type === "endpoint") {
      updateGeometry(
        (prev) => {
          const items = prev[drag.key] || [];
          const element = items[drag.index];
          if (!element) return prev;
          const anchor =
            drag.end === "start"
              ? { x: element.x2, y: element.y2 }
              : { x: element.x1, y: element.y1 };
          const next = resolvePoint(event, point, anchor);
          const moved = {
            ...element,
            [drag.end === "start" ? "x1" : "x2"]: next.x,
            [drag.end === "start" ? "y1" : "y2"]: next.y,
            ...USER_CONFIRMED,
          };
          const nextItems = items.map((item, i) =>
            i === drag.index ? moved : item,
          );
          if (drag.key === "walls" && drag.hosted?.length) {
            return {
              ...prev,
              walls: nextItems,
              openings: reprojectHostedOpenings(
                prev.openings || [],
                moved,
                drag.hosted,
              ),
            };
          }
          return { ...prev, [drag.key]: nextItems };
        },
        { history: false },
      );
    } else if (drag.key === "fixtures") {
      const bypass = event.ctrlKey || event.metaKey;
      const x1 = bypass ? point.x + drag.offX : snapToGrid(point.x + drag.offX);
      const y1 = bypass ? point.y + drag.offY : snapToGrid(point.y + drag.offY);
      updateGeometry(
        (prev) => ({
          ...prev,
          fixtures: prev.fixtures.map((element, index) =>
            index === drag.index
              ? {
                  ...element,
                  x1,
                  y1,
                  x2: x1 + drag.w,
                  y2: y1 + drag.h,
                  ...USER_CONFIRMED,
                }
              : element,
          ),
        }),
        { history: false },
      );
    } else if (drag.key === "assets") {
      const bypass = event.ctrlKey || event.metaKey;
      const x = bypass ? point.x + drag.offX : snapToGrid(point.x + drag.offX);
      const y = bypass ? point.y + drag.offY : snapToGrid(point.y + drag.offY);
      updateGeometry(
        (prev) => ({
          ...prev,
          assets: prev.assets.map((element, index) =>
            index === drag.index ? { ...element, x, y } : element,
          ),
        }),
        { history: false },
      );
    }
  };

  const handlePointerUp = () => {
    if (drag && dragMovedRef.current) {
      onHistoryCommit(dragStartRef.current);
      if (drag.type === "endpoint" && drag.key === "walls")
        onWallEndDragged({ index: drag.index, end: drag.end });
    }
    dragStartRef.current = null;
    dragMovedRef.current = false;
    setDrag(null);
  };

  const commitWall = (endPoint) => {
    if (endPoint.x === wallStart.x && endPoint.y === wallStart.y) return;
    const nextIndex = draftGeometry.walls?.length || 0;
    updateGeometry((prev) => ({
      ...prev,
      walls: [
        ...(prev.walls || []),
        {
          x1: wallStart.x,
          y1: wallStart.y,
          x2: endPoint.x,
          y2: endPoint.y,
          ...USER_CONFIRMED,
          __id: newUid(),
        },
      ],
    }));
    onSelect({ kind: "wall", index: nextIndex });
    setWallStart(null);
    setWallCursor(null);
  };

  const handleCanvasPointerDown = (event) => {
    if (calibration) {
      const point = toSvgPoint(event);
      if (!point) return;
      setCalibration((current) =>
        !current.a
          ? { ...current, a: point }
          : !current.b
            ? { ...current, b: point }
            : current,
      );
      return;
    }
    if (tool === "wall") {
      const point = toSvgPoint(event);
      if (!point) return;
      const resolved = resolvePoint(event, point, wallStart);
      if (!wallStart) {
        setWallStart(resolved);
        setWallCursor(resolved);
      } else {
        commitWall(resolved);
      }
      return;
    }
    onSelect(null);
  };

  const applyCalibration = () => {
    const mmValue = Number(calibration?.mm);
    const { a, b } = calibration || {};
    if (!a || !b || !Number.isFinite(mmValue) || mmValue <= 0) return;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist <= 0) return;
    setCalibration(null);
    onCalibrate(mmValue / dist);
  };

  const handleDrop = (event) => {
    const symbolId = event.dataTransfer?.getData("application/x-cad-symbol");
    if (!symbolId) return;
    event.preventDefault();
    const point = toSvgPoint(event);
    onPlaceAsset(symbolId, point || undefined);
  };

  const handleDragOver = (event) => {
    if (event.dataTransfer?.types?.includes("application/x-cad-symbol")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const downloadDxf = () => {
    if (result?.dxf)
      downloadFile(result.dxf, "application/dxf", "floor-plan.dxf");
  };

  const downloadSvg = () => {
    if (result?.svg)
      downloadFile(result.svg, "image/svg+xml", "floor-plan.svg");
  };

  const downloadDwg = () => {
    if (!result?.dwg) return;
    const binary = atob(result.dwg);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    downloadFile(bytes, "application/acad", "floor-plan.dwg");
  };

  const patternRef = (name) => `url(#${patternId}-${name})`;

  const roomFill = (room) => {
    switch (room?.floorPattern) {
      case "tiles":
        return patternRef("tiles");
      case "herringbone":
        return patternRef("herringbone");
      case "planks":
        return patternRef("planks");
      default:
        return "#f1f5f9";
    }
  };

  const selectedSegment =
    selection &&
    (selection.kind === "wall" || selection.kind === "opening") &&
    draftGeometry
      ? draftGeometry[kindKey(selection.kind)]?.[selection.index]
      : null;

  const selectedWallLengthMm =
    selection?.kind === "wall" && selectedSegment
      ? Math.round(segmentLength(selectedSegment) * effectiveMm)
      : null;

  const scaleInfo = result?.scale
    ? SCALE_SOURCE_TEXT[result.scale.source] || null
    : null;

  const renderEmptyState = () => (
    <div className="h-full min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <svg
        className="w-10 h-10 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
      <p className="mt-3 text-sm text-gray-500">
        {imagePreview
          ? "Convert your image to CAD to start editing the floor plan."
          : "Upload a floor plan image and convert it to CAD to begin."}
      </p>
    </div>
  );

  const renderFloorPlan = () => (
    <div>
      {reviewing && (
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2">
          <p className="flex-1 min-w-[200px] text-xs text-amber-900">
            Review: {flaggedCount} flagged element
            {flaggedCount === 1 ? "" : "s"} — confirm or fix them, then continue
          </p>
          <button
            type="button"
            onClick={onConfirmAllFlagged}
            className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-900 cursor-pointer hover:bg-amber-100"
          >
            Confirm all remaining
          </button>
          <button
            type="button"
            onClick={onSkipReview}
            className="rounded-full px-3 py-1 text-xs text-amber-700 cursor-pointer hover:bg-amber-100"
          >
            Skip review
          </button>
        </div>
      )}
      <div className="relative h-[70vh]">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full h-full"
          style={{ touchAction: "none" }}
          role="application"
          aria-label="Floor plan editor"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <title>Floor plan editor</title>
          <defs>
            <pattern
              id={`${patternId}-tiles`}
              width={30}
              height={30}
              patternUnits="userSpaceOnUse"
            >
              <rect width={30} height={30} fill="#f8fafc" />
              <path
                d="M30 0L0 0 0 30"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={1.5}
              />
            </pattern>
            <pattern
              id={`${patternId}-herringbone`}
              width={24}
              height={24}
              patternUnits="userSpaceOnUse"
            >
              <rect width={24} height={24} fill="#f8fafc" />
              <path
                d="M0 12L12 0M12 24L24 12M0 12l12 12M12 0l12 12"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={1.2}
              />
            </pattern>
            <pattern
              id={`${patternId}-planks`}
              width={40}
              height={16}
              patternUnits="userSpaceOnUse"
            >
              <rect width={40} height={16} fill="#f8fafc" />
              <path
                d="M0 0h40M0 8h40M10 0v8M30 8v8"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth={1.2}
              />
            </pattern>
          </defs>

          {showUnderlay && imageDims && imagePreview && (
            <image
              href={imagePreview}
              x={0}
              y={0}
              width={imageDims.width}
              height={imageDims.height}
              opacity={0.35}
              preserveAspectRatio="none"
            />
          )}

          {(draftGeometry?.rooms || []).map((room, index) => {
            const points = (room.polygon || [])
              .map((p) => `${p[0]},${p[1]}`)
              .join(" ");
            const centroid = polygonCentroid(room.polygon);
            const selected = isSelected("room", index);
            return (
              <g key={room.__id}>
                <polygon
                  points={points}
                  fill={roomFill(room)}
                  fillOpacity={0.65}
                  stroke={selected ? SELECT_COLOR : "#94a3b8"}
                  strokeWidth={selected ? 3 : 1}
                  strokeDasharray={selected ? undefined : "4 4"}
                  className="cursor-pointer"
                  onPointerDown={(event) => selectOnly(event, "room", index)}
                />
                {centroid && room.label && (
                  <text
                    x={centroid.x}
                    y={centroid.y}
                    textAnchor="middle"
                    fontSize={22}
                    fill={selected ? SELECT_COLOR : "#64748b"}
                    pointerEvents="none"
                  >
                    {room.label}
                  </text>
                )}
              </g>
            );
          })}

          {(draftGeometry?.fixtures || []).map((fixture, index) => {
            const x = Math.min(fixture.x1, fixture.x2);
            const y = Math.min(fixture.y1, fixture.y2);
            const w = Math.abs(fixture.x2 - fixture.x1);
            const h = Math.abs(fixture.y2 - fixture.y1);
            const selected = isSelected("fixture", index);
            const tint = reviewing ? confidenceTint(fixture) : null;
            return (
              <g key={fixture.__id}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="transparent"
                  stroke={selected ? SELECT_COLOR : tint || "#334155"}
                  strokeWidth={2.5}
                  className="cursor-move"
                  onPointerDown={(event) =>
                    startMoveDrag(event, "fixture", index)
                  }
                />
                {fixture.label && (
                  <text
                    x={x + w / 2}
                    y={y + h / 2}
                    textAnchor="middle"
                    fontSize={13}
                    fill={selected ? SELECT_COLOR : "#64748b"}
                    pointerEvents="none"
                  >
                    {fixture.label}
                  </text>
                )}
              </g>
            );
          })}

          {(draftGeometry?.walls || []).map((wall, index) => {
            const tint = reviewing ? confidenceTint(wall) : null;
            return (
              <line
                key={wall.__id}
                x1={wall.x1}
                y1={wall.y1}
                x2={wall.x2}
                y2={wall.y2}
                stroke={
                  isSelected("wall", index) ? SELECT_COLOR : tint || "#0f172a"
                }
                strokeWidth={8}
                strokeLinecap="square"
                strokeDasharray={
                  reviewing && wall.source === "inferred" ? "14 10" : undefined
                }
                className="cursor-pointer"
                onPointerDown={(event) => selectOnly(event, "wall", index)}
              />
            );
          })}

          {(draftGeometry?.openings || []).map((opening, index) => {
            const tint = reviewing ? confidenceTint(opening) : null;
            return (
              <line
                key={opening.__id}
                x1={opening.x1}
                y1={opening.y1}
                x2={opening.x2}
                y2={opening.y2}
                stroke={
                  isSelected("opening", index)
                    ? SELECT_COLOR
                    : tint || (opening.type === "door" ? "#b45309" : "#2563eb")
                }
                strokeWidth={6}
                opacity={0.9}
                className="cursor-pointer"
                onPointerDown={(event) => selectOnly(event, "opening", index)}
              />
            );
          })}

          {(draftGeometry?.assets || []).map((asset, index) => {
            const symbol = SYMBOLS[asset.symbol];
            const { w, h } = resolveAssetSize(asset, symbol, mmPerUnit);
            const selected = isSelected("asset", index);
            return (
              <g
                key={asset.id}
                transform={`rotate(${asset.rotation || 0} ${asset.x} ${asset.y}) translate(${
                  asset.x - w / 2
                } ${asset.y - h / 2})`}
                style={{ color: selected ? SELECT_COLOR : "#0f172a" }}
                className="cursor-move"
                onPointerDown={(event) => startMoveDrag(event, "asset", index)}
              >
                <rect
                  width={w}
                  height={h}
                  fill="transparent"
                  stroke={selected ? SELECT_COLOR : "transparent"}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
                {symbol
                  ? <SymbolShapes
                      primitives={symbol.primitives}
                      width={w}
                      height={h}
                      strokeWidth={2}
                    />
                  : <text
                      x={w / 2}
                      y={h / 2}
                      textAnchor="middle"
                      fontSize={12}
                      fill="currentColor"
                    >
                      {asset.symbol}
                    </text>}
              </g>
            );
          })}

          {selectedSegment &&
            ["start", "end"].map((end) => (
              <circle
                key={end}
                cx={end === "start" ? selectedSegment.x1 : selectedSegment.x2}
                cy={end === "start" ? selectedSegment.y1 : selectedSegment.y2}
                r={9}
                fill={
                  drag?.type === "endpoint" && drag.end === end
                    ? "#fbbf24"
                    : "white"
                }
                stroke="#0f172a"
                strokeWidth={2.5}
                className="cursor-move hover:fill-amber-400"
                onPointerDown={(event) =>
                  startEndpointDrag(event, selection.kind, selection.index, end)
                }
              />
            ))}

          {selection?.kind === "wall" && selectedSegment && !drag && (
            <foreignObject
              x={(selectedSegment.x1 + selectedSegment.x2) / 2 + 12}
              y={(selectedSegment.y1 + selectedSegment.y2) / 2 - 18}
              width={140}
              height={36}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <input
                key={`${selection.index}-${selectedWallLengthMm}`}
                type="number"
                defaultValue={selectedWallLengthMm}
                aria-label="Wall length in millimeters"
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  const next = Number(event.currentTarget.value);
                  if (Number.isFinite(next) && next > 0)
                    onCommitWallLength(selection.index, next);
                }}
                className="rounded border border-gray-300 bg-white/90 text-black"
                style={{
                  width: "100%",
                  height: "100%",
                  fontSize: 18,
                  padding: "0 8px",
                }}
              />
            </foreignObject>
          )}

          {tool === "wall" && wallStart && (
            <g pointerEvents="none">
              <circle cx={wallStart.x} cy={wallStart.y} r={7} fill="#0f172a" />
              {wallCursor && (
                <line
                  x1={wallStart.x}
                  y1={wallStart.y}
                  x2={wallCursor.x}
                  y2={wallCursor.y}
                  stroke="#0f172a"
                  strokeWidth={4}
                  strokeDasharray="10 6"
                  opacity={0.6}
                />
              )}
            </g>
          )}

          {calibration?.a && (
            <g pointerEvents="none">
              <circle
                cx={calibration.a.x}
                cy={calibration.a.y}
                r={7}
                fill="#2563eb"
              />
              {calibration.b && (
                <>
                  <line
                    x1={calibration.a.x}
                    y1={calibration.a.y}
                    x2={calibration.b.x}
                    y2={calibration.b.y}
                    stroke="#2563eb"
                    strokeWidth={3}
                    strokeDasharray="8 5"
                  />
                  <circle
                    cx={calibration.b.x}
                    cy={calibration.b.y}
                    r={7}
                    fill="#2563eb"
                  />
                </>
              )}
            </g>
          )}

          {(tool === "wall" || calibration) && (
            <rect
              x={viewBox.x}
              y={viewBox.y}
              width={viewBox.w}
              height={viewBox.h}
              fill="transparent"
              className="cursor-crosshair"
            />
          )}
        </svg>

        {imagePreview && (
          <button
            type="button"
            onClick={() => setShowUnderlay(!showUnderlay)}
            className="absolute top-3 right-3 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 shadow-sm cursor-pointer hover:bg-gray-50"
          >
            {showUnderlay ? "Hide underlay" : "Show underlay"}
          </button>
        )}

        {calibration && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-lg">
            {!calibration.b
              ? <span className="text-xs text-gray-600">
                  {calibration.a
                    ? "Click the second point"
                    : "Click the first point of a known distance"}
                </span>
              : <>
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    Real distance (mm)
                    <input
                      type="number"
                      min={1}
                      value={calibration.mm}
                      onChange={(event) =>
                        setCalibration((current) => ({
                          ...current,
                          mm: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") applyCalibration();
                      }}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-black"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={applyCalibration}
                    className="rounded-full bg-black px-3 py-1 text-xs text-white cursor-pointer hover:bg-gray-800"
                  >
                    Apply
                  </button>
                </>}
            <button
              type="button"
              onClick={() => setCalibration(null)}
              className="rounded-full px-2 py-1 text-xs text-gray-500 cursor-pointer hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl/Cmd+Z)"
              aria-label="Undo"
              className="rounded-full px-2 py-0.5 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↺
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Shift+Ctrl/Cmd+Z)"
              aria-label="Redo"
              className="rounded-full px-2 py-0.5 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↻
            </button>
            <button
              type="button"
              onClick={() => {
                setTool(tool === "wall" ? "select" : "wall");
                setWallStart(null);
              }}
              title="Add wall (W) — Esc or V to exit"
              className={`rounded-full px-2.5 py-0.5 text-xs cursor-pointer ${
                tool === "wall"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Wall
            </button>
            <button
              type="button"
              onClick={() =>
                setCalibration(
                  calibration ? null : { a: null, b: null, mm: "" },
                )
              }
              title="Set the scale from a known distance"
              className={`rounded-full px-2.5 py-0.5 text-xs cursor-pointer ${
                calibration
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Calibrate
            </button>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] shadow-sm">
            <span
              className={
                mods.bypass ? "text-gray-300 line-through" : "text-gray-600"
              }
            >
              Snap: {GRID}
            </span>
            <span className="text-gray-300">·</span>
            <span
              className={
                mods.bypass ? "font-semibold text-black" : "text-gray-400"
              }
            >
              ⌃ off
            </span>
            <span className="text-gray-300">·</span>
            <span
              className={
                mods.ortho ? "font-semibold text-black" : "text-gray-400"
              }
            >
              ⇧ ortho
            </span>
          </div>
        </div>

        {dirty && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1.5 shadow-lg">
            <button
              type="button"
              onClick={onDiscard}
              className="rounded-full px-3 py-1.5 text-sm text-gray-600 cursor-pointer hover:bg-gray-100"
            >
              Discard changes
            </button>
            <button
              type="button"
              onClick={onRerender}
              className="rounded-full bg-black px-4 py-1.5 text-sm text-white cursor-pointer hover:bg-gray-800"
            >
              Re-render drawing
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const render2dView = () => (
    <div className="p-4 flex flex-col min-h-[70vh]">
      <div
        className="flex-1 min-h-[52vh] rounded-2xl border border-gray-200 bg-white overflow-hidden [&_svg]:w-full [&_svg]:h-full"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is generated server-side from validated numeric geometry with XML-escaped labels
        dangerouslySetInnerHTML={{ __html: result.svg }}
      />
      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
        <p className="text-xs text-amber-800">
          <span className="font-semibold">
            AI-generated draft — verify all dimensions before use.
          </span>{" "}
          {result.stats.walls} walls · {result.stats.doors} doors ·{" "}
          {result.stats.windows} windows · {result.stats.rooms} rooms ·{" "}
          {result.stats.fixtures ?? 0} fixtures · {result.stats.assets ?? 0}{" "}
          assets
          {typeof result.confidence === "number" &&
            ` · extraction confidence ${Math.round(result.confidence * 100)}%`}
          {result.planSizeMm &&
            ` · plan ${(result.planSizeMm.width / 1000).toFixed(2)} m × ${(
              result.planSizeMm.height / 1000
            ).toFixed(2)} m`}
        </p>
        {scaleInfo && (
          <p className={`mt-1 text-xs ${scaleInfo.className}`}>
            {scaleInfo.text}
          </p>
        )}
        {reconcileInfo && (
          <>
            <p className="mt-1 text-xs text-green-700">
              {reconcileInfo.summary}
            </p>
            {reconcileInfo.conflicting.length > 0 && (
              <ul className="mt-1 text-xs text-amber-700 list-disc list-inside">
                {reconcileInfo.conflicting.map((conflict) => (
                  <li key={`${conflict.text}-${conflict.deltaMm}`}>
                    Conflicting: {conflict.text} (off by{" "}
                    {Math.round(conflict.deltaMm)} mm)
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {result.warnings?.length > 0 && (
          <ul className="mt-1 text-xs text-amber-700 list-disc list-inside">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {result.planSizeMm && result.scale && (
            <>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                Plan width
                <input
                  key={result.planSizeMm.width}
                  ref={scaleInputRef}
                  type="number"
                  min={500}
                  max={200000}
                  defaultValue={Math.round(result.planSizeMm.width)}
                  className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-black"
                />
                mm
              </label>
              <button
                type="button"
                onClick={() =>
                  onApplyScale(Number(scaleInputRef.current?.value))
                }
                className="rounded-full border border-black bg-white px-3 py-1 text-sm cursor-pointer hover:bg-gray-50"
              >
                Apply
              </button>
              {scaleError && (
                <span className="text-xs text-red-600">{scaleError}</span>
              )}
            </>
          )}
          {(result.geometry?.dimensions?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={onReconcile}
              className="rounded-full border border-black bg-white px-3 py-1 text-sm cursor-pointer hover:bg-gray-50"
            >
              Reconcile to dimensions
            </button>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={downloadSvg}
            className="rounded-full border border-black bg-white px-4 py-1.5 text-sm cursor-pointer hover:bg-gray-50"
          >
            Download SVG
          </button>
          <button
            type="button"
            onClick={downloadDxf}
            className="rounded-full bg-black px-4 py-1.5 text-sm text-white cursor-pointer hover:bg-gray-800"
          >
            Download DXF
          </button>
          {typeof result.dwg === "string" && result.dwg.length > 0 && (
            <button
              type="button"
              onClick={downloadDwg}
              className="rounded-full bg-black px-4 py-1.5 text-sm text-white cursor-pointer hover:bg-gray-800"
            >
              Download DWG
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-[#fafafa] overflow-hidden"
      style={DOT_GRID_STYLE}
    >
      {!result || !draftGeometry
        ? renderEmptyState()
        : viewMode === "floor"
          ? renderFloorPlan()
          : render2dView()}
    </div>
  );
};

export default StudioCanvas;
