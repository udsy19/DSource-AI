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
    // Catalog products resolve their canonical image server-side by bank id
    // — the client-supplied URL is never fetched (bank suppliers span
    // hundreds of CDNs no whitelist can cover; the bank is the authority).
    const bankId = Number(typeof entry === "object" ? entry?.id : Number.NaN);
    if (Number.isSafeInteger(bankId)) {
      const { isMaterialBankConfigured, getBankProduct } = await import(
        "@/utils/visualizer/material-bank"
      );
      if (isMaterialBankConfigured()) {
        try {
          const product = await getBankProduct(bankId);
          if (product?.imageUrl) {
            const res = await fetch(product.imageUrl);
            if (res.ok) {
              const dataUri = await toDataUri(res);
              if (dataUri.length <= MAX_IMAGE_CHARS) {
                images.push(dataUri);
                continue;
              }
            }
          }
        } catch {
          // Fall through to the URL path below.
        }
      }
    }

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
  // Tight padding: too much context around the item skews both the CLIP
  // embedding and the Gemini description toward the surroundings.
  { pad = 0.02, maxSize = 512 } = {},
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

/**
 * Shrinks a generated image before a vision-model judgement call. Adherence
 * verification doesn't need megapixels — a 640px JPEG uploads in a fraction
 * of the time of the full render and judges identically. Fail-open: on any
 * sharp error the original image is returned untouched.
 */
export const shrinkForVision = async ({ data, mimeType }, maxDim = 640) => {
  try {
    const { default: sharp } = await import("sharp");
    const out = await sharp(Buffer.from(data, "base64"))
      .resize({
        width: maxDim,
        height: maxDim,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    return { data: out.toString("base64"), mimeType: "image/jpeg" };
  } catch {
    return { data, mimeType };
  }
};

/**
 * Reads an image's pixel dimensions from a data URI (or raw base64).
 * Returns { width, height } or null when they can't be determined.
 */
export const imageDimensions = async (dataUri) => {
  const { default: sharp } = await import("sharp");
  const matches = dataUri.match(/^data:[^;]+;base64,(.+)$/);
  const buffer = Buffer.from(matches ? matches[1] : dataUri, "base64");
  try {
    const { width, height } = await sharp(buffer).metadata();
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
};

/**
 * Scales source dimensions into a model's valid custom-size range while
 * preserving the exact aspect ratio (long edge → `longEdge`, both dims
 * clamped to [minDim, maxDim], rounded to `multiple`). Defaults match
 * seedream-4's `size:"custom"` schema (width/height 1024–4096 — the pano
 * pipeline already generates at 4096×2048 this way). Returns null when the
 * ratio is too extreme to fit without distorting >1.5% — callers should
 * fall back to the nearest aspect enum.
 */
export const fitExactSize = (
  { width, height },
  { longEdge = 2048, minDim = 1024, maxDim = 4096, multiple = 8 } = {},
) => {
  if (!width || !height) return null;
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  let scale = longEdge / long;
  if (short * scale < minDim) scale = minDim / short;
  if (long * scale > maxDim) scale = maxDim / long;

  const snap = (v) =>
    Math.min(
      maxDim,
      Math.max(minDim, Math.round((v * scale) / multiple) * multiple),
    );
  const out = { width: snap(width), height: snap(height) };
  const drift = Math.abs(out.width / out.height / (width / height) - 1);
  return drift <= 0.015 ? out : null;
};

/**
 * Center-crops a generated image back to the room photo's true aspect ratio
 * when the model returned a differently framed output (seedream aspect
 * enums, flux "match_input_image" drift). Within `tolerance` the image is
 * returned untouched; fail-open on any sharp error.
 *
 * @returns {Promise<{ image: string, mimeType: string }>} base64 (no data: prefix)
 */
export const cropToRatio = async (
  imageBase64,
  mimeType,
  targetRatio,
  tolerance = 0.015,
) => {
  try {
    if (!Number.isFinite(targetRatio) || targetRatio <= 0) {
      return { image: imageBase64, mimeType };
    }
    const { default: sharp } = await import("sharp");
    const image = sharp(Buffer.from(imageBase64, "base64"));
    const { width, height } = await image.metadata();
    if (!width || !height) return { image: imageBase64, mimeType };

    const ratio = width / height;
    if (Math.abs(ratio / targetRatio - 1) <= tolerance) {
      return { image: imageBase64, mimeType };
    }

    const cropWidth =
      ratio > targetRatio ? Math.round(height * targetRatio) : width;
    const cropHeight =
      ratio > targetRatio ? height : Math.round(width / targetRatio);
    const extracted = image.extract({
      left: Math.floor((width - cropWidth) / 2),
      top: Math.floor((height - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight,
    });

    // Re-encode in the incoming format family (JPEG stays JPEG for payload
    // size — see model-router's io policy; everything else normalizes to PNG).
    const isJpeg = /jpe?g/i.test(mimeType);
    const out = await (isJpeg
      ? extracted.jpeg({ quality: 90 })
      : extracted.png()
    ).toBuffer();
    return {
      image: out.toString("base64"),
      mimeType: isJpeg ? "image/jpeg" : "image/png",
    };
  } catch {
    return { image: imageBase64, mimeType };
  }
};

/**
 * Picks the closest supported aspect-ratio enum ("3:2", "4:3", ...) for an
 * image. Needed for multi-input models where "match_input_image" is
 * ambiguous (it caused cropped swap outputs).
 */
export const aspectRatioFromImage = async (dataUri, supported) => {
  const dims = await imageDimensions(dataUri);
  if (!dims) return null;

  const ratio = dims.width / dims.height;
  let best = null;
  let bestDiff = Infinity;
  for (const option of supported) {
    if (!option.includes(":")) continue;
    const [w, h] = option.split(":").map(Number);
    if (!w || !h) continue;
    const diff = Math.abs(Math.log(ratio / (w / h)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = option;
    }
  }
  return best;
};
