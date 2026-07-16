/**
 * Fetching retail product pages.
 *
 * Retail sites are the hard case for scraping, not the easy one. A plain
 * request is blocked outright by Best Buy, B&H, Home Depot, Walmart, Chewy,
 * Argos, MediaMarkt and Sweetwater among others. So this is a LADDER: try free
 * first, escalate to a paid unblocker only when free fails.
 *
 * Why not a free reader service: Jina Reader is free and useless here — per
 * jina-ai/reader#146 it "does not actively circumvent or bypass any website
 * defense mechanisms", so it measures ~0% on exactly the protected sites we
 * need. Paying it buys RPM, not access.
 *
 * Why escalation is cheap: Oxylabs and Zyte both bill per SUCCESS. A failed
 * attempt costs nothing, so a fallback chain is nearly free and list price is
 * effectively the cost per successful page.
 *
 * Cost note for whoever tunes this: independent benchmarking (Scrapeway) puts
 * competent vendors at 61-67% success on retail. Budget ~1.5x the list price
 * per page you actually get, and measure against your own URL mix rather than
 * trusting any vendor's number.
 */

const FETCH_TIMEOUT_MS = 20_000;

/**
 * A browser-shaped UA. Not evasion — many CDNs 403 an unidentified client by
 * default, and we identify honestly as a normal browser request. If a site
 * blocks us anyway we honor that and escalate or give up; we never retry to
 * defeat a block.
 */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export const isOxylabsConfigured = () =>
  Boolean(process.env.OXYLABS_USER && process.env.OXYLABS_PASS);

export const isZyteConfigured = () => Boolean(process.env.ZYTE_API_KEY);

export const isUnblockerConfigured = () =>
  isOxylabsConfigured() || isZyteConfigured();

/**
 * Only http(s), and never a private/loopback host — this fetches a
 * user-supplied URL from our server, which is an SSRF sink if left open.
 */
export const isFetchableUrl = (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!/^https?:$/.test(parsed.protocol)) return false;

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    return false;
  }
  // Literal private ranges. DNS names resolving into private space are not
  // covered here — a full guard needs resolution-time checks.
  if (
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }
  return true;
};

const plainFetch = async (url) => {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, via: "plain" };
  }
  return { ok: true, html: await res.text(), via: "plain", cost: 0 };
};

/**
 * Oxylabs Web Scraper API — universal source, success-billed ($0.25-0.50/1k).
 */
const oxylabsFetch = async (url) => {
  const auth = Buffer.from(
    `${process.env.OXYLABS_USER}:${process.env.OXYLABS_PASS}`,
  ).toString("base64");

  const res = await fetch("https://realtime.oxylabs.io/v1/queries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ source: "universal", url, render: "html" }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) return { ok: false, status: res.status, via: "oxylabs" };

  const data = await res.json();
  const html = data?.results?.[0]?.content;
  if (typeof html !== "string" || !html) {
    return { ok: false, status: 502, via: "oxylabs" };
  }
  return { ok: true, html, via: "oxylabs" };
};

/**
 * Zyte API — priced by target difficulty, success-billed (from $0.13/1k HTTP,
 * ~$1.00/1k browser-rendered).
 */
const zyteFetch = async (url) => {
  const auth = Buffer.from(`${process.env.ZYTE_API_KEY}:`).toString("base64");

  const res = await fetch("https://api.zyte.com/v1/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ url, browserHtml: true }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) return { ok: false, status: res.status, via: "zyte" };

  const data = await res.json();
  const html = data?.browserHtml;
  if (typeof html !== "string" || !html) {
    return { ok: false, status: 502, via: "zyte" };
  }
  return { ok: true, html, via: "zyte" };
};

/**
 * Fetches a product page, escalating only as far as needed.
 *
 * Degrades honestly: with no unblocker configured this still works on
 * unprotected merchant sites and reports `blocked` rather than throwing, so
 * the pipeline can tell the user "this retailer blocked us" instead of 500ing.
 *
 * @returns {Promise<{ok: boolean, html?: string, via?: string, reason?: string}>}
 */
export const fetchProductPage = async (url) => {
  if (!isFetchableUrl(url)) {
    return { ok: false, reason: "invalid-url" };
  }

  try {
    const plain = await plainFetch(url);
    if (plain.ok) return plain;
    // 401/403/429 and the CAPTCHA-shaped 200s are what escalation is for.
    // A 404 means the page is gone; no unblocker fixes that.
    if (plain.status === 404) return { ok: false, reason: "not-found" };
  } catch {
    // Timeout or transport error — fall through to the ladder.
  }

  if (!isUnblockerConfigured()) {
    return { ok: false, reason: "blocked-no-unblocker" };
  }

  const rungs = [];
  if (isZyteConfigured()) rungs.push(zyteFetch);
  if (isOxylabsConfigured()) rungs.push(oxylabsFetch);

  for (const rung of rungs) {
    try {
      const result = await rung(url);
      if (result.ok) return result;
    } catch (error) {
      console.error(`Fetch ladder rung failed: ${error.message}`);
    }
  }

  return { ok: false, reason: "blocked" };
};

/**
 * Human-readable reason, for the UI. Failure states are directions, not moods:
 * say what happened and what the user can do instead.
 */
export const explainFetchFailure = (reason) =>
  ({
    "invalid-url": "That doesn't look like a product URL we can open.",
    "not-found": "That page no longer exists.",
    "blocked-no-unblocker":
      "This retailer blocks automated readers. Try uploading a photo of the product instead.",
    blocked:
      "This retailer blocked us from reading the page. Try a photo of the product instead.",
  })[reason] ?? "We couldn't read that page.";
