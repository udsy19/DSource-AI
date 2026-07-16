/**
 * Registry of image models available to the AI Visualizer.
 *
 * Users never pick models — utils/visualizer/model-router.js decides per
 * task. Each entry declares its capabilities (verified against the live
 * Replicate schemas, July 2026) and how to build its input.
 *
 * `buildInput(prompt, imageDataUrl, opts)` — opts may carry:
 *   images[]      multi-image inputs (models with multiImage)
 *   aspectRatio   explicit output aspect (enum per model)
 *   outputFormat  "png"/"jpg" where supported
 *   size          seedream: "1K" | "2K" | "4K"
 *   exactSize     seedream: { width, height } in px (1024–4096) — exact
 *                 output size via size:"custom"; takes precedence over
 *                 size + aspectRatio
 *   seed          models with supportsSeed
 */

export const IMAGE_MODELS = {
  "flux-kontext-pro": {
    label: "Flux Kontext Pro",
    provider: "replicate",
    slug: "black-forest-labs/flux-kontext-pro",
    mode: "edit",
    supportsSeed: true,
    // ~1MP output; aspect list incl. match_input_image (default).
    buildInput: (prompt, imageDataUrl, opts = {}) => ({
      prompt,
      input_image: imageDataUrl,
      aspect_ratio: opts.aspectRatio ?? "match_input_image",
      output_format: opts.outputFormat ?? "png",
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
    }),
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
      aspect_ratio: opts.aspectRatio ?? "match_input_image",
      output_format: opts.outputFormat ?? "png",
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
    }),
  },
  "nano-banana": {
    label: "Nano Banana",
    provider: "replicate",
    slug: "google/nano-banana",
    mode: "edit",
    multiImage: true,
    // ~1MP output. CAUTION: with multiple inputs its default
    // "match_input_image" aspect is ambiguous — always pass one explicitly.
    aspectRatios: [
      "match_input_image",
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9",
    ],
    buildInput: (prompt, imageDataUrl, opts = {}) => {
      const images = opts.images ?? (imageDataUrl ? [imageDataUrl] : []);
      return {
        prompt,
        ...(images.length ? { image_input: images } : {}),
        aspect_ratio: opts.aspectRatio ?? "match_input_image",
        output_format: opts.outputFormat ?? "png",
      };
    },
  },
  "seedream-4": {
    label: "Seedream 4",
    provider: "replicate",
    slug: "bytedance/seedream-4",
    mode: "edit",
    multiImage: true,
    // Up to 4K output; 1-10 input images. A/B tested: treats the LAST image
    // as the canvas/base — order references first, base last.
    aspectRatios: [
      "match_input_image",
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "3:2",
      "2:3",
      "21:9",
    ],
    buildInput: (prompt, imageDataUrl, opts = {}) => {
      const images = opts.images ?? (imageDataUrl ? [imageDataUrl] : []);
      // Exact pixel output (schema: size "custom" + width/height 1024–4096,
      // same call shape the pano pipeline uses at 4096×2048) beats the
      // preset+enum path, which snaps the source ratio to the nearest enum
      // and bakes the reframing into the pixels.
      const exact =
        opts.exactSize?.width && opts.exactSize?.height ? opts.exactSize : null;
      return {
        prompt,
        ...(images.length ? { image_input: images } : {}),
        ...(exact
          ? { size: "custom", width: exact.width, height: exact.height }
          : {
              size: opts.size ?? "2K",
              aspect_ratio: opts.aspectRatio ?? "match_input_image",
            }),
      };
    },
  },
  "qwen-image-edit": {
    label: "Qwen Image Edit",
    provider: "replicate",
    slug: "qwen/qwen-image-edit",
    mode: "edit",
    supportsSeed: true,
    buildInput: (prompt, imageDataUrl, opts = {}) => ({
      prompt,
      image: imageDataUrl,
      output_format: opts.outputFormat ?? "png",
      ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
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
