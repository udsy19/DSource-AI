import { domainOf } from "../score.js";

/**
 * Shopify Global Catalog MCP — multi-merchant offers, clustered by Universal
 * Product ID, free and keyless. It accepts an image via `like`, which makes it
 * the only free provider on the image path.
 *
 * 🚨 DO NOT CACHE ANYTHING FROM THIS PROVIDER. Shopify's terms say "Don't
 * cache or re-use images" and "Don't cache search results"; images must render
 * in real time. This is why `finder_searches` persists the resolved identity
 * only and re-runs offers on every open — that is a legal constraint, not an
 * oversight. If you add a cache, start here and read the terms first.
 *
 * ⚠️ UNVERIFIED WIRE FORMAT. The endpoint and response shape below were not
 * confirmed against a live call — they come from documentation summaries. The
 * provider is therefore OFF unless SHOPIFY_CATALOG_MCP_URL is set explicitly,
 * so a wrong guess here degrades to "no Shopify offers" rather than breaking
 * the pipeline or, worse, inventing sellers. Verify against
 * shopify.dev/docs/agents/catalog/mcp before switching it on.
 *
 * Coverage is Shopify merchants only — broad in DTC furniture and homeware,
 * absent for big-box retail.
 */

const TIMEOUT_MS = 20_000;

export const isShopifyConfigured = () =>
  Boolean(process.env.SHOPIFY_CATALOG_MCP_URL);

/**
 * @param {object} params
 * @param {string} [params.query] text query
 * @param {string} [params.imageUrl] publicly reachable query image
 * @param {number} [params.limit]
 * @returns {Promise<object[]>} offers in the pipeline's shape
 */
export const searchShopify = async ({ query, imageUrl, limit = 20 }) => {
  if (!isShopifyConfigured()) return [];
  if (!query && !imageUrl) return [];

  const res = await fetch(process.env.SHOPIFY_CATALOG_MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      method: "tools/call",
      params: {
        name: "search_catalog",
        arguments: pruneNullish({ query, like: imageUrl, limit }),
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Shopify catalog returned ${res.status}`);
  }

  const data = await res.json();
  const products = productsFrom(data);
  return products.flatMap((product) => toOffers(product)).slice(0, limit);
};

/**
 * MCP wraps tool results in a content envelope; tolerate both that and a plain
 * body, since the exact shape is unconfirmed.
 */
const productsFrom = (data) => {
  const direct = data?.products ?? data?.result?.products;
  if (Array.isArray(direct)) return direct;

  const text = data?.result?.content?.[0]?.text;
  if (typeof text === "string") {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed?.products)) return parsed.products;
    } catch {
      // Not JSON — nothing to read.
    }
  }
  return [];
};

/**
 * One catalog product carries offers from several merchants, already clustered
 * by Shopify's Universal Product ID. That clustering IS the evidence — it's
 * Shopify asserting these listings are the same product, which is worth more
 * than our own visual guess and is why a UPID lifts an offer to MEDIUM.
 */
const toOffers = (product) => {
  const upid = product?.universal_product_id ?? product?.upid ?? null;
  const offers = Array.isArray(product?.offers) ? product.offers : [product];

  return offers
    .map((offer) => {
      const url = offer?.url ?? offer?.online_store_url;
      if (typeof url !== "string") return null;

      const value =
        typeof offer.price === "number"
          ? offer.price
          : Number.parseFloat(offer?.price?.amount);

      return {
        seller: offer.shop_name ?? offer.vendor ?? domainOf(url),
        domain: domainOf(url),
        url,
        title: product.title ?? offer.title ?? null,
        brand: product.vendor ?? offer.vendor ?? null,
        // Not cached, not proxied, not stored — rendered live, per the terms.
        imageUrl: product.image_url ?? offer.image_url ?? null,
        price: Number.isFinite(value)
          ? {
              value,
              currency: offer.currency ?? offer?.price?.currency ?? "USD",
            }
          : null,
        inStock: typeof offer.available === "boolean" ? offer.available : null,
        upid,
        identifiers: pruneNullish({ gtin: product.barcode ?? offer.barcode }),
        source: "shopify",
      };
    })
    .filter(Boolean);
};

const pruneNullish = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
