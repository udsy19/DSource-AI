import Replicate from "replicate";
import { callWithRetry } from "@/utils/gemini";

/**
 * Image embeddings for reverse material search.
 *
 * CONTRACT: the catalog backfill (scripts/backfill-embeddings.mjs) and the
 * query path must use the SAME model — nearest-neighbor search is only
 * meaningful within one embedding space. If you change EMBEDDING_MODEL,
 * re-run the backfill and update vector(768) in the migration if the
 * dimension changes.
 */

// CLIP ViT-L/14 — image and text share one 768-dim space.
// Version-pinned: community models on Replicate require it, and pinning
// guarantees the space never shifts under us.
export const EMBEDDING_MODEL =
  "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a";
export const EMBEDDING_DIM = 768;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  useFileOutput: false,
});

/**
 * Embeds one image (https URL or data URI) → 768-dim vector.
 */
export const embedImage = async (imageUrlOrDataUri) => {
  const output = await callWithRetry(
    () => replicate.run(EMBEDDING_MODEL, { input: { inputs: imageUrlOrDataUri } }),
    { label: "Image embedding", timeoutMs: 60_000 }
  );

  const embedding = Array.isArray(output) ? output[0]?.embedding : null;
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) {
    throw new Error(
      `Embedding failed: expected ${EMBEDDING_DIM} dims, got ${embedding?.length ?? "none"}`
    );
  }
  return embedding;
};
