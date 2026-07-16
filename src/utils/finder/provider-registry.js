import { isCatalogConfigured, searchCatalog } from "./providers/catalog";
import { isLensConfigured, searchLens } from "./providers/lens";
import { isShopifyConfigured, searchShopify } from "./providers/shopify";
import { isShopSavvyConfigured, searchShopSavvy } from "./providers/shopsavvy";

/**
 * Where sellers come from, and in what order they're trusted.
 *
 * Mirrors the model-router convention: routing is internal and never
 * user-facing, and each entry carries the rationale for its own existence so
 * the next person can judge whether it still earns its place.
 *
 * The honest framing, which the UI copy should match: there is no complete
 * cross-retailer index, and nobody sells one. Google has ~45B listings and no
 * API. Shopify has millions of merchants and forbids caching. Amazon requires
 * ongoing sales to keep reading and bars storing images. Each party sells
 * queries; none sells the index. So "every seller" is the union of what these
 * providers can see — a good product with an honest name, and NOT "every
 * seller on the internet".
 */

export const PROVIDERS = {
  catalog: {
    id: "catalog",
    label: "DSource catalog",
    // Runs first and seeds the others. For furniture — our core and the open
    // web's worst category — this is the only source with a real identity to
    // join on. It is also the only provider that is a moat rather than a rental.
    order: 0,
    accepts: ["image", "text"],
    isConfigured: isCatalogConfigured,
    search: ({ imageDataUri, query, supabase, category }) =>
      searchCatalog({ imageDataUri, query, supabase, category }),
  },

  shopsavvy: {
    id: "shopsavvy",
    label: "ShopSavvy",
    // The closest thing to a real GTIN -> every-seller endpoint. Identifier
    // lookups only — sending it a text query spends credits to fuzzy-match,
    // which the other providers already do for free.
    // ⚠️ Coverage is a vendor marketing claim, unverified. Especially suspect
    // for furniture.
    order: 1,
    accepts: ["identifier"],
    isConfigured: isShopSavvyConfigured,
    search: ({ key }) => searchShopSavvy(key),
  },

  shopify: {
    id: "shopify",
    label: "Shopify catalog",
    // Free, keyless, takes an image, and pre-clusters offers by Universal
    // Product ID — that clustering is Shopify asserting sameness, which beats
    // our own visual guess.
    // 🚨 Its results may not be cached. See providers/shopify.js.
    // ⚠️ Wire format unconfirmed; off unless explicitly configured.
    order: 2,
    accepts: ["image", "text"],
    isConfigured: isShopifyConfigured,
    search: ({ query, imageUrl }) => searchShopify({ query, imageUrl }),
  },

  lens: {
    id: "lens",
    label: "Google Lens",
    // The broadest image -> sellers reach available, and the one under active
    // litigation (Google v. SerpApi, §1201). Isolated so it can be deleted
    // without touching anything else — see providers/lens.js for the full
    // exposure and the posture we hold.
    // Needs a publicly reachable image URL; it cannot take an upload.
    order: 3,
    accepts: ["image"],
    isConfigured: isLensConfigured,
    search: ({ imageUrl }) => searchLens(imageUrl),
  },
};

/**
 * Which providers can serve this search, given what's configured and what kind
 * of key we resolved.
 *
 * An identifier key unlocks the identifier providers; a text-only key does not
 * — asking a GTIN endpoint to fuzzy-match a description spends money to
 * produce a worse answer than the visual providers already give.
 */
export const providersFor = ({ hasImage, key }) => {
  const kinds = new Set();
  if (hasImage) kinds.add("image");
  if (key?.kind === "text") kinds.add("text");
  if (key && key.kind !== "text") {
    kinds.add("identifier");
    // An identifier is also a searchable string for text-capable providers.
    kinds.add("text");
  }

  return Object.values(PROVIDERS)
    .filter((provider) => provider.isConfigured())
    .filter((provider) => provider.accepts.some((kind) => kinds.has(kind)))
    .sort((a, b) => a.order - b.order);
};

/**
 * Which providers exist but aren't switched on. The UI says so plainly rather
 * than silently returning a thin result set and letting the user assume that's
 * everything there is.
 */
export const unconfiguredProviders = () =>
  Object.values(PROVIDERS)
    .filter((provider) => !provider.isConfigured())
    .map((provider) => provider.label);
