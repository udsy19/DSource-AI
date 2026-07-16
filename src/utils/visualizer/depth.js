import { callWithRetry } from "@/utils/gemini";
import { getReplicateClient } from "@/utils/replicate";

/**
 * Monocular depth-map generation for the 3D parallax view.
 */

// Depth Anything V2 — chosen 2026-07-15: the most-used monocular depth model
// on Replicate (~2.6M runs, vs ~830k for cjwbw/midas), fast inference, and its
// grey_depth output is exactly the grayscale depth PNG the parallax view needs.
// Version-pinned: community models on Replicate require it, and pinning keeps
// the depth encoding stable under us.
export const DEPTH_MODEL =
  "chenxwh/depth-anything-v2:b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4";

/**
 * Generates a grayscale depth map for one image (data URI).
 * Returns { depth: dataUri, mimeType }. Throws on failure.
 */
export const generateDepthMap = async (imageDataUri) => {
  const replicate = getReplicateClient();
  const output = await callWithRetry(
    () => replicate.run(DEPTH_MODEL, { input: { image: imageDataUri } }),
    { label: "Depth map generation", timeoutMs: 60_000 },
  );

  const greyDepthUrl = output?.grey_depth;
  if (typeof greyDepthUrl !== "string" || !greyDepthUrl) {
    throw new Error("Depth model returned no grey_depth output");
  }

  const res = await fetch(greyDepthUrl);
  if (!res.ok) {
    throw new Error(`Failed to download depth map: HTTP ${res.status}`);
  }

  const mimeType =
    res.headers.get("content-type")?.split(";")[0] || "image/png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    depth: `data:${mimeType};base64,${buffer.toString("base64")}`,
    mimeType,
  };
};
