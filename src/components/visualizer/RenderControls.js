"use client";

import { useId, useState } from "react";
import {
  COLOR_PALETTES,
  FLOORING_OPTIONS,
  FURNITURE_DENSITY,
  LIGHTING_OPTIONS,
  PALETTE_SWATCHES,
  ROOM_TYPES,
  SPACE_KIND_LABELS,
  SPACE_KINDS,
  STYLES,
  WALL_FINISHES,
} from "@/utils/visualizer/params";
import ChipGroup from "./ChipGroup";

const Select = ({ label, value, options, onChange, placeholder }) => {
  const id = useId();
  return (
    <div className="min-w-0 flex-1">
      <label className="viz-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="viz-select mt-1.5 w-full rounded-md border border-[var(--viz-line)] bg-white px-2.5 py-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{placeholder ?? "None"}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Left control panel for the AI Render tab — the brief. Fully controlled:
 * emits structured params via onChange(key, value); prompt composition
 * happens server-side.
 */
export default function RenderControls({
  values,
  onChange,
  validationError,
  error,
}) {
  const promptId = useId();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const roomOptions = ROOM_TYPES[values.spaceKind] ?? [];
  const advancedCount = [
    values.flooring,
    values.wallFinish,
    values.furnitureDensity,
  ].filter(Boolean).length;

  return (
    <div className="viz-panel p-4 sm:p-5">
      <h2 className="viz-serif text-2xl">AI Render</h2>
      <p className="mt-1.5 text-xs text-[var(--viz-muted)]">
        Set the brief — every choice here is checked against the finished render
        before you see it.
      </p>

      {/* Define your space */}
      <div className="viz-label mt-5">Define your space</div>
      <div className="mt-1.5 flex gap-2">
        {SPACE_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`flex-1 cursor-pointer rounded-md border p-2 text-center text-sm ${
              values.spaceKind === kind
                ? "border-[var(--viz-ink)] bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                : "border-[var(--viz-line)] bg-white hover:bg-[var(--viz-ground)]"
            }`}
            onClick={() => onChange("spaceKind", kind)}
          >
            {SPACE_KIND_LABELS[kind]}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Select
          label="Space"
          value={values.roomType}
          options={roomOptions}
          onChange={(v) => onChange("roomType", v)}
          placeholder="Select space"
        />
      </div>

      {/* Style — sample cards, not a dropdown */}
      <div className="mt-4">
        <ChipGroup
          label="Style"
          value={values.style}
          options={STYLES}
          onChange={(v) => onChange("style", v)}
        />
      </div>

      {/* Color palette — swatch strips like a sample deck */}
      <div className="mt-4">
        <ChipGroup
          label="Color palette"
          value={values.colorPalette}
          options={COLOR_PALETTES}
          onChange={(v) => onChange("colorPalette", v)}
          swatches={PALETTE_SWATCHES}
        />
      </div>

      {/* Prompt */}
      <div className="mt-4">
        <label className="viz-label" htmlFor={promptId}>
          In your words
        </label>
        <textarea
          id={promptId}
          className="mt-1.5 h-24 w-full resize-none rounded-md border border-[var(--viz-line)] bg-white px-3 py-3 text-sm"
          placeholder="Anything the controls can't say — 'replace the sofa with a leather sectional', 'keep the artwork'..."
          value={values.prompt}
          onChange={(e) => onChange("prompt", e.target.value)}
        />
        {validationError && (
          <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3">
            <p className="whitespace-pre-line text-sm text-red-700">
              {validationError}
            </p>
          </div>
        )}
        {error && (
          <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Optional */}
      <div className="mt-5 flex gap-4">
        <Select
          label="Lighting"
          value={values.lighting}
          options={LIGHTING_OPTIONS}
          onChange={(v) => onChange("lighting", v)}
        />
      </div>

      {/* Advanced material controls */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((open) => !open)}
        className="viz-label mt-5 flex w-full cursor-pointer items-center justify-between"
        aria-expanded={advancedOpen}
      >
        <span>
          Materials &amp; detail{advancedCount > 0 ? ` · ${advancedCount}` : ""}
        </span>
        <span aria-hidden="true">{advancedOpen ? "−" : "+"}</span>
      </button>
      {advancedOpen && (
        <div className="mt-2 space-y-4 rounded-md border border-[var(--viz-line)] bg-[var(--viz-ground)]/40 p-3">
          <Select
            label="Flooring"
            value={values.flooring}
            options={FLOORING_OPTIONS}
            onChange={(v) => onChange("flooring", v)}
          />
          <Select
            label="Wall finish"
            value={values.wallFinish}
            options={WALL_FINISHES}
            onChange={(v) => onChange("wallFinish", v)}
          />
          <Select
            label="Furnishing level"
            value={values.furnitureDensity}
            options={FURNITURE_DENSITY}
            onChange={(v) => onChange("furnitureDensity", v)}
          />
        </div>
      )}

      {/* Seed behavior */}
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.variedSeed}
          onChange={(e) => onChange("variedSeed", e.target.checked)}
          className="accent-[var(--viz-blue)]"
        />
        Different renders every time
      </label>
    </div>
  );
}
