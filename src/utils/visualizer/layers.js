/**
 * Layer graph for visualizer renders — a compact, serializable record of how
 * a render was built: base photo → edit steps → detected components → pinned
 * materials (→ optional depth-map availability, later). Stored as jsonb next
 * to each render (see supabase/migrations/20260716_render_layers.sql) so
 * future features (3D view, design history, re-editing) are pure renderers
 * over persisted data instead of re-deriving state.
 *
 * Layers hold text and coordinates ONLY — never image data. Image bytes live
 * in Supabase Storage; the graph references them implicitly via the render
 * row. Every field is length-capped, so nothing pasted into a summary/label
 * (including data: URIs) can smuggle meaningful payloads.
 *
 * All functions here are pure: untrusted client input in, a clamped,
 * schema-conforming object (or null) out.
 */

const EDIT_KINDS = new Set(["render", "swap", "moodboard", "cad"]);

const MAX_EDIT_COUNT = 100;
const MAX_EDITS = 20;
const MAX_COMPONENTS = 12;
const MAX_MATERIALS = 12;
const MAX_SUMMARY = 160;
const MAX_LABEL = 60;
const MAX_MATERIAL_ID = 40;
const MAX_MATERIAL_NAME = 120;

const clampText = (value, max) =>
  typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;

/** Normalizes to an ISO timestamp; anything unparseable becomes null. */
const toIso = (value) => {
  if (typeof value !== "string" || value.length > 64) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

// Stricter sibling of images.js's isValidBox (which allows any finite
// number): layer boxes must be integers on the 0–1000 grid, and this module
// stays dependency-free so the sanitizer is portable and trivially testable.
const isLayerBox = (box) =>
  Array.isArray(box) &&
  box.length === 4 &&
  box.every((v) => Number.isInteger(v) && v >= 0 && v <= 1000);

const sanitizeEdit = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  if (!EDIT_KINDS.has(entry.kind)) return null;
  return {
    kind: entry.kind,
    summary: clampText(entry.summary, MAX_SUMMARY) ?? "",
    at: toIso(entry.at),
  };
};

const sanitizeComponent = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  if (!isLayerBox(entry.box_2d)) return null;
  return {
    label: clampText(entry.label, MAX_LABEL) ?? "",
    category: clampText(entry.category, MAX_LABEL) ?? "",
    box_2d: entry.box_2d.slice(),
  };
};

const sanitizeMaterial = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  const id = clampText(entry.id, MAX_MATERIAL_ID);
  const name = clampText(entry.name, MAX_MATERIAL_NAME);
  if (!id && !name) return null;
  return {
    id: id ?? "",
    name: name ?? "",
    label: clampText(entry.label, MAX_LABEL) ?? "",
    price:
      typeof entry.price === "number" && Number.isFinite(entry.price)
        ? entry.price
        : null,
  };
};

const sanitizeList = (value, sanitizeEntry, max) =>
  Array.isArray(value)
    ? value.map(sanitizeEntry).filter(Boolean).slice(0, max)
    : [];

/**
 * Validates and clamps an untrusted client-sent layer graph.
 *
 * @returns {object|null} `{ version: 1, editCount, edits, components,
 *   materials }` with every field capped, or null when input is missing or
 *   not a plain object.
 */
export const sanitizeLayers = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const edits = sanitizeList(raw.edits, sanitizeEdit, MAX_EDITS);
  const components = sanitizeList(
    raw.components,
    sanitizeComponent,
    MAX_COMPONENTS,
  );
  const materials = sanitizeList(
    raw.materials,
    sanitizeMaterial,
    MAX_MATERIALS,
  );

  const count = Number(raw.editCount);
  const editCount = Number.isFinite(count)
    ? Math.min(MAX_EDIT_COUNT, Math.max(0, Math.trunc(count)))
    : edits.length;

  return { version: 1, editCount, edits, components, materials };
};
