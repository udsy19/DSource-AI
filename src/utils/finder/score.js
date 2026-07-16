/**
 * Identity resolution and confidence scoring for the Material Finder.
 *
 * Pure functions only — no network, no model calls, no clock. Everything here
 * is deterministic so it can be unit-tested, and so the expensive/flaky parts
 * (vision, providers) stay at the edges.
 *
 * The house rule this file encodes, borrowed from the only published
 * production system (Shopify's global catalogue): DETERMINISTIC FIRST. A GTIN
 * agreement short-circuits everything — never spend a vision call on a product
 * whose identifier already matches.
 */

export const TIER = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
};

export const FLAG = {
  REUSED_PHOTO: "reused-photo",
  PRICE_OUTLIER: "price-outlier",
  MARKETPLACE: "marketplace",
  BRAND_ABSENT: "brand-absent",
};

/**
 * Marketplaces where a listing is by an arbitrary third-party seller rather
 * than the retailer itself. Not an accusation — a listing here is simply
 * weaker evidence of authenticity than a brand's own store.
 */
const MARKETPLACE_DOMAINS = new Set([
  "aliexpress.com",
  "amazon.com",
  "ebay.com",
  "etsy.com",
  "wish.com",
  "temu.com",
  "dhgate.com",
  "alibaba.com",
  "walmart.com",
  "mercadolibre.com",
]);

/** A price this far below the cluster median is worth flagging. */
const PRICE_OUTLIER_RATIO = 0.6;

/** Below this many offers a median is not meaningful, so we don't flag on it. */
const MIN_OFFERS_FOR_PRICE_STATS = 3;

// ---------------------------------------------------------------------------
// GTIN
// ---------------------------------------------------------------------------

/**
 * GTIN-8, UPC-A (12), EAN-13 and GTIN-14 are the same identifier space at
 * different widths — the short forms are just the long form with leading
 * zeros stripped. Comparing them as raw strings reports "different product"
 * for two listings of the identical item, so everything is canonicalized to
 * 14 digits before any comparison.
 *
 * @returns {string|null} 14-digit GTIN, or null if it isn't a valid one.
 */
export const normalizeGtin = (raw) => {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const digits = String(raw).replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (![8, 12, 13, 14].includes(digits.length)) return null;

  const padded = digits.padStart(14, "0");
  if (!isValidGtinCheckDigit(padded)) return null;
  return padded;
};

/**
 * Validates the mod-10 check digit. Weights alternate 3,1 from the LEFT of the
 * 13 payload digits once padded to 14 — which is equivalent to the familiar
 * EAN-13/UPC-A rules, so one implementation covers every width.
 */
export const isValidGtinCheckDigit = (gtin14) => {
  if (!/^\d{14}$/.test(gtin14)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    sum += Number(gtin14[i]) * (i % 2 === 0 ? 3 : 1);
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === Number(gtin14[13]);
};

/**
 * MPNs are written inconsistently across retailers ("ES670-89", "es670 89",
 * "ES67089"). Strip to alphanumerics and upper-case so they compare.
 */
export const normalizeMpn = (raw) => {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^a-z0-9]/gi, "").toUpperCase();
  // One or two characters is not an identifier, it's noise.
  return cleaned.length >= 3 ? cleaned : null;
};

/** ASINs are 10-char alphanumerics, case-insensitive in practice. */
export const normalizeAsin = (raw) => {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toUpperCase();
  return /^[A-Z0-9]{10}$/.test(cleaned) ? cleaned : null;
};

export const normalizeBrand = (raw) => {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return cleaned || null;
};

/**
 * Registrable-ish domain for grouping. Strips protocol, `www.` and path. Not a
 * public-suffix parse — good enough to tell sellers apart, and deliberately
 * dependency-free.
 */
