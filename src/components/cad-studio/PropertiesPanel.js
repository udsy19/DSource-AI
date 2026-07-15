"use client";
import { useState } from "react";

import { SYMBOLS } from "@/utils/cad-symbols";
import {
  FLOOR_PATTERN_OPTIONS,
  geometryBounds,
  isFlagged,
  kindKey,
  polygonBounds,
  resolveAssetSize,
  segmentLength,
  snapToGrid,
  USER_CONFIRMED,
} from "./geometry-utils";
import { Chevron } from "./SymbolPreview";

const VIEW_TABS = [
  { id: "floor", label: "Floor plan" },
  { id: "2d", label: "2D View" },
];

const ALIGN_ACTIONS = [
  { id: "left", label: "Align left", d: "M5 4v16M8 10h8M8 14h5" },
  { id: "hcenter", label: "Align center", d: "M12 4v16M7 10h10M9 14h6" },
  { id: "right", label: "Align right", d: "M19 4v16M8 10h8M11 14h5" },
  { id: "top", label: "Align top", d: "M4 5h16M10 8v8M14 8v5" },
  { id: "vcenter", label: "Align middle", d: "M4 12h16M10 7v10M14 9v6" },
  { id: "bottom", label: "Align bottom", d: "M4 19h16M10 8v8M14 11v5" },
];

