/**
 * Registry of image-generation models offered by the AI Visualizer.
 *
 * The visualizer is image-edit-first: the user uploads a room photo (the base)
 * and describes the change, so every model requires an input image and edits it
 * rather than generating from scratch. `slug` values are Replicate model
 * identifiers (owner/name) — edit a slug here to change a model; nothing else
 * needs to change.
 *
 * `mode`:
 *   - "edit": requires an input image (all current models)
 *
 * `buildInput(prompt, imageDataUrl)` returns the model-specific input object.
 * The route guarantees `imageDataUrl` is present before calling it.
 */

export const DEFAULT_MODEL = "flux-kontext-pro";

export const IMAGE_MODELS = {
  "flux-kontext-pro": {
    label: "Flux Kontext Pro",
    provider: "replicate",
    slug: "black-forest-labs/flux-kontext-pro",
    mode: "edit",
    supportsSeed: true,
    buildInput: (prompt, imageDataUrl, opts = {}) => ({
      prompt,
      input_image: imageDataUrl,
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
    }),
  },
  "nano-banana": {
    label: "Nano Banana",
    provider: "replicate",
    slug: "google/nano-banana",
    mode: "edit",
    // Fuses up to 14 input images and supports explicit output aspect ratios —
    // the only Replicate model here suited to multi-product mood boards.
    multiImage: true,
    buildInput: (prompt, imageDataUrl, opts = {}) => {
      const images = opts.images ?? (imageDataUrl ? [imageDataUrl] : []);
      return {
        prompt,
        ...(images.length ? { image_input: images } : {}),
        ...(opts.aspectRatio ? { aspect_ratio: opts.aspectRatio } : {}),
      };
    },
  },
  "flux-kontext-max": {
    label: "Black Forest (Kontext Max)",
    provider: "replicate",
    slug: "black-forest-labs/flux-kontext-max",
    mode: "edit",
    supportsSeed: true,
    buildInput: (prompt, imageDataUrl, opts = {}) => ({
      prompt,
      input_image: imageDataUrl,
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
    }),
  },
  "qwen-image-edit": {
    label: "Qwen Image Edit",
    provider: "replicate",
    slug: "qwen/qwen-image-edit",
    mode: "edit",
    buildInput: (prompt, imageDataUrl) => ({
      prompt,
      image: imageDataUrl,
    }),
  },
  "m5-blaze": {
    label: "M5 Blaze",
    provider: "replicate",
    // TODO(required): set the real Replicate slug for "m5 blaze", then confirm
    // its image-input field name and update buildInput accordingly.
    slug: "",
    mode: "edit",
    buildInput: (prompt, imageDataUrl) => ({
      prompt,
      input_image: imageDataUrl,
    }),
  },
  gemini: {
    label: "Gemini (2.5 Flash Image)",
    provider: "gemini",
    mode: "edit",
    // The Gemini backend passes any number of inline images natively.
    multiImage: true,
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

/** Models capable of multi-image fusion — the mood board's dropdown. */
export const MOODBOARD_MODEL_OPTIONS = Object.entries(IMAGE_MODELS)
  .filter(([, model]) => model.multiImage)
  .map(([value, model]) => ({ value, label: model.label }));

export const DEFAULT_MOODBOARD_MODEL = "nano-banana";
