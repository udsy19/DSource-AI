import { isAllowedImageHost } from "@/utils/image-hosts.mjs";
import { MAX_MOODBOARD_PRODUCTS } from "@/utils/visualizer/params";

/**
 * Server-side image intake for the visualizer. All external fetches are
 * whitelist-gated (own Supabase storage, or the product-image hosts shared
 * with next.config) to prevent SSRF.
 */

// Frontend caps uploads at 10MB; base64 inflates by ~4/3, so allow headroom.
export const MAX_IMAGE_CHARS = 20_000_000;

const toDataUri = async (res) => {
  const buffer = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
};

/**
 * Normalizes the edit-base image to a data URI. Accepts data URIs / raw
 * base64 as-is; https URLs are downloaded server-side ONLY when they point at
 * our own Supabase storage (history items use short-lived signed URLs).
 */
export const normalizeBaseImage = async (image) => {
  if (!image.startsWith("http")) {
    return { image, error: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !image.startsWith(`${supabaseUrl}/storage/`)) {
    return {
      image: null,
      error: "Image URLs are not accepted — upload the photo directly.",
    };
  }

  const res = await fetch(image);
  if (!res.ok) {
    return {
      image: null,
      error:
        "That render is no longer available — please re-select or re-upload it.",
    };
  }
  return { image: await toDataUri(res), error: null };
};

/**
 * Normalizes mood-board product images. Each entry may be a data URI or an
 * https URL on a whitelisted product-image host (the catalog's own hosts).
 * Failures are collected per-image so one broken product doesn't sink the
 * whole board.
 *
 * @returns {Promise<{ images: string[], errors: string[] }>}
 */
export const normalizeProductImages = async (products) => {
  if (!Array.isArray(products)) return { images: [], errors: [] };
  if (products.length > MAX_MOODBOARD_PRODUCTS) {
    return {
      images: [],
      errors: [`Select at most ${MAX_MOODBOARD_PRODUCTS} products.`],
    };
  }

  const images = [];
  const errors = [];

  for (const entry of products) {
    const url = typeof entry === "string" ? entry : entry?.imageUrl;
    if (!url || typeof url !== "string") {
      errors.push("A selected product had no image.");
      continue;
    }

    if (url.startsWith("data:")) {
      if (url.length <= MAX_IMAGE_CHARS) images.push(url);
      else errors.push("A product image was too large and was skipped.");
      continue;
    }

    if (!isAllowedImageHost(url)) {
      errors.push(
        "A product image came from an unrecognized host and was skipped.",
      );
      continue;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) {
        errors.push("A product image could not be downloaded and was skipped.");
        continue;
      }
      const dataUri = await toDataUri(res);
      if (dataUri.length > MAX_IMAGE_CHARS) {
        errors.push("A product image was too large and was skipped.");
        continue;
      }
      images.push(dataUri);
    } catch {
      errors.push("A product image could not be downloaded and was skipped.");
    }
  }

  return { images, errors };
};
