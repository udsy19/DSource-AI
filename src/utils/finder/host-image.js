import { randomUUID } from "node:crypto";
import {
  RENDERS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/utils/visualizer/persist";

/**
 * Publishes the query image at a temporarily-reachable URL.
 *
 * Needed because SerpAPI's google_lens takes a `url` and has no upload path —
 * the image must be fetchable by a third party before we can search with it.
 * The Shopify catalog's `like` parameter has the same requirement.
 *
 * Signed URLs are unguessable and expire in an hour, which is the right shape
 * here: long enough for a provider to fetch it mid-search, short enough that a
 * leaked link goes dead. Storage RLS keys on the first path segment, so the
 * path MUST start with the user's id or the write is rejected.
 *
 * The upload is deleted at the end of the search — see `unhostQueryImage`.
 * A user's photo of their own room is not ours to keep around.
 */

const MIME_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const hostQueryImage = async (supabase, userId, dataUri) => {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUri ?? "");
  if (!match) return null;

  const [, mimeType, base64] = match;
  const ext = MIME_EXT[mimeType];
  if (!ext) return null;

  const path = `${userId}/finder/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(RENDERS_BUCKET)
    .upload(path, Buffer.from(base64, "base64"), {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error("Query image upload failed:", error.message);
    return null;
  }

  const { data, error: signError } = await supabase.storage
    .from(RENDERS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (signError || !data?.signedUrl) {
    console.error("Query image signing failed:", signError?.message);
    await supabase.storage.from(RENDERS_BUCKET).remove([path]);
    return null;
  }

  return { url: data.signedUrl, path };
};

/**
 * Best-effort cleanup. Failure here is not worth failing a search over — the
 * object expires from usefulness with its signature regardless.
 */
export const unhostQueryImage = async (supabase, path) => {
  if (!path) return;
  try {
    await supabase.storage.from(RENDERS_BUCKET).remove([path]);
  } catch (error) {
    console.error("Query image cleanup skipped:", error.message);
  }
};
