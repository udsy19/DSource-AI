/**
 * schema.org/Product extraction from a retail page.
 *
 * Pure and network-free — hand it HTML, get an identity back. The fetching
 * lives in fetch-ladder.js so this stays unit-testable.
 *
 * Reality this file is built around: JSON-LD in the wild is malformed far more
 * often than the spec suggests. Retailers ship @graph wrappers, arrays at the
 * root, offers as objects or arrays, gtin13 spelled six ways, prices as
 * strings with currency symbols, and HTML-escaped entities inside the script
 * tag. Every one of those is handled here rather than at the call site.
 */

/**
 * schema.org defines gtin8/12/13/14 plus a bare `gtin`. Retailers also emit
 * these as `productID: "gtin13:40063..."`. Order matters: prefer the most
 * specific declaration.
 */
const GTIN_KEYS = ["gtin14", "gtin13", "gtin12", "gtin8", "gtin"];

/**
 * Pulls every JSON-LD block out of the page. Returns parsed objects, skipping
 * any block that doesn't parse — a single malformed script must not lose the
 * others, and broken JSON-LD on retail pages is common enough that throwing
 * here would fail a large share of real inputs.
 */
export const extractJsonLdBlocks = (html) => {
  if (typeof html !== "string") return [];
  const blocks = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match = re.exec(html);
  while (match !== null) {
    const raw = decodeEntities(match[1].trim());
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // Malformed block — skip it, keep the rest.
    }
    match = re.exec(html);
  }
  return blocks;
};

/**
 * JSON-LD arrives shaped three ways: a bare object, an array of objects, or an
 * object with an `@graph` array. Flatten all of them to a list of nodes.
 */
export const flattenNodes = (blocks) => {
  const nodes = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (Array.isArray(node["@graph"])) {
      node["@graph"].forEach(visit);
    }
    nodes.push(node);
  };
  blocks.forEach(visit);
  return nodes;
};

const typeOf = (node) => {
  const raw = node?.["@type"];
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((t) => typeof t === "string");
  return [];
};

const isProduct = (node) =>
  typeOf(node).some((t) =>
    /^(Product|ProductModel|IndividualProduct)$/i.test(t),
  );

/**
 * HTML entities inside a script tag are rare but real — some CMSs escape the
 * whole block. Handles the five that actually appear; a full entity table
 * would be dead weight.
 */
const decodeEntities = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const firstString = (value) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
  }
  return null;
};

/** Brand is `{"@type":"Brand","name":"X"}` as often as it is `"X"`. */
const brandOf = (node) => {
  const brand = node?.brand;
  if (!brand) return null;
  if (typeof brand === "string") return brand.trim() || null;
  if (Array.isArray(brand)) return brandOf({ brand: brand[0] });
  return firstString(brand.name);
};

/** `productID: "gtin13:4006381333931"` is a real pattern in the wild. */
const gtinFromProductId = (node) => {
  const productId = firstString(node?.productID);
  if (!productId) return null;
  const match = productId.match(/^(?:gtin\d*|ean|upc)[:\s]+(\d{8,14})$/i);
  if (match) return match[1];
  return /^\d{8,14}$/.test(productId) ? productId : null;
};

const gtinOf = (node) => {
  for (const key of GTIN_KEYS) {
    const value = firstString(node?.[key]);
    if (value) return value;
  }
  return gtinFromProductId(node);
};

/** Offers can be an object, an array, or an AggregateOffer wrapper. */
const offersOf = (node) => {
  const raw = node?.offers;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.flatMap((offer) => {
    if (!offer || typeof offer !== "object") return [];
    // AggregateOffer nests the real offers one level down.
    if (Array.isArray(offer.offers)) return offer.offers;
    return [offer];
  });
};

/** "$1,240.00" / "1240" / 1240 all have to land on 1240. */
export const parsePrice = (raw) => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const AVAILABILITY_IN_STOCK =
  /(InStock|InStoreOnly|OnlineOnly|LimitedAvailability|PreOrder|BackOrder)/i;
