/**
 * Canonical parameter definitions for the AI Visualizer (Render mode).
 *
 * Single source of truth shared by the UI (dropdown options) and the API
 * route (server-side whitelist validation). Never trust client-sent values —
 * everything is validated against these lists before reaching the prompt
 * composer.
 */

export const SPACE_KINDS = ["interior", "exterior", "floor-plan"];

export const SPACE_KIND_LABELS = {
  interior: "Interior",
  exterior: "Exterior",
  "floor-plan": "Floor Plan",
};

export const ROOM_TYPES = {
  interior: [
    "Living Room",
    "Kitchen",
    "Bathroom",
    "Bedroom",
    "Dining Room",
    "Office",
  ],
  exterior: ["Facade", "Garden", "Patio", "Balcony", "Terrace", "Entrance"],
  "floor-plan": ["Apartment", "House", "Office", "Studio"],
};

export const STYLES = [
  "Modern",
  "Traditional",
  "Scandinavian",
  "Mid-Century Modern",
  "Industrial",
  "Minimalist",
  "Bohemian",
  "Japandi",
  "Art Deco",
  "Coastal",
  "Rustic Farmhouse",
  "Contemporary Luxury",
  "Wabi-Sabi",
];

export const LIGHTING_OPTIONS = [
  "Natural",
  "Warm",
  "Cool",
  "Ambient",
  "Dramatic",
  "Golden Hour",
  "Evening / Night",
  "Bright Daylight",
];

export const COLOR_PALETTES = [
  "Neutral",
  "Warm Tones",
  "Cool Tones",
  "Monochrome",
  "Bold & Vibrant",
  "Earthy",
  "Pastel",
  "Jewel Tones",
];

export const FLOORING_OPTIONS = [
  "Light Oak Hardwood",
  "Walnut Hardwood",
  "Marble",
  "Ceramic Tile",
  "Polished Concrete",
  "Terrazzo",
  "Carpet",
  "Natural Stone",
];

export const WALL_FINISHES = [
  "Painted",
  "Wallpaper",
  "Exposed Brick",
  "Wood Paneling",
  "Microcement",
  "Stone Cladding",
  "Limewash",
];

export const FURNITURE_DENSITY = ["Minimal", "Balanced", "Richly furnished"];

// UI-only swatch strips for the palette picker — the server never reads
// these; the palette *name* above is what gets validated and composed.
export const PALETTE_SWATCHES = {
  Neutral: ["#e8e3d8", "#cfc8b8", "#a79e8c", "#6e675a"],
  "Warm Tones": ["#e7c9a9", "#d99a6c", "#b65f3f", "#7c3a2d"],
  "Cool Tones": ["#d7e0e4", "#a6bcc9", "#6e93a6", "#3f5e70"],
  Monochrome: ["#f2f2f0", "#c8c8c6", "#8a8a88", "#2e2e2c"],
  "Bold & Vibrant": ["#d94a3d", "#e8a13c", "#3e7c5b", "#35449c"],
  Earthy: ["#d9c9a3", "#a98b5f", "#7a6a45", "#4c4632"],
  Pastel: ["#f0dad5", "#d8e4ee", "#e2ecd5", "#f1e8d0"],
  "Jewel Tones": ["#116b50", "#22398f", "#8e2040", "#5b2a86"],
};

export const CREATIVITY_LEVELS = ["precise", "balanced", "creative"];

// Mood board output formats — values are nano-banana aspect_ratio enums.
export const ASPECT_RATIOS = [
  { value: "4:3", label: "Landscape (4:3)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Widescreen (16:9)" },
];

export const CAD_VIEWS = [
  { value: "floor-plan", label: "Floor plan" },
  { value: "2d-view", label: "2D View" },
];

export const MAX_MOODBOARD_PRODUCTS = 6;

const optionalEnum = (value, allowed, field, errors) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push(`Invalid value for ${field}.`);
    return null;
  }
  return value;
};

/**
 * Validates raw client params against the whitelists above.
 * Unknown/junk values produce a named error rather than passing through to
 * the prompt layer.
 *
 * @returns {{ ok: boolean, errors: string[], params: object }}
 */
export const validateRenderParams = (raw = {}) => {
  const errors = [];

  const spaceKind =
    optionalEnum(raw.spaceKind, SPACE_KINDS, "spaceKind", errors) ?? "interior";

  const roomType = optionalEnum(
    raw.roomType,
    ROOM_TYPES[spaceKind] ?? [],
    "roomType",
    errors,
  );
  const style = optionalEnum(raw.style, STYLES, "style", errors);
  const lighting = optionalEnum(
    raw.lighting,
    LIGHTING_OPTIONS,
    "lighting",
    errors,
  );
  const colorPalette = optionalEnum(
    raw.colorPalette,
    COLOR_PALETTES,
    "colorPalette",
    errors,
  );
  const flooring = optionalEnum(
    raw.flooring,
    FLOORING_OPTIONS,
    "flooring",
    errors,
  );
  const wallFinish = optionalEnum(
    raw.wallFinish,
    WALL_FINISHES,
    "wallFinish",
    errors,
  );
  const furnitureDensity = optionalEnum(
    raw.furnitureDensity,
    FURNITURE_DENSITY,
    "furnitureDensity",
    errors,
  );
  const creativity =
    optionalEnum(raw.creativity, CREATIVITY_LEVELS, "creativity", errors) ??
    "balanced";

  return {
    ok: errors.length === 0,
    errors,
    params: {
      spaceKind,
      roomType,
      style,
      lighting,
      colorPalette,
      flooring,
      wallFinish,
      furnitureDensity,
      creativity,
    },
  };
};

/**
 * True when at least one visual directive is set — used to allow
 * params-only generation (no typed prompt).
 */
export const hasDirectiveParams = (params) =>
  Boolean(
    params.roomType ||
      params.style ||
      params.lighting ||
      params.colorPalette ||
      params.flooring ||
      params.wallFinish ||
      params.furnitureDensity,
  );

/**
 * Mood board params: space kind/room, palette, output aspect ratio.
 */
export const validateMoodboardParams = (raw = {}) => {
  const errors = [];

  const spaceKind =
    optionalEnum(raw.spaceKind, SPACE_KINDS, "spaceKind", errors) ?? "interior";
  const roomType = optionalEnum(
    raw.roomType,
    ROOM_TYPES[spaceKind] ?? [],
    "roomType",
    errors,
  );
  const colorPalette = optionalEnum(
    raw.colorPalette,
    COLOR_PALETTES,
    "colorPalette",
    errors,
  );
  const aspectRatio =
    optionalEnum(
      raw.aspectRatio,
      ASPECT_RATIOS.map((a) => a.value),
      "aspectRatio",
      errors,
    ) ?? "4:3";
  const creativity =
    optionalEnum(raw.creativity, CREATIVITY_LEVELS, "creativity", errors) ??
    "balanced";

  return {
    ok: errors.length === 0,
    errors,
    params: { spaceKind, roomType, colorPalette, aspectRatio, creativity },
  };
};

/**
 * Image-to-CAD params: which drawing view to produce.
 */
export const validateCadParams = (raw = {}) => {
  const errors = [];
  const view =
    optionalEnum(
      raw.view,
      CAD_VIEWS.map((v) => v.value),
      "view",
      errors,
    ) ?? "floor-plan";
  return { ok: errors.length === 0, errors, params: { view } };
};
