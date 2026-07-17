import { domainOf } from "../score.js";

/**
 * SerpAPI `google_lens` — image in, cross-retailer visual matches out.
 *
 * ⚠️ THIS IS THE PROVIDER MOST LIKELY TO BE REMOVED. It lives alone behind the
 * registry for exactly that reason: if it goes, delete this file and drop it
 * from provider-registry.js. Nothing else should import it.
 *
 * The exposure, stated plainly so whoever maintains this can weigh it:
 *
 *   - Google v. SerpApi (N.D. Cal., filed Dec 2025) pleads DMCA §1201
 *     anti-circumvention over SerpApi's alleged bypassing of "SearchGuard".
 *     Google deliberately skipped CFAA and contract theories, which lose
 *     post-Van Buren; §1201 needs no infringement, no contract and no
 *     logged-in access — only circumvention. Motion to dismiss was heard
 *     19 May 2026; no ruling confirmed as of this writing.
 *   - Reddit v. Perplexity, Oxylabs, AWMProxy, SerpApi (S.D.N.Y., Oct 2025)
 *     attacks precisely the "we don't scrape retailers, we just use a SERP
 *     API" posture, and Reddit proved the data path with a honeypot visible
 *     only to Google's crawler.
 *   - SerpAPI advertises a "U.S. Legal Shield". A vendor's marketing claim of
 *     legality is not an indemnity.
 *
 * Posture we hold to regardless: never create retailer accounts, never log in,
 * honor blocks and C&Ds immediately, send traffic TO merchants.
 *
 * API gotcha: `google_lens` accepts a `url` ONLY — there is no image upload.
 * The caller must host the query image at a publicly reachable URL first (a
 * Supabase signed URL works; note the 1-hour TTL).
 */

const ENDPOINT = "https://serpapi.com/search.json";
const TIMEOUT_MS = 25_000;

export const isLensConfigured = () => Boolean(process.env.SERPAPI_KEY);

/**
 * @param {string} imageUrl publicly reachable URL of the query image
 * @param {object} [options]
 * @param {number} [options.limit]
 * @returns {Promise<object[]>} offers in the pipeline's shape
 */
export const searchLens = async (imageUrl, { limit = 20 } = {}) => {
  if (!isLensConfigured()) return [];

  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl,
    // "exact_matches" is the whole point — the default "all" returns
    // visually-similar items, which is the thing we explicitly are not
    // building. Similar-looking is not the same product.
    type: "exact_matches",
    api_key: process.env.SERPAPI_KEY,
  });

  const res = await fetch(`${ENDPOINT}?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`SerpAPI google_lens returned ${res.status}`);
  }

  const data = await res.json();
  if (data?.error) {
    throw new Error(`SerpAPI: ${data.error}`);
  }

  // SerpAPI returns exact matches under different keys depending on `type`.
  const matches = data.exact_matches ?? data.visual_matches ?? [];

  return matches.slice(0, limit).map(toOffer).filter(Boolean);
};

const toOffer = (match) => {
  const url = match?.link;
  if (typeof url !== "string") return null;

  const price = match?.price;
  const value =
    typeof price?.extracted_value === "number" ? price.extracted_value : null;

  return {
    // `source` in Lens's payload is the SELLER's name, not the data source.
    seller: match.source ?? domainOf(url),
    domain: domainOf(url),
    url,
    title: match.title ?? null,
    imageUrl: match.thumbnail ?? null,
    price: value ? { value, currency: currencyOf(price) } : null,
    inStock: typeof match.in_stock === "boolean" ? match.in_stock : null,
    // Lens gives no identifiers — that's why a Lens-only offer can never rise
    // above LOW on its own. It takes a corroborating provider to lift it.
    identifiers: {},
    source: "lens",
  };
};

const currencyOf = (price) => {
  const symbol = price?.currency;
  if (typeof symbol !== "string") return "USD";
  return { $: "USD", "£": "GBP", "€": "EUR", "₹": "INR" }[symbol] ?? symbol;
};
