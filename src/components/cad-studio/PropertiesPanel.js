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
  <label className="viz-mono flex items-center gap-2 text-xs text-[var(--viz-muted)]">
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
      className="w-full px-2 py-1 border border-[var(--viz-line)] bg-white rounded-md text-sm text-[var(--viz-ink)] disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)] read-only:bg-[var(--viz-line)] read-only:text-[var(--viz-muted)]"
    />
  </label>
);

const SectionHeader = ({ title, open, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center justify-between mb-3 cursor-pointer"
  >
    <span className="viz-label">{title}</span>
    <Chevron
      className={`w-4 h-4 text-[var(--viz-muted)] transition-transform ${
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
    <div className="viz-panel w-full lg:w-[280px] shrink-0 p-4 lg:sticky lg:top-24 self-start">
      {/* View mode pills */}
      <div className="flex rounded-full border border-[var(--viz-line)] bg-[var(--viz-ground)] p-1">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onViewModeChange(tab.id)}
            className={`viz-btn flex-1 rounded-full px-3 py-1.5 cursor-pointer ${
              viewMode === tab.id
                ? "bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                : "text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === "2d"
        ? <p className="viz-mono mt-4 text-xs text-[var(--viz-muted)]">
            Switch to Floor plan to edit elements.
          </p>
        : <>
            {!selection && (
              <p className="viz-mono mt-4 text-xs text-[var(--viz-muted)]">
                Select an element on the canvas.
              </p>
            )}

            {/* Review card: shown while a flagged (low-confidence) element is
                selected — confirm it as-is or delete it. */}
            {element && isFlagged(element) && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="viz-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900">
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
                    className="flex-1 rounded-full bg-[var(--viz-ink)] px-3 py-1 text-xs text-[var(--viz-paper)] cursor-pointer hover:bg-black"
                  >
                    ✓ Keep
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteSelected}
                    className="flex-1 rounded-full border border-red-300 bg-[var(--viz-paper)] px-3 py-1 text-xs text-red-600 cursor-pointer hover:bg-red-50"
                  >
                    ✕ Delete
                  </button>
                </div>
                <p className="viz-mono mt-2 text-[10px] text-amber-700">
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
                    <div className="viz-label mb-2">Alignment</div>
                    <div className="flex gap-1">
                      {ALIGN_ACTIONS.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          title={action.label}
                          aria-label={action.label}
                          disabled={!alignable}
                          onClick={() => alignSelected(action.id)}
                          className="p-2 border border-[var(--viz-line)] rounded-md cursor-pointer hover:bg-[var(--viz-ground)] transition-colors disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)] disabled:cursor-not-allowed"
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
                    <div className="viz-label mb-1">Size (mm)</div>
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
                    <div className="viz-label mb-1">Length (mm)</div>
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
                    <div className="viz-label mb-1">Layout (mm)</div>
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
                    <div className="viz-label mb-2">Rotation</div>
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
                        className="p-2 border border-[var(--viz-line)] rounded-md cursor-pointer hover:bg-[var(--viz-ground)] disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)] disabled:cursor-not-allowed"
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
                        className="p-2 border border-[var(--viz-line)] rounded-md cursor-pointer hover:bg-[var(--viz-ground)] disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)] disabled:cursor-not-allowed"
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
                        className="p-2 border border-[var(--viz-line)] rounded-md cursor-pointer hover:bg-[var(--viz-ground)] disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)] disabled:cursor-not-allowed"
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

            <div className="border-t border-[var(--viz-line)] my-4" />

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
                      <label className="block mb-3">
                        <span className="viz-label">Object</span>
                        <input
                          type="text"
                          value={element.label || ""}
                          onChange={(event) =>
                            updateElement({ label: event.target.value })
                          }
                          placeholder="Room name"
                          className="mt-1 w-full px-2 py-1.5 border border-[var(--viz-line)] bg-white rounded-md text-sm text-[var(--viz-ink)]"
                        />
                      </label>
                      <label className="block mb-3">
                        <span className="viz-label">Texture</span>
                        <select
                          value={element.floorPattern || ""}
                          onChange={(event) =>
                            updateElement({
                              floorPattern: event.target.value || null,
                            })
                          }
                          className="viz-select mt-1 w-full px-2 py-1.5 border border-[var(--viz-line)] bg-white rounded-md text-sm text-[var(--viz-ink)]"
                        >
                          {FLOOR_PATTERN_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block" title="Coming soon">
                        <span className="viz-label">Material</span>
                        <select
                          key={`material-${element.floorPattern || ""}`}
                          defaultValue={element.floorPattern || ""}
                          disabled
                          className="viz-select mt-1 w-full px-2 py-1.5 border border-[var(--viz-line)] rounded-md text-sm bg-[var(--viz-line)] text-[var(--viz-muted)]"
                        >
                          {FLOOR_PATTERN_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  : <p className="viz-mono text-xs text-[var(--viz-muted)]">
                      Select a room to edit its style.
                    </p>)}
            </div>
          </>}
    </div>
  );
};

export default PropertiesPanel;