export const domainOf = (url) => {
  if (typeof url !== "string") return null;
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

export const isMarketplace = (domain) =>
  typeof domain === "string" && MARKETPLACE_DOMAINS.has(domain);

// ---------------------------------------------------------------------------
// Dedup + clustering
// ---------------------------------------------------------------------------

/**
 * Collapses offers that are the same listing reached by different providers.
 * Lens and ShopSavvy routinely both return the same retailer page.
 *
 * Merge rather than drop: each provider knows something the others don't
 * (Lens has a thumbnail, ShopSavvy has stock, the catalog has the GTIN), and
 * an offer corroborated by two providers is stronger evidence than one seen
 * once. `sources` accumulates so scoring can use that corroboration.
 */
export const dedupeOffers = (offers) => {
  const byKey = new Map();

  for (const offer of offers ?? []) {
    if (!offer) continue;
    const domain = offer.domain ?? domainOf(offer.url);
    // Same product page at the same seller = same offer, whatever the URL's
    // tracking params say.
    const key = `${domain ?? "?"}|${canonicalPath(offer.url)}`;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...offer,
        domain,
        sources: [...new Set(offer.sources ?? [offer.source].filter(Boolean))],
      });
      continue;
    }

    byKey.set(key, {
      ...existing,
      // Prefer any concrete value over a missing one, oldest-wins on conflict
      // so the first provider to report a field stays authoritative.
      price: existing.price ?? offer.price,
      inStock: existing.inStock ?? offer.inStock,
      imageUrl: existing.imageUrl ?? offer.imageUrl,
      seller: existing.seller ?? offer.seller,
      identifiers: mergeIdentifiers(existing.identifiers, offer.identifiers),
      sources: [
        ...new Set([
          ...existing.sources,
          ...(offer.sources ?? [offer.source].filter(Boolean)),
        ]),
      ],
    });
  }

  return [...byKey.values()];
};

const canonicalPath = (url) => {
  if (typeof url !== "string") return "";
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
};

const mergeIdentifiers = (a, b) => {
  const merged = { ...(a ?? {}) };
  for (const [key, value] of Object.entries(b ?? {})) {
    if (merged[key] == null && value != null) merged[key] = value;
  }
  return merged;
};

/**
 * Dropshippers and grey-market resellers hotlink the manufacturer's photo;
 * authorized dealers shoot their own. So the same image URL appearing across
 * unrelated sellers is a real signal, and it's one we can compute for free
 * from data we already have.
 *
 * Compares URLs, not pixels — a reseller who rehosts the same JPEG defeats
 * this. Perceptual hashing would catch that; it is deliberately out of scope
 * until the cheap version proves its worth.
 *
 * @returns {Map<string, string[]>} image URL -> domains using it (2+ only)
 */
export const detectReusedImages = (offers) => {
  const byImage = new Map();
  for (const offer of offers ?? []) {
    if (!offer?.imageUrl) continue;
    // Skip images WE attached from a product record rather than from the
    // seller's own listing. Aggregators return one product photo for all their
    // offers; counting that as "shared" would flag every result and turn a
    // real fraud signal into noise. Only a seller's own image can be reused.
    if (offer.imageIsProductLevel) continue;
    const domain = offer.domain ?? domainOf(offer.url);
    if (!domain) continue;
    const seen = byImage.get(offer.imageUrl) ?? new Set();
    seen.add(domain);
    byImage.set(offer.imageUrl, seen);
  }

  const reused = new Map();
  for (const [imageUrl, domains] of byImage) {
    if (domains.size >= 2) reused.set(imageUrl, [...domains]);
  }
  return reused;
};

/** Median price across offers that actually quote one. */
export const medianPrice = (offers) => {
  const values = (offers ?? [])
    .map((o) => o?.price?.value)
    .filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[mid - 1] + values[mid]) / 2
    : values[mid];
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Scores one offer against the resolved identity.
 *
 * Tiers are evidence-shaped, not score-shaped — the tier says WHAT we know,
 * and the evidence array says how we know it, which is what the dossier's
 * evidence chain renders. A numeric confidence is derived for sorting only;
 * it is deliberately never shown alone.
 *
 * @param {object} offer
 * @param {object} identity   resolved product identity
 * @param {object} context    { reusedImages, median, sourceCount }
 */
