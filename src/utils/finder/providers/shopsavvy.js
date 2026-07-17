import { domainOf, normalizeGtin } from "../score.js";

/**
 * ShopSavvy Data API — identifier in, offers across retailers out.
 *
 * The closest thing to a real "barcode -> every seller" endpoint that exists.
 * Barcode-lookup services mostly return metadata, not offers; Amazon's Creators
 * API takes ASIN only and has no GTIN input at all.
 *
 * WIRE FORMAT — verified against the live API 2026-07-16, not from docs. The
 * docs are thin and the obvious guesses are all wrong, so if you change this,
 * probe the API rather than trusting a summary:
 *
 *   GET /v1/products?ids=<id>          -> product metadata (1 credit)
 *   GET /v1/products/offers?ids=<id>   -> product WITH nested offers (3 credits)
 *
 *   * The param is `ids` (plural). `barcode=`/`asin=`/`id=` all return
 *     ERR_IDENTIFIER_REQUIRED even when a valid identifier is supplied.
 *   * `/v1/offers` and `/v1/products/{id}/offers` do not exist (404).
 *   * Response is { success, data: [product], meta }. Offers are nested at
 *     data[0].offers — NOT data.offers.
 *   * The offer's link field is `URL`, UPPERCASE. `url` is undefined.
 *   * `availability` is the literal string "in", or null. Not "in stock".
 *   * `meta.credits_remaining` reads 0 on ERROR responses regardless of the
 *     real balance — do not infer billing state from a failed call.
 *
 * DATA QUALITY — measured, not assumed. One real barcode returned 51 offers
 * with timestamps spanning 2017-01-01 to 2026-07-07 and prices from $0.75 to
 * $96.05 (median $11.75). Breadth is real; precision is not. Two consequences:
 *   1. Every offer carries observedAt, and stale ones are labeled, never
 *      presented as a live price.
 *   2. Same-barcode listings genuinely differ (pack sizes, single units), so
 *      price alone is a weak counterfeit signal on this source.
 */

const BASE = "https://api.shopsavvy.com/v1";
const TIMEOUT_MS = 25_000;

/** Older than this and a price is history, not an offer. */
const STALE_AFTER_DAYS = 90;

export const isShopSavvyConfigured = () =>
  Boolean(process.env.SHOPSAVVY_API_KEY);

/**
 * @param {{kind: string, value: string}} key from searchKeyFor()
 * @param {{now?: number}} [options] injectable clock, so staleness is testable
 * @returns {Promise<object[]>} offers in the pipeline's shape
 */
export const searchShopSavvy = async (key, { now = Date.now() } = {}) => {
  if (!isShopSavvyConfigured()) return [];
  // Text queries are not an identifier lookup — spending 3 credits to
  // fuzzy-match a description is what the visual providers already do free.
  if (!key || key.kind === "text") return [];

  const url = `${BASE}/products/offers?ids=${encodeURIComponent(key.value)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.SHOPSAVVY_API_KEY}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`ShopSavvy returned ${res.status}`);
  }

  const body = await res.json();
  if (body?.success === false) {
    throw new Error(
      `ShopSavvy: ${body?.error_detail?.code ?? body?.error ?? "unknown error"}`,
    );
  }

  const product = Array.isArray(body?.data) ? body.data[0] : null;
  if (!product) return [];

  const identifiers = identifiersOf(product, key);

  return (Array.isArray(product.offers) ? product.offers : [])
    .map((offer) => toOffer(offer, product, identifiers, now))
    .filter(Boolean);
};

const toOffer = (offer, product, identifiers, now) => {
  // UPPERCASE. This is not a typo.
  const url = offer?.URL;
  if (typeof url !== "string" || !url) return null;

  const price =
    typeof offer.price === "number" && offer.price > 0 ? offer.price : null;

  const observedAt =
    typeof offer.timestamp === "string" ? offer.timestamp : null;
  const ageDays = observedAt
    ? Math.floor((now - Date.parse(observedAt)) / 86_400_000)
    : null;

  return {
    seller: offer.retailer ?? domainOf(url),
    // `seller` on a ShopSavvy offer means the marketplace sub-seller (present
    // on ~45% of them) — a different thing from the retailer, and a signal
    // worth keeping rather than flattening away.
    marketplaceSeller: offer.seller ?? null,
    domain: domainOf(url),
    url,
    title: product.title ?? null,
    brand: product.brand ?? null,
    imageUrl: Array.isArray(product.images)
      ? (product.images[0] ?? null)
      : null,
    // ShopSavvy publishes no per-offer photo — the above is the PRODUCT's
    // image, identical across every offer. Say so explicitly, or the
    // reused-photo detector sees N sellers "sharing" one picture and flags the
    // whole result set as a dropshipping ring. That signal only means anything
    // when the image is genuinely the seller's own.
    imageIsProductLevel: true,
    price: price ? { value: price, currency: offer.currency ?? "USD" } : null,
    inStock: offer.availability === "in" ? true : null,
    condition: offer.condition ?? null,
    observedAt,
    // Surfaced so the ledger can say "price from 2019" instead of implying now.
    priceStale: Number.isFinite(ageDays) && ageDays > STALE_AFTER_DAYS,
    ageDays: Number.isFinite(ageDays) ? ageDays : null,
    identifiers,
    source: "shopsavvy",
  };
};

/**
 * The identifier we looked up is this product's identifier — that's the
 * premise of the endpoint, and it's what lifts these offers above LOW. Prefer
 * what the API itself reports over what we asked for.
 */
const identifiersOf = (product, key) => {
  const identifiers = {};

  const gtin = normalizeGtin(
    product?.barcode ??
      product?.identifiers?.barcode ??
      (key.kind === "gtin" ? key.value : null),
  );
  if (gtin) identifiers.gtin = gtin;

  const mpn = product?.mpn ?? product?.model;
  if (typeof mpn === "string" && mpn) identifiers.mpn = mpn;

  const asin = product?.amazon ?? product?.identifiers?.amazon;
  if (typeof asin === "string" && asin) identifiers.asin = asin;
  else if (key.kind === "asin") identifiers.asin = key.value;

  return identifiers;
};
