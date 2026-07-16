import { callWithRetry } from "@/utils/gemini";
import { getReplicateClient } from "@/utils/replicate";

/**
 * Room photo → 360° equirectangular panorama for the immersive viewer.
 */

// Seedream 4 — chosen 2026-07-15 by live test: with size:"custom" it is the
// only candidate that outputs a true 4096×2048 (exact 2:1) equirectangular
// frame (flux-kontext-pro caps at ~1MP). Test run preserved the room's
// furniture, curved the floor consistently with equirect projection, and
// wrapped edge-to-edge in ~14s. Official model, so no version pin needed.
export const PANO_MODEL = "bytedance/seedream-4";

const PANO_PROMPT =
  "Extend this room photograph into a complete 360-degree equirectangular " +
  "panorama of the same room. Seamless wraparound: the left and right edges " +
  "must match perfectly. Equirectangular projection, consistent lighting " +
  "and materials.";

/**
 * Expands one room image (data URI) into an equirectangular panorama.
 * Returns { pano: dataUri, mimeType }. Throws on failure.
 */
export const generatePanorama = async (imageDataUri) => {
  const replicate = getReplicateClient();
  const output = await callWithRetry(
    () =>
      replicate.run(PANO_MODEL, {
        input: {
          prompt: PANO_PROMPT,
          image_input: [imageDataUri],
          size: "custom",
          width: 4096,
          height: 2048,
        },
      }),
    { label: "Panorama generation", timeoutMs: 120_000 },
  );

  const panoUrl = Array.isArray(output) ? output[0] : output;
  if (typeof panoUrl !== "string" || !panoUrl) {
    throw new Error("Panorama model returned no image output");
  }

  const res = await fetch(panoUrl);
  if (!res.ok) {
    throw new Error(`Failed to download panorama: HTTP ${res.status}`);
  }

  const mimeType =
    res.headers.get("content-type")?.split(";")[0] || "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    pano: `data:${mimeType};base64,${buffer.toString("base64")}`,
    mimeType,
  };
};
