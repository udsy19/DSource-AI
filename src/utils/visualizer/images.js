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

/**
 * Validates a Gemini-style bounding box: [ymin, xmin, ymax, xmax], each an
 * integer in 0–1000 (coordinates on a virtual 1000×1000 image).
 */
export const isValidBox = (box) =>
  Array.isArray(box) &&
  box.length === 4 &&
  box.every((v) => Number.isFinite(v) && v >= 0 && v <= 1000) &&
  box[0] < box[2] &&
  box[1] < box[3];

/**
 * Crops a normalized-box region out of a data-URI image with sharp and
 * returns a PNG data URI, padded slightly and capped in size — the input to
 * the query-side embedding.
 */
export const cropBoxToDataUri = async (
  dataUri,
  box,
  { pad = 0.05, maxSize = 512 } = {}
) => {
  // Lazy-import: sharp is a native module only needed on this path.
  const { default: sharp } = await import("sharp");

  const matches = dataUri.match(/^data:[^;]+;base64,(.+)$/);
  const buffer = Buffer.from(matches ? matches[1] : dataUri, "base64");

  const image = sharp(buffer);
  const { width, height } = await image.metadata();
  if (!width || !height) {
    throw new Error("Could not read image dimensions for cropping.");
  }

  const [ymin, xmin, ymax, xmax] = box;
  const padX = Math.round(((xmax - xmin) / 1000) * width * pad);
  const padY = Math.round(((ymax - ymin) / 1000) * height * pad);

  const left = Math.max(0, Math.round((xmin / 1000) * width) - padX);
  const top = Math.max(0, Math.round((ymin / 1000) * height) - padY);
  const right = Math.min(width, Math.round((xmax / 1000) * width) + padX);
  const bottom = Math.min(height, Math.round((ymax / 1000) * height) + padY);

  const cropWidth = right - left;
  const cropHeight = bottom - top;
  if (cropWidth < 8 || cropHeight < 8) {
    throw new Error("Selected region is too small to search.");
  }

  const out = await image
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize({ width: maxSize, height: maxSize, fit: "inside" })
    .png()
    .toBuffer();

  return `data:image/png;base64,${out.toString("base64")}`;
};
