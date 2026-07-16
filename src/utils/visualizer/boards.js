import { isAllowedImageHost } from "@/utils/image-hosts.mjs";

/**
 * Server-side validation for The Pinning Table (mood boards). Shared by the
 * /api/boards routes. Schema lives in supabase/migrations/20260718_boards.sql.
 *
 * Distinct from utils/visualizer/images.js: that module normalizes images for
 * generation (downloads to data URIs); this one validates persisted board
 * rows without ever fetching anything.
 */

export const BOARD_ITEM_KINDS = ["product", "swatch", "text", "image"];
export const MAX_BOARD_ITEMS = 80;
export const MAX_BOARD_NAME_LENGTH = 80;
export const MAX_CAPTION_LENGTH = 300;
// ~2MB of data-URI characters. Covers pinned generated images, which the
// client downscales before syncing.
export const MAX_ITEM_IMAGE_CHARS = 2 * 1024 * 1024;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value) =>
  typeof value === "string" && UUID_RE.test(value);

/**
 * "Table missing" — the 20260718_boards migration hasn't been applied.
 * Postgres raises 42P01 (undefined_table); PostgREST surfaces it as PGRST205
 * ("Could not find the table ... in the schema cache") — verified live.
 */
export const isUndefinedTable = (error) =>
  error?.code === "42P01" ||
  error?.code === "PGRST205" ||
  /does not exist|could not find the table/i.test(error?.message ?? "");

/**
 * An item image may be: a data URI (small — pinned render covers), an https
 * URL on a whitelisted host, or our own Supabase storage. Catalog products
 * (items carrying a bank productId) may reference any https host — the
 * material bank spans hundreds of supplier CDNs, these URLs are only ever
 * rendered by the owner's own browser, and the server never fetches them
 * (generation resolves the canonical image by productId instead).
 */
export const isAllowedItemImageUrl = (
  url,
  { isCatalogProduct = false } = {},
) => {
  if (typeof url !== "string" || !url) return false;
  if (url.startsWith("data:image/")) return url.length <= MAX_ITEM_IMAGE_CHARS;
  if (isCatalogProduct) {
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  }
  if (isAllowedImageHost(url)) return true;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(supabaseUrl && url.startsWith(`${supabaseUrl}/storage/`));
};

const inRange = (value, min, max) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

/**
 * Validates and normalizes one client-sent board item into a DB row shape
 * (without board_id). Returns { row } or { error }.
 */
export const sanitizeBoardItem = (raw, index) => {
  const at = `Item ${index + 1}`;
  if (!raw || typeof raw !== "object")
    return { error: `${at} is not an object.` };
  if (!BOARD_ITEM_KINDS.includes(raw.kind)) {
    return { error: `${at} has an unknown kind.` };
  }
  if (raw.id !== undefined && raw.id !== null && !isUuid(raw.id)) {
    return { error: `${at} has an invalid id.` };
  }
  if (!inRange(raw.x, 0, 1) || !inRange(raw.y, 0, 1)) {
    return { error: `${at} position must be within the board (0..1).` };
  }
  if (!inRange(raw.w, 0.02, 1)) {
    return { error: `${at} width must be between 0.02 and 1.` };
  }
  const hasH = raw.h !== undefined && raw.h !== null;
  if (hasH && !inRange(raw.h, 0.02, 1)) {
    return { error: `${at} height must be between 0.02 and 1.` };
  }
  if (!inRange(raw.rotation ?? 0, -180, 180)) {
    return { error: `${at} rotation must be between -180 and 180.` };
  }
  if (!Number.isInteger(raw.z ?? 0) || Math.abs(raw.z ?? 0) > 10_000) {
    return { error: `${at} has an invalid layer order.` };
  }

  let productId = null;
  if (raw.productId !== undefined && raw.productId !== null) {
    productId = Number(raw.productId);
    if (!Number.isSafeInteger(productId)) {
      return { error: `${at} has an invalid product reference.` };
    }
  }

  let imageUrl = null;
  if (raw.imageUrl !== undefined && raw.imageUrl !== null) {
    const isCatalogProduct = raw.kind === "product" && productId !== null;
    if (!isAllowedItemImageUrl(raw.imageUrl, { isCatalogProduct })) {
      return { error: `${at} has an image from an unrecognized source.` };
    }
    imageUrl = raw.imageUrl;
  }
  if ((raw.kind === "product" || raw.kind === "image") && !imageUrl) {
    return { error: `${at} (${raw.kind}) needs an image.` };
  }

  let caption = null;
  if (raw.caption !== undefined && raw.caption !== null) {
    if (typeof raw.caption !== "string")
      return { error: `${at} caption must be text.` };
    caption = raw.caption.slice(0, MAX_CAPTION_LENGTH);
  }

  let props = {};
  if (raw.props !== undefined && raw.props !== null) {
    if (typeof raw.props !== "object" || Array.isArray(raw.props)) {
      return { error: `${at} props must be an object.` };
    }
    if (JSON.stringify(raw.props).length > 2000) {
      return { error: `${at} props are too large.` };
    }
    props = raw.props;
  }

  return {
    row: {
      ...(raw.id ? { id: raw.id } : {}),
      kind: raw.kind,
      product_id: productId,
      image_url: imageUrl,
      x: raw.x,
      y: raw.y,
      w: raw.w,
      h: hasH ? raw.h : null,
      rotation: raw.rotation ?? 0,
      z: raw.z ?? 0,
      caption,
      props,
    },
  };
};

/** Maps a DB item row to the client shape (camelCase). */
export const itemRowToClient = (row) => ({
  id: row.id,
  kind: row.kind,
  productId: row.product_id,
  imageUrl: row.image_url,
  x: row.x,
  y: row.y,
  w: row.w,
  h: row.h,
  rotation: row.rotation,
  z: row.z,
  caption: row.caption,
  props: row.props ?? {},
});

/**
 * Validates a board palette: an array of up to 8 hex colors.
 * Returns the normalized array, or undefined when invalid.
 */
export const sanitizePalette = (palette) => {
  if (!Array.isArray(palette) || palette.length > 8) return undefined;
  const hexes = palette.filter(
    (c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c),
  );
  return hexes.length === palette.length
    ? hexes.map((c) => c.toLowerCase())
    : undefined;
};