// Commit-on-blur number field: a keyed defaultValue keeps typing free of
// re-render churn while still refreshing when the selection changes.
const NumberField = ({ label, value, disabled, readOnly, onCommit }) => (
  <label className="flex items-center gap-2 text-xs text-gray-600">
    <span className="w-3 shrink-0">{label}</span>
    <input
      key={`${value}`}
      type="number"
      defaultValue={value ?? ""}
      disabled={disabled}
      readOnly={readOnly}
      onBlur={(event) => {
        if (readOnly || disabled || !onCommit) return;
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onCommit(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-black disabled:bg-gray-50 disabled:text-gray-400 read-only:bg-gray-50 read-only:text-gray-400"
    />
  </label>
);

const SectionHeader = ({ title, open, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center justify-between mb-3 cursor-pointer"
  >
    <span className="text-sm font-semibold">{title}</span>
    <Chevron
      className={`w-4 h-4 text-gray-500 transition-transform ${
        open ? "rotate-180" : ""
      }`}
    />
  </button>
);

const REVIEW_SOURCE_TEXT = {
  inferred: "Inferred from room boundary",
  traced: "Traced from image",
};

const PropertiesPanel = ({
  viewMode,
  onViewModeChange,
  selection,
  draftGeometry,
  mmPerUnit,
  updateGeometry,
  onDeleteSelected,
  onKeepSelected,
  onCommitWallLength,
}) => {
  const [positionOpen, setPositionOpen] = useState(true);
  const [styleOpen, setStyleOpen] = useState(true);

  const element =
    selection && draftGeometry
      ? (draftGeometry[kindKey(selection.kind)] || [])[selection.index]
      : null;
  const kind = element ? selection.kind : null;
  const mm = Number.isFinite(mmPerUnit) && mmPerUnit > 0 ? mmPerUnit : 1;

  const updateElement = (patch) => {
    const key = kindKey(selection.kind);
    // Contract: editing a wall/opening/fixture confirms it as user-authored.
    const stamp =
      key === "walls" || key === "openings" || key === "fixtures"
        ? USER_CONFIRMED
        : null;
    const { index } = selection;
    updateGeometry((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((item, i) =>
        i === index ? { ...item, ...patch, ...stamp } : item,
      ),
    }));
  };

  // --- Position bindings ---------------------------------------------------
  const alignable = kind === "asset" || kind === "fixture";

  const assetSize =
    kind === "asset"
      ? resolveAssetSize(element, SYMBOLS[element.symbol], mmPerUnit)
      : null;

  let sizeXmm = null;
  let sizeYmm = null;
  if (kind === "asset" && assetSize) {
    sizeXmm = Math.round(assetSize.w * mm);
    sizeYmm = Math.round(assetSize.h * mm);
  } else if (kind === "fixture") {
    sizeXmm = Math.round(Math.abs(element.x2 - element.x1) * mm);
    sizeYmm = Math.round(Math.abs(element.y2 - element.y1) * mm);
  }

  const roomBox = kind === "room" ? polygonBounds(element.polygon) : null;
  const layoutWmm = roomBox
    ? Math.round((roomBox.maxX - roomBox.minX) * mm)
    : null;
  const layoutHmm = roomBox
    ? Math.round((roomBox.maxY - roomBox.minY) * mm)
    : null;

  const commitSize = (axis, valueMm) => {
    if (valueMm <= 0) return;
    const units = valueMm / mm;
    if (kind === "asset") {
      updateElement(axis === "x" ? { w: units } : { h: units });
    } else if (kind === "fixture") {
      if (axis === "x") {
        const cx = (element.x1 + element.x2) / 2;
        updateElement({ x1: cx - units / 2, x2: cx + units / 2 });
      } else {
        const cy = (element.y1 + element.y2) / 2;
        updateElement({ y1: cy - units / 2, y2: cy + units / 2 });
      }
    }
  };

  const alignSelected = (action) => {
    if (!alignable) return;
    const bounds =
      geometryBounds({ walls: draftGeometry?.walls }) ||
      geometryBounds(draftGeometry);
    if (!bounds) return;
    if (kind === "asset") {
      const { w, h } = assetSize;
      const targets = {
        left: { x: bounds.minX + w / 2 },
        hcenter: { x: (bounds.minX + bounds.maxX) / 2 },
        right: { x: bounds.maxX - w / 2 },
        top: { y: bounds.minY + h / 2 },
        vcenter: { y: (bounds.minY + bounds.maxY) / 2 },
        bottom: { y: bounds.maxY - h / 2 },
      };
      const patch = targets[action];
      if (!patch) return;
      updateElement(
        Object.fromEntries(
          Object.entries(patch).map(([k, v]) => [k, snapToGrid(v)]),
        ),
      );
    } else {
      const w = Math.abs(element.x2 - element.x1);
      const h = Math.abs(element.y2 - element.y1);
      let { x1, y1 } = {
        x1: Math.min(element.x1, element.x2),
        y1: Math.min(element.y1, element.y2),
      };
      if (action === "left") x1 = bounds.minX;
      if (action === "hcenter") x1 = (bounds.minX + bounds.maxX) / 2 - w / 2;
      if (action === "right") x1 = bounds.maxX - w;
      if (action === "top") y1 = bounds.minY;
      if (action === "vcenter") y1 = (bounds.minY + bounds.maxY) / 2 - h / 2;
      if (action === "bottom") y1 = bounds.maxY - h;
      x1 = snapToGrid(x1);
      y1 = snapToGrid(y1);
      updateElement({ x1, y1, x2: x1 + w, y2: y1 + h });
    }
  };

  const normalizeAngle = (value) => ((value % 360) + 360) % 360;

  const commitRotation = (value) => {
    updateElement({ rotation: normalizeAngle(value) });
  };

  const rotateBy = (delta) => {
    updateElement({
      rotation: normalizeAngle((element.rotation || 0) + delta),
    });
  };

  const flipHorizontal = () => {
    updateElement({ rotation: normalizeAngle(360 - (element.rotation || 0)) });
  };

  // --- Style bindings ------------------------------------------------------
  const isRoom = kind === "room";

  return (
    <div className="w-full lg:w-[280px] shrink-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 self-start">
      {/* View mode pills */}
      <div className="flex rounded-full bg-gray-100 p-1">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onViewModeChange(tab.id)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm cursor-pointer ${
              viewMode === tab.id
                ? "bg-black text-white"
                : "text-gray-600 hover:text-black"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === "2d"
        ? <p className="mt-4 text-xs text-gray-400">
            Switch to Floor plan to edit elements.
          </p>
        : <>
            {!selection && (
              <p className="mt-4 text-xs text-gray-400">
                Select an element on the canvas.
              </p>
            )}

            {/* Review card: shown while a flagged (low-confidence) element is
                selected — confirm it as-is or delete it. */}
            {element && isFlagged(element) && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-900">
                  Needs review
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  {REVIEW_SOURCE_TEXT[element.source] ||
                    REVIEW_SOURCE_TEXT.traced}
                  {` · ${Math.round(element.confidence * 100)}% confidence`}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={onKeepSelected}
                    className="flex-1 rounded-full bg-black px-3 py-1 text-xs text-white cursor-pointer hover:bg-gray-800"
                  >
                    ✓ Keep
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteSelected}
                    className="flex-1 rounded-full border border-red-300 bg-white px-3 py-1 text-xs text-red-600 cursor-pointer hover:bg-red-50"
                  >
                    ✕ Delete
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-amber-700">
                  Enter = keep · Delete = remove · Tab = next flagged
                </p>
              </div>
            )}

            {/* Position */}
            <div className="mt-4">
              <SectionHeader
                title="Position"
                open={positionOpen}
                onToggle={() => setPositionOpen(!positionOpen)}
              />
              {positionOpen && (
                <>
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Alignment
                    </div>
                    <div className="flex gap-1">
                      {ALIGN_ACTIONS.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          title={action.label}
                          aria-label={action.label}
                          disabled={!alignable}
                          onClick={() => alignSelected(action.id)}
                          className="p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={action.d}
                            />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Size (mm)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="X"
                        value={sizeXmm}
                        disabled={!alignable}
                        onCommit={(value) => commitSize("x", value)}
                      />
                      <NumberField
                        label="Y"
                        value={sizeYmm}
                        disabled={!alignable}
                        onCommit={(value) => commitSize("y", value)}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Length (mm)
                    </div>
                    <NumberField
                      label="L"
                      value={
                        kind === "wall"
                          ? Math.round(segmentLength(element) * mm)
                          : null
                      }
                      disabled={kind !== "wall"}
                      onCommit={(value) => {
                        if (value > 0)
                          onCommitWallLength(selection.index, value);
                      }}
                    />
                  </div>

                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Layout (mm)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="W"
                        value={layoutWmm}
                        disabled={!isRoom}
                        readOnly
                      />
                      <NumberField
                        label="H"
                        value={layoutHmm}
                        disabled={!isRoom}
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Rotation
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <NumberField
                          label="°"
                          value={
                            kind === "asset" ? element.rotation || 0 : null
                          }
                          disabled={kind !== "asset"}
                          onCommit={commitRotation}
                        />
                      </div>
                      <button
                        type="button"
                        title="Rotate -90°"
                        aria-label="Rotate -90 degrees"
                        disabled={kind !== "asset"}
                        onClick={() => rotateBy(-90)}
                        className="p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        title="Rotate +90°"
                        aria-label="Rotate +90 degrees"
                        disabled={kind !== "asset"}
                        onClick={() => rotateBy(90)}
                        className="p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 4v5h-.582m-15.356 2A8.001 8.001 0 0119.418 9m0 0H15"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        title="Flip horizontal"
                        aria-label="Flip horizontal"
                        disabled={kind !== "asset"}
                        onClick={flipHorizontal}
                        className="p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-gray-200 my-4" />

            {/* Style */}
            <div>
              <SectionHeader
                title="Style"
                open={styleOpen}
                onToggle={() => setStyleOpen(!styleOpen)}
              />
              {styleOpen &&
                (isRoom
                  ? <>
                      <label className="block mb-3 text-xs font-medium text-gray-600">
                        Object
                        <input
                          type="text"
                          value={element.label || ""}
                          onChange={(event) =>
                            updateElement({ label: event.target.value })
                          }
                          placeholder="Room name"
                          className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black font-normal"
                        />
                      </label>
                      <label className="block mb-3 text-xs font-medium text-gray-600">
                        Texture
                        <select
                          value={element.floorPattern || ""}
                          onChange={(event) =>
                            updateElement({
                              floorPattern: event.target.value || null,
                            })
                          }
                          className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-black font-normal"
                        >
                          {FLOOR_PATTERN_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label
                        className="block text-xs font-medium text-gray-400"
                        title="Coming soon"
                      >
                        Material
                        <select
                          key={`material-${element.floorPattern || ""}`}
                          defaultValue={element.floorPattern || ""}
                          disabled
                          className="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-gray-50 text-gray-400 font-normal"
                        >
                          {FLOOR_PATTERN_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  : <p className="text-xs text-gray-400">
                      Select a room to edit its style.
                    </p>)}
            </div>
          </>}
    </div>
  );
};

export default PropertiesPanel;