export const scoreOffer = (offer, identity, context = {}) => {
  const evidence = [];
  const flags = [];

  const offerGtin = normalizeGtin(offer?.identifiers?.gtin);
  const identityGtin = normalizeGtin(identity?.gtin);
  const gtinAgrees = Boolean(
    offerGtin && identityGtin && offerGtin === identityGtin,
  );

  const offerMpn = normalizeMpn(offer?.identifiers?.mpn);
  const identityMpn = normalizeMpn(identity?.mpn);
  const mpnAgrees = Boolean(
    offerMpn && identityMpn && offerMpn === identityMpn,
  );

  // ASIN is the ONLY identifier Amazon publishes — no GTIN appears in its
  // markup — so without this, anything sourced from an Amazon URL could never
  // rise above LOW however much agreed.
  //
  // It is deliberately weaker than GTIN agreement, because it is usually an
  // ECHO rather than corroboration: we query an aggregator BY asin, so every
  // offer it returns necessarily carries that asin. What it actually tells us
  // is "this aggregator clusters these listings under this product" — one
  // party's assertion, the same weight as a Shopify UPID. It must never reach
  // HIGH on its own.
  const offerAsin = normalizeAsin(offer?.identifiers?.asin);
  const identityAsin = normalizeAsin(identity?.asin);
  const asinAgrees = Boolean(
    offerAsin && identityAsin && offerAsin === identityAsin,
  );

  const brandAgrees = Boolean(
    normalizeBrand(offer?.brand) &&
      normalizeBrand(identity?.brand) &&
      normalizeBrand(offer.brand) === normalizeBrand(identity.brand),
  );

  const sourceCount = offer?.sources?.length ?? 0;

  // --- HIGH: an identifier agrees, corroborated. -------------------------
  // "Across >=2 sources" means two independent providers reported the same
  // GTIN — one provider echoing itself is not corroboration.
  // `detail` must NOT repeat the kind — the renderer prefixes it, so "GTIN
  // 123 matches" here would read "GTIN GTIN 123 matches" on screen.
  if (gtinAgrees && sourceCount >= 2) {
    evidence.push({
      kind: "gtin",
      detail: `${formatGtin(identityGtin)} agrees across ${sourceCount} sources`,
    });
  } else if (gtinAgrees) {
    evidence.push({
      kind: "gtin",
      detail: `${formatGtin(identityGtin)} matches this listing`,
    });
  }

  if (mpnAgrees) {
    evidence.push({
      kind: "mpn",
      detail: brandAgrees
        ? `${offerMpn} and the brand both match`
        : `${offerMpn} matches`,
    });
  }

  if (asinAgrees && !gtinAgrees) {
    evidence.push({
      kind: "asin",
      detail: `${offerAsin} — grouped under this product by the source`,
    });
  }

  if (offer?.upid) {
    evidence.push({
      kind: "upid",
      detail: "Clustered by Shopify Universal Product ID",
    });
  }

  if (offer?.visionVerdict?.same === true) {
    evidence.push({
      kind: "vision",
      detail: offer.visionVerdict.note ?? "Image verified against the original",
    });
  }

  if (typeof offer?.visualScore === "number") {
    evidence.push({
      kind: "visual",
      detail: `Visual similarity ${offer.visualScore.toFixed(2)}`,
    });
  }

  // --- Flags ------------------------------------------------------------
  const reusedDomains = context.reusedImages?.get(offer?.imageUrl);
  if (reusedDomains && reusedDomains.length >= 2) {
    flags.push({
      kind: FLAG.REUSED_PHOTO,
      detail: `Same photo used by ${reusedDomains.length} sellers`,
    });
  }

  const median = context.median;
  if (
    typeof median === "number" &&
    typeof offer?.price?.value === "number" &&
    (context.offerCount ?? 0) >= MIN_OFFERS_FOR_PRICE_STATS &&
    offer.price.value < median * PRICE_OUTLIER_RATIO
  ) {
    flags.push({
      kind: FLAG.PRICE_OUTLIER,
      detail: `${Math.round((1 - offer.price.value / median) * 100)}% below the median price`,
    });
  }

  if (isMarketplace(offer?.domain)) {
    flags.push({
      kind: FLAG.MARKETPLACE,
      detail: "Third-party marketplace seller",
    });
  }

  if (identity?.brand && offer?.brand && !brandAgrees) {
    flags.push({
      kind: FLAG.BRAND_ABSENT,
      detail: `Listed under "${offer.brand}", not ${identity.brand}`,
    });
  }

  // --- Tier -------------------------------------------------------------
  let tier;
  if (gtinAgrees && sourceCount >= 2) {
    tier = TIER.HIGH;
  } else if (gtinAgrees || (mpnAgrees && brandAgrees)) {
    tier = TIER.MEDIUM;
  } else if (
    offer?.visionVerdict?.same === true ||
    offer?.upid ||
    // One party's clustering assertion — real evidence, but not corroboration.
    asinAgrees
  ) {
    tier = TIER.MEDIUM;
  } else {
    tier = TIER.LOW;
  }

  // A vision judge that actively says "different product" overrides visual
  // similarity — but never overrides an agreeing GTIN, which is ground truth.
  if (offer?.visionVerdict?.same === false && !gtinAgrees) {
    tier = TIER.LOW;
    evidence.push({
      kind: "vision",
      detail: offer.visionVerdict.note ?? "Image looks like a different item",
    });
  }

  return {
    ...offer,
    tier,
    confidence: confidenceFor(tier, { flags, sourceCount }),
    evidence,
    flags,
  };
};

