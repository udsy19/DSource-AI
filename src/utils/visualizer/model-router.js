import { getModel } from "@/utils/replicate-models";

/**
 * Internal model router: one place that decides which model runs each
 * visualizer task and with what IO policy, so users never choose models and
 * resolution/aspect/format stay consistent.
 *
 * Routing rationale (verified July 2026 via live Replicate schemas and
 * side-by-side generations — see git history for the A/B):
 *
 * - render/cad → flux-kontext-pro: strongest single-image instruction
 *   following for local edits and style conversions; native
 *   match_input_image aspect; PNG out (~1MP).
 * - swap → seedream-4: the only tested model that both preserved the room
 *   AND transplanted the product (nano-banana kept the room but skipped the
 *   swap; seedream with the room as the LAST input preserved scene + swap).
 *   2K output, explicit aspect computed from the room photo — with multiple
 *   inputs, "match_input_image" is ambiguous and caused the cropped-output
 *   bug.
 * - moodboard → nano-banana: proven multi-image fusion for collages; the
 *   board's aspect comes from the user's format choice, so ambiguity
 *   doesn't apply.
 *
 * IO consistency policy: every edit preserves the source photo's aspect
 * ratio (native match for single-input models, computed nearest enum for
 * multi-input); PNG wherever the model supports it; seedream at 2K.
 */
const ROUTES = {
  render: {
    modelKey: "flux-kontext-pro",
    io: { aspectRatio: "match_input_image", outputFormat: "png" },
  },
  swap: {
    modelKey: "seedream-4",
    io: { size: "2K" }, // aspectRatio computed from the room photo per-request
  },
  moodboard: {
    modelKey: "nano-banana",
    io: { outputFormat: "png" }, // aspectRatio comes from the user's format param
  },
  cad: {
    modelKey: "flux-kontext-pro",
    io: { aspectRatio: "match_input_image", outputFormat: "png" },
  },
};

/**
 * @param {"render"|"swap"|"moodboard"|"cad"} task
 * @returns {{ modelKey: string, model: object, io: object }}
 */
export const routeTask = (task) => {
  const route = ROUTES[task] ?? ROUTES.render;
  return {
    modelKey: route.modelKey,
    model: getModel(route.modelKey),
    io: { ...route.io },
  };
};