const AVAILABILITY_OUT = /(OutOfStock|SoldOut|Discontinued)/i;

const availabilityOf = (offer) => {
  const raw = firstString(offer?.availability);
  if (!raw) return null;
  if (AVAILABILITY_OUT.test(raw)) return false;
  if (AVAILABILITY_IN_STOCK.test(raw)) return true;
  return null;
};

const imageOf = (node) => {
  const image = node?.image;
  if (!image) return null;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return imageOf({ image: image[0] });
  return firstString(image.url ?? image.contentUrl);
};

/**
 * Amazon carries no GTIN in its markup — the ASIN is the only identifier, and
 * it lives in the URL rather than the JSON-LD.
 */
export const asinFromUrl = (url) => {
  if (typeof url !== "string") return null;
  const match = url.match(
    /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/i,
  );
  return match ? match[1].toUpperCase() : null;
};

/**
 * Picks the page's OWN product from among the Product nodes.
 *
 * Retail pages routinely mark up more than one: "customers also bought" rails,
 * "complete the look" carousels and recently-viewed strips all ship valid
 * Product JSON-LD. Taking the first node found would silently identify a
 * recommendation instead of the thing the user asked about — and it would look
 * completely successful while doing it, which is the worst kind of wrong here.
 *
 * So: prefer the node whose own url/@id matches the page we fetched. Fall back
 * to the first node carrying offers (a rail entry usually has no offer), then
 * to the first node at all.
 */
const pickProduct = (nodes, url) => {
  const products = nodes.filter(isProduct);
  if (products.length <= 1) return products[0];

  const pagePath = pathOf(url);
  if (pagePath) {
    const matching = products.find((node) => {
      const own = pathOf(firstString(node.url) ?? firstString(node["@id"]));
      return own && own === pagePath;
    });
    if (matching) return matching;
  }

  return products.find((node) => Boolean(node.offers)) ?? products[0];
};

const pathOf = (url) => {
  if (typeof url !== "string") return null;
  try {
    return new URL(url).pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
};

/**
 * Parses a product identity out of a retail page.
 *
 * @param {string} html
 * @param {string} [url] source URL — used for ASIN extraction and as a fallback
 * @returns {object|null} identity, or null if the page has no Product node
 */
export const parseProductIdentity = (html, url) => {
  const nodes = flattenNodes(extractJsonLdBlocks(html));
  const product = pickProduct(nodes, url);

  const asin = asinFromUrl(url);

  if (!product) {
    // No JSON-LD Product. An ASIN in the URL is still an identity worth
    // returning — it's the only one Amazon gives us.
    return asin ? { asin, source: "url", identifiers: { asin } } : null;
  }

  const offers = offersOf(product);
  const firstOffer = offers[0];

  const gtin = gtinOf(product) ?? (firstOffer ? gtinOf(firstOffer) : null);
  const mpn =
    firstString(product.mpn) ??
    (firstOffer ? firstString(firstOffer.mpn) : null);
  const sku =
    firstString(product.sku) ??
    (firstOffer ? firstString(firstOffer.sku) : null);

  const price = firstOffer
    ? parsePrice(firstOffer.price ?? firstOffer.lowPrice)
    : null;
  const currency = firstOffer ? firstString(firstOffer.priceCurrency) : null;

  return {
    title: firstString(product.name),
    brand: brandOf(product),
    gtin,
    mpn,
    sku,
    asin,
    description: firstString(product.description),
    imageUrl: imageOf(product),
    category: firstString(product.category),
    price: price ? { value: price, currency: currency ?? "USD" } : null,
    inStock: firstOffer ? availabilityOf(firstOffer) : null,
    source: "jsonld",
    identifiers: pruneNullish({ gtin, mpn, sku, asin }),
  };
};

const pruneNullish = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));

/**
 * Does this identity carry something we can actually join sellers on?
 * Title-only identities are the difference between "database join" and "fuzzy
 * string match" — the caller needs to know which it got.
 */
export const hasStrongIdentifier = (identity) =>
  Boolean(identity?.gtin || identity?.mpn || identity?.asin);
