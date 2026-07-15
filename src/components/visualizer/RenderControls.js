"use client";

import { MODEL_OPTIONS } from "@/utils/replicate-models";
import {
  COLOR_PALETTES,
  LIGHTING_OPTIONS,
  ROOM_TYPES,
  SPACE_KINDS,
  STYLES,
} from "@/utils/visualizer/params";

const SPACE_KIND_LABELS = {
  interior: "Interior",
  exterior: "Exterior",
  "floor-plan": "Floor Plan",
};

const Select = ({ label, value, options, onChange, placeholder }) => (
  <div className="flex-1 min-w-0">
    <label className="text-sm font-bold">{label}</label>
    <select
      className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm bg-white"
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

/**
 * Left control panel for the AI Render tab (per Figma wireframe).
 * Fully controlled: emits structured params via onChange(key, value) —
 * prompt composition happens server-side.
 */
export default function RenderControls({
  values,
  onChange,
  validationError,
  error,
}) {
  const roomOptions = ROOM_TYPES[values.spaceKind] ?? [];

  return (
    <div className="border-1 border-gray-700 rounded-2xl p-4 sm:p-5">
      <h2 className="text-lg font-bold">AI Render</h2>
      <p className="mt-1 text-xs text-gray-600">
        Upload a room photo, set your parameters, and watch your space
        transform into a fully rendered design.
      </p>

      {/* Define your Space */}
      <div className="mt-4 text-sm font-bold">Define your Space</div>
      <div className="flex mt-2 gap-2">
        {SPACE_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`flex-1 border-1 border-gray-700 rounded-lg p-2 text-center text-sm cursor-pointer ${
              values.spaceKind === kind
                ? "bg-black text-white"
                : "bg-white text-black"
            }`}
            onClick={() => onChange("spaceKind", kind)}
          >
            {SPACE_KIND_LABELS[kind]}
          </button>
        ))}
      </div>

      {/* Space & Style */}
      <div className="flex mt-4 gap-4">
        <Select
          label="Space"
          value={values.roomType}
          options={roomOptions}
          onChange={(v) => onChange("roomType", v)}
          placeholder="Select Space"
        />
        <Select
          label="Style"
          value={values.style}
          options={STYLES}
          onChange={(v) => onChange("style", v)}
          placeholder="Select Style"
        />
      </div>

      {/* Prompt */}
      <div className="mt-4">
        <label className="text-sm font-bold">Prompt</label>
        <textarea
          className="w-full h-28 mt-2 border-1 border-gray-700 rounded-lg px-3 py-3 text-sm resize-none"
          placeholder="Describe the change... (optional if you set parameters, e.g. 'replace the sofa with a leather sectional')"
          value={values.prompt}
          onChange={(e) => onChange("prompt", e.target.value)}
        />
        {validationError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 whitespace-pre-line">
              {validationError}
            </p>
          </div>
        )}
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Optional */}
      <div className="mt-4 text-sm font-bold">Optional</div>
      <div className="flex mt-2 gap-4">
        <Select
          label="Lighting"
          value={values.lighting}
          options={LIGHTING_OPTIONS}
          onChange={(v) => onChange("lighting", v)}
        />
        <Select
          label="Color Palette"
          value={values.colorPalette}
          options={COLOR_PALETTES}
          onChange={(v) => onChange("colorPalette", v)}
        />
      </div>

      {/* Model */}
      <div className="mt-4">
        <label className="text-sm font-bold">Model</label>
        <select
          className="w-full mt-2 border-1 border-gray-700 rounded-lg p-2 text-sm bg-white"
          value={values.model}
          onChange={(e) => onChange("model", e.target.value)}
        >
          {MODEL_OPTIONS.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      {/* Seed behavior */}
      <label className="mt-4 flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={values.variedSeed}
          onChange={(e) => onChange("variedSeed", e.target.checked)}
        />
        Different renders every time
      </label>
    </div>
  );
}
