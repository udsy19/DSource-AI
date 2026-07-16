/**
 * Server-side browsing client for the live material-bank catalog API
 * (MATERIAL_BANK_API_URL). Powers the public marketplace: taxonomy-driven
 * category browsing, paginated listings, product records, and text search.
 *
 * Fork note (no-bloat): `src/utils/visualizer/material-bank.js` also talks to
 * this API but is the visualizer's reverse-search match client with its own
 * result shape; this module owns the browsing endpoints (/api/catalog,
 * /api/taxonomy, full /api/product records) — different responsibility.
 *
 * Verified response shapes (probed live):
 * - GET /api/taxonomy → { family_count, families: [{ family, products,
 *   publish_ready, categories: [{ category, omniclass, products,
 *   publish_ready, node }] }] }
 * - GET /api/catalog?category_std=&family=&min_price=&limit=&offset= →
 *   { total, count, limit, offset, items: [{ id, brand, title, category,
 *   size_mm, finish, price_unit, image_url, source_url, supplier_domain,
 *   price_inr, price_basis, family, category_std, ... }] }
 *   (`category_std` matches taxonomy category names exactly; bare `category`
 *   is a substring match on the raw supplier category — avoid it. limit ≤ 200)
 * - GET /api/product/{id} → { product: { ...record, price: { price_inr,
 *   price_unit, basis, observed_at, source_url, stale, age_days } | null,
 *   llm_content: JSON string | null }, observations: [{ price_inr,
 *   observed_at, ... }], variants, supplier: { legal_name, city, state, ... },
 *   similar: [{ id, title, image_url, supplier_domain, score, match }] }
 *   (404 for unknown ids, 422 for non-numeric)
 * - GET /api/match?q=&k= → { query, count, results: [{ id, brand, title,
 *   category, size_mm, finish, image_url, supplier_domain, score,
 *   price: { price_inr, price_unit, ... } | null }] }
 */

export const PAGE_SIZE = 24;

const TIMEOUT_MS = 15_000;

const bankBase = () => {
  const base = process.env.MATERIAL_BANK_API_URL;
  return base ? base.replace(/\/$/, "") : null;
};

/**
 * Fetches one bank endpoint with a hard timeout. Returns parsed JSON, the
 * string "not_found" for a 404, or null for any other failure — pages render
 * a "catalog unavailable" state from null instead of crashing.
 */
const fetchBank = async (path, { revalidate } = {}) => {
  const base = bankBase();
  if (!base) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      signal: controller.signal,
      ...(revalidate ? { next: { revalidate } } : { cache: "no-store" }),
    });
    if (res.status === 404) return "not_found";
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Families/categories with live counts. Cached briefly — counts move slowly. */
export const getTaxonomy = async () => {
  const data = await fetchBank("/api/taxonomy", { revalidate: 600 });
  if (!data || data === "not_found" || !Array.isArray(data.families)) {
    return null;
  }
  return data;
};

/**
 * One publish-gated catalog page. `category` must be a taxonomy category name
 * (sent as category_std). Returns { total, items, page } or null.
 */
export const getCatalogPage = async ({ category, page = 1 } = {}) => {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String((page - 1) * PAGE_SIZE),
  });
  if (category) params.set("category_std", category);
  const data = await fetchBank(`/api/catalog?${params}`);
  if (!data || data === "not_found" || !Array.isArray(data.items)) return null;
  return { total: data.total ?? data.items.length, items: data.items, page };
};

/**
 * Full product record with price observations, supplier, and similar
 * products. Returns the payload, "not_found", or null (API unreachable).
 */
export const getProduct = async (id) => {
  if (!/^\d+$/.test(String(id))) return "not_found";
  const data = await fetchBank(`/api/product/${id}`);
  if (data === "not_found") return "not_found";
  if (!data?.product) return null;
  return data;
};

/**
 * Hybrid text search. Results are normalized to the catalog-item field names
 * (price_inr/price_unit hoisted from the nested price) so listing cards
 * render either source identically. Returns an array or null on failure.
 */
export const searchCatalog = async (query, k = 48) => {
  const params = new URLSearchParams({ q: query, k: String(k) });
  const data = await fetchBank(`/api/match?${params}`);
  if (!data || data === "not_found" || !Array.isArray(data.results)) {
    return null;
  }
  return data.results.map((r) => ({
    ...r,
    price_inr: r.price?.price_inr ?? null,
    price_unit: r.price?.price_unit ?? r.price_unit ?? null,
  }));
};

const PRICE_UNIT_LABELS = {
  per_sqft: "/sq.ft",
  per_box: "/box",
  per_piece: "/piece",
  per_sqm: "/sq.m",
  per_roll: "/roll",
};

export const priceUnitLabel = (unit) => PRICE_UNIT_LABELS[unit] ?? "";

/** ₹ with Indian grouping (₹1,15,000). Null-safe: no price → "—", never fake. */
export const formatInr = (value) =>
  typeof value === "number"
    ? `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
    : "—";

/** "3 Jul 2026" from an ISO timestamp; null-safe. */
export const formatObservedDate = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * The bank's enrichment content (`llm_content`) is a JSON string with
 * description paragraphs and feature bullets. Parse defensively — it is
 * often absent or partial.
 */
export const parseEnrichment = (llmContent) => {
  if (typeof llmContent !== "string" || !llmContent) return null;
  try {
    const parsed = JSON.parse(llmContent);
    const paragraphs = Array.isArray(parsed?.description)
      ? parsed.description
          .map((d) => (typeof d?.text === "string" ? d.text : null))
          .filter(Boolean)
      : [];
    const bullets = Array.isArray(parsed?.feature_bullets)
      ? parsed.feature_bullets.filter((b) => typeof b === "string")
      : [];
    if (!paragraphs.length && !bullets.length) return null;
    return { paragraphs, bullets };
  } catch {
    return null;
  }
};
