/**
 * Registry of image-generation models offered by the AI Visualizer.
 *
 * Single source of truth for both the API route (behavior) and the UI dropdown
 * (labels). `slug` values are Replicate model identifiers (owner/name) — edit a
 * slug here to change a model version; nothing else needs to change.
 *
 * `mode`:
 *   - "text-to-image": prompt only
 *   - "edit":          requires an input image
 *   - "both":          works with or without an input image
 */

export const DEFAULT_MODEL = "flux-kontext-pro";

export const IMAGE_MODELS = {
  "flux-kontext-pro": {
    label: "Flux Kontext Pro",
    provider: "replicate",
    slug: "black-forest-labs/flux-kontext-pro",
    mode: "edit",
    buildInput: (prompt, imageDataUrl) => ({
      prompt,
      input_image: imageDataUrl,
    }),
  },
  "nano-banana": {
    label: "Nano Banana",
    provider: "replicate",
    slug: "google/nano-banana",
    mode: "both",
    buildInput: (prompt, imageDataUrl) => ({
      prompt,
      ...(imageDataUrl ? { image_input: [imageDataUrl] } : {}),
    }),
  },
  ideogram: {
    label: "Ideogram",
    provider: "replicate",
    slug: "ideogram-ai/ideogram-v3-turbo",
    mode: "text-to-image",
    buildInput: (prompt) => ({ prompt }),
  },
  flux: {
    label: "Black Forest (FLUX)",
    provider: "replicate",
    // TODO(confirm): which FLUX model? defaulting to flux-1.1-pro.
    slug: "black-forest-labs/flux-1.1-pro",
    mode: "text-to-image",
    buildInput: (prompt) => ({ prompt }),
  },
  "m5-blaze": {
    label: "M5 Blaze",
    provider: "replicate",
    // TODO(required): set the real Replicate slug for "m5 blaze".
    slug: "",
    mode: "text-to-image",
    buildInput: (prompt) => ({ prompt }),
  },
  gemini: {
    label: "Gemini (2.5 Flash Image)",
    provider: "gemini",
    mode: "both",
  },
};

export const getModel = (value) => IMAGE_MODELS[value] ?? null;

/**
 * Lightweight list for the UI dropdown. Derived from IMAGE_MODELS so labels and
 * image requirements never drift from the registry.
 */
export const MODEL_OPTIONS = Object.entries(IMAGE_MODELS).map(
  ([value, model]) => ({
    value,
    label: model.label,
    requiresImage: model.mode === "edit",
  }),
);
