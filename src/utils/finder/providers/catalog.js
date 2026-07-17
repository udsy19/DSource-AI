import { embedImage } from "@/utils/visualizer/embeddings";
import {
  isMaterialBankConfigured,
  searchMaterialBank,
} from "@/utils/visualizer/material-bank";

/**
 * DSource's own catalog — the material bank when configured, else the user's
 * Supabase catalog via CLIP + pgvector.
 *
 * WHY THIS PROVIDER RUNS FIRST, and why it matters more here than anywhere:
 *
 * Furniture and homeware — DSource's core — are the worst category on the open
 * web for exact matching (~40-55%; usually no GTIN; visual-only, where the best
 * open models reach ~43% R@1 against a large distractor set). The open web has
 * no identifier to join on for a walnut lounge chair.
 *
 * Our catalog does. A catalog hit yields a known-good brand/series/product
 * identity, which converts the fan-out from "search this fuzzy description"
 * into "search this specific product" — the same move a GTIN makes for
 * electronics. That is why catalog runs first and its result seeds the others,
 * rather than being just one more source to union in.
 *
 * It is also the only part of this pipeline that is a moat. Every other
 * provider is a broker anyone can rent.
 */

const CANDIDATE_COUNT = 8;

export const isCatalogConfigured = () =>
  isMaterialBankConfigured() || Boolean(process.env.REPLICATE_API_TOKEN);

/**
 * Searches the catalog by image (CLIP/pgvector) or by text (material bank).
 *
 * @param {object} params
 * @param {string} [params.imageDataUri] query image, for the vector path
 * @param {string} [params.query] text query, for the material-bank path
 * @param {object} [params.supabase] server client, required for the vector path
 * @param {string} [params.category] optional category filter
 * @returns {Promise<object[]>} offers in the pipeline's shape
 */
export const searchCatalog = async ({
  imageDataUri,
  query,
  supabase,
  category = null,
}) => {
  if (isMaterialBankConfigured() && query) {
    const results = await searchMaterialBank(query, CANDIDATE_COUNT);
    return results.map(bankToOffer).filter(Boolean);
  }

  if (!imageDataUri || !supabase || !process.env.REPLICATE_API_TOKEN) return [];

  const embedding = await embedImage(imageDataUri);
  let { data: rows } = await supabase.rpc("match_products", {
    query_embedding: embedding,
    match_count: CANDIDATE_COUNT,
    filter_category: category,
  });

  // A category filter that returns nothing usually means the catalog labels
  // things differently, not that there's no match — retry unfiltered rather
  // than reporting an empty catalog.
  if ((rows ?? []).length === 0 && category) {
    const retry = await supabase.rpc("match_products", {
      query_embedding: embedding,
      match_count: CANDIDATE_COUNT,
      filter_category: null,
    });
    rows = retry.data;
  }

  return (rows ?? []).map(rowToOffer).filter(Boolean);
};

/**
 * A material-bank result is a supplier's listing — a real offer with a price.
 */
const bankToOffer = (result) => {
  if (!result?.sourceUrl && !result?.id) return null;
  return {
    seller: result.brand ?? result.supplier ?? "Material bank",
    domain: result.supplier ?? null,
    url: result.sourceUrl ?? null,
    title: result.name ?? null,
    brand: result.brand ?? null,
    imageUrl: result.imageUrl ?? null,
    price: result.price ? { value: result.price, currency: "INR" } : null,
    priceUnit: result.priceUnit ?? null,
    priceStale: Boolean(result.priceStale),
    visualScore: typeof result.score === "number" ? result.score : null,
    identifiers: {},
    catalogId: result.id,
    source: "catalog",
  };
};

/**
 * A Supabase catalog row is an internal product, not a seller's listing — it
 * links to our own marketplace rather than out to a retailer.
 */
const rowToOffer = (row) => {
  if (!row?.id) return null;
  return {
    seller: row.brand_name ?? "DSource catalog",
    domain: null,
    url: `/marketplace/products/${row.product_id ?? row.id}`,
    title: row.product_name ?? null,
    brand: row.brand_name ?? null,
    imageUrl: row.image_url ?? null,
    price: null,
    visualScore: typeof row.similarity === "number" ? row.similarity : null,
    identifiers: {},
    catalogId: row.id,
    internal: true,
    source: "catalog",
  };
};

/**
 * Promotes the best catalog hit into an identity the other providers can
 * search on. This is the bridge that makes catalog-first worth doing: without
 * it we'd search the open web with a vague description; with it we search for
 * a named product.
 *
 * Threshold rationale: cosine similarity below ~0.8 on CLIP is a family
 * resemblance, not the same object, and seeding the fan-out from a wrong
 * identity is worse than seeding it from none — every downstream provider then
 * confidently finds the wrong product.
 */
const SEED_THRESHOLD = 0.8;

export const identityFromCatalog = (offers) => {
  const best = (offers ?? [])
    .filter((o) => typeof o.visualScore === "number")
    .sort((a, b) => b.visualScore - a.visualScore)[0];

  if (!best || best.visualScore < SEED_THRESHOLD) return null;

  return {
    title: best.title,
    brand: best.brand,
    query: [best.brand, best.title].filter(Boolean).join(" ") || null,
    visualScore: best.visualScore,
  };
};
