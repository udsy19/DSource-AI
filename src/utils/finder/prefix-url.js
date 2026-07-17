/**
 * The dsource.ai/<url> prefix trick.
 *
 * A user standing on ikea.com/gb/en/p/billy-bookcase-white-00263850 types
 * "dsource.ai/" in front of it and lands in the finder with that product
 * already loaded. No extension, no copy-paste, no install.
 *
 * WHY THIS IS DANGEROUS, and why the guard below is strict:
 *
 * This is a ROOT catch-all. It is structurally the same shape as the bug we
 * deleted from this app — a directory literally named `[ai-material-finder]`
 * meant Next served it as a dynamic segment, so `/anything` rendered the
 * material finder instead of 404ing. Next gives static routes priority, so
 * real pages (/about, /pricing) are safe. But a TYPO is not: without a guard,
 * /pricng or /abut would silently become a product search rather than an
 * honest 404.
 *
 * So the rule is: only treat a path as a prefixed URL when its first segment
 * is unmistakably a hostname — a dot, a plausible TLD, no spaces. Everything
 * else falls through to notFound(). When in doubt, 404: a wrong 404 is a
 * moment's confusion, a wrong search is a page that looks like it worked.
 */

/**
 * Reserved first-segments that must NEVER be read as a hostname, even if some
 * day one gains a dot. Belt and braces on top of the hostname test.
 */
const RESERVED = new Set([
  "api",
  "auth",
  "_next",
  "static",
  "material-finder",
  "ai-visualizer",
  "cad-studio",
  "marketplace",
  "studio",
  "folios",
  "vendor",
  "account",
  "spec-builder",
  "get-inspired",
  "login",
  "signup",
  "about",
  "pricing",
  "faq",
  "help-center",
  "features",
  "terms",
  "privacy",
]);

// A hostname we are willing to act on: labels separated by dots, ending in a
// TLD of 2+ letters. Deliberately conservative — it rejects "pricng" and
// "index.php" alike.
const HOSTNAME_RE =
  /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

// Single-label TLDs that are really file extensions. "sitemap.xml" is not a
// host, and neither is "robots.txt".
const FILE_EXT_RE =
  /\.(xml|txt|json|ico|png|jpe?g|svg|webp|css|js|map|php|html?)$/i;

/**
 * Reads a prefixed URL out of the catch-all segments.
 *
 * @param {string[]} segments  e.g. ["ikea.com", "gb", "en", "p", "billy-00263850"]
 * @param {URLSearchParams|object} [query]  the request's own query string,
 *   which belongs to the TARGET url (product pages are full of ?variant=...)
 * @returns {string|null} an absolute https URL, or null if this isn't one
 */
export const urlFromSegments = (segments, query) => {
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const [head, ...rest] = segments;
  if (typeof head !== "string") return null;

  const host = decodeURIComponent(head).trim().toLowerCase();
  if (RESERVED.has(host)) return null;
  if (FILE_EXT_RE.test(host)) return null;
  if (!HOSTNAME_RE.test(host)) return null;

  // Someone may paste the scheme too: dsource.ai/https://ikea.com/... Next
  // splits that into ["https:", "", "ikea.com", ...]; the empty segment is a
  // reliable tell, so handle it rather than producing a broken URL.
  const path = rest
    .filter((s) => s !== "")
    .map((s) => encodeURIComponent(decodeURIComponent(s)))
    .join("/");

  const search = queryString(query);
  return `https://${host}${path ? `/${path}` : ""}${search}`;
};

const queryString = (query) => {
  if (!query) return "";
  const params =
    query instanceof URLSearchParams
      ? query
      : new URLSearchParams(
          Object.entries(query).flatMap(([k, v]) =>
            Array.isArray(v)
              ? v.map((x) => [k, x])
              : v == null
                ? []
                : [[k, String(v)]],
          ),
        );
  const s = params.toString();
  return s ? `?${s}` : "";
};

/**
 * Strips a scheme the user may have pasted, so dsource.ai/https://ikea.com/x
 * and dsource.ai/ikea.com/x behave the same.
 */
export const normalizePrefixSegments = (segments) => {
  if (!Array.isArray(segments)) return [];
  const out = segments.filter((s) => s !== "");
  if (out[0] && /^https?:$/i.test(out[0])) return out.slice(1);
  return out;
};