/**
 * Sort key only. Tier dominates; flags demote within a tier; corroboration
 * breaks ties. Never render this number on its own — a bare "0.62" implies a
 * calibration we have not earned.
 */
const confidenceFor = (tier, { flags, sourceCount }) => {
  const base = { HIGH: 0.9, MEDIUM: 0.6, LOW: 0.3 }[tier] ?? 0.3;
  const penalty = Math.min(0.15, flags.length * 0.05);
  const corroboration = Math.min(0.08, Math.max(0, sourceCount - 1) * 0.04);
  return Math.max(0, Math.min(1, base - penalty + corroboration));
};

const formatGtin = (gtin14) =>
  typeof gtin14 === "string" ? gtin14.replace(/^0+/, "") : "";

const TIER_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/**
 * Scores and ranks every offer. Ranking is by tier, then price ascending —
 * NOT by confidence, which is only a tiebreak. Within "we're equally sure
 * these are the same product", the cheapest is the most useful answer.
 *
 * Low-confidence offers are ranked last but never dropped: the product
 * decision is to show everything and label it.
 */
export const scoreAndRank = (offers, identity) => {
  const deduped = dedupeOffers(offers);
  const reusedImages = detectReusedImages(deduped);
  const median = medianPrice(deduped);

  const scored = deduped.map((offer) =>
    scoreOffer(offer, identity, {
      reusedImages,
      median,
      offerCount: deduped.length,
    }),
  );

  return scored.sort((a, b) => {
    const byTier = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (byTier !== 0) return byTier;

    // Flagged offers sink below clean ones in the same tier. Without this,
    // "cheapest first" hands the top of the list to whatever is most likely
    // fake — a real Sony ASIN returns hundreds of $10 dropshipper listings
    // that would otherwise outrank Amazon on price alone. They are still
    // shown and still labeled; they just don't lead.
    const aFlagged = a.flags.length > 0 ? 1 : 0;
    const bFlagged = b.flags.length > 0 ? 1 : 0;
    if (aFlagged !== bFlagged) return aFlagged - bFlagged;

    // A price we can't date is not a price we can compare.
    const aStale = a.priceStale ? 1 : 0;
    const bStale = b.priceStale ? 1 : 0;
    if (aStale !== bStale) return aStale - bStale;

    const aPrice = a.price?.value;
    const bPrice = b.price?.value;
    // Offers without a price sort after priced ones — an offer you can't
    // price-compare is less actionable, not more.
    if (typeof aPrice === "number" && typeof bPrice === "number") {
      if (aPrice !== bPrice) return aPrice - bPrice;
    } else if (typeof aPrice === "number") {
      return -1;
    } else if (typeof bPrice === "number") {
      return 1;
    }

    return b.confidence - a.confidence;
  });
};

/**
 * Summarizes what the identity rests on, for the dossier's identity card.
 */
export const summarizeEvidence = (scored) => {
  const gtinAgreeing = scored.filter((o) =>
    o.evidence.some((e) => e.kind === "gtin"),
  ).length;
  return {
    total: scored.length,
    high: scored.filter((o) => o.tier === TIER.HIGH).length,
    medium: scored.filter((o) => o.tier === TIER.MEDIUM).length,
    low: scored.filter((o) => o.tier === TIER.LOW).length,
    flagged: scored.filter((o) => o.flags.length > 0).length,
    gtinAgreeing,
  };
};
