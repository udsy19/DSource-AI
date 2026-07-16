import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dedupeOffers,
  detectReusedImages,
  domainOf,
  isValidGtinCheckDigit,
  medianPrice,
  normalizeGtin,
  normalizeMpn,
  scoreAndRank,
  scoreOffer,
  summarizeEvidence,
  TIER,
} from "../score.js";

// Real GTINs with valid check digits, used throughout.
const EAN13 = "4006381333931";
const EAN13_AS_14 = "04006381333931";
const UPC12 = "036000291452";
const UPC12_AS_14 = "00036000291452";

test("normalizeGtin canonicalizes every width to 14 digits", () => {
  assert.equal(normalizeGtin(EAN13), EAN13_AS_14);
  assert.equal(normalizeGtin(UPC12), UPC12_AS_14);
  assert.equal(normalizeGtin(EAN13_AS_14), EAN13_AS_14);
});

test("normalizeGtin makes the same product compare equal across widths", () => {
  // The whole point: a UPC-A on one retailer and the padded GTIN-14 on another
  // are the same product. Raw string comparison would call these different.
  assert.equal(normalizeGtin(UPC12), normalizeGtin(UPC12_AS_14));
});

test("normalizeGtin strips separators and accepts numbers", () => {
  assert.equal(normalizeGtin("4006381-333931"), EAN13_AS_14);
  assert.equal(normalizeGtin("4006381 333931"), EAN13_AS_14);
  assert.equal(normalizeGtin(4006381333931), EAN13_AS_14);
});

test("normalizeGtin rejects bad check digits and malformed input", () => {
  assert.equal(normalizeGtin("4006381333932"), null, "wrong check digit");
  assert.equal(normalizeGtin("123"), null, "wrong length");
  assert.equal(normalizeGtin("400638133393X"), null, "non-numeric");
  assert.equal(normalizeGtin(""), null);
  assert.equal(normalizeGtin(null), null);
  assert.equal(normalizeGtin({}), null);
});

test("isValidGtinCheckDigit requires exactly 14 digits", () => {
  assert.equal(isValidGtinCheckDigit(EAN13_AS_14), true);
  assert.equal(isValidGtinCheckDigit(EAN13), false, "13 digits is not GTIN-14");
  assert.equal(isValidGtinCheckDigit("abcdefghijklmn"), false);
});

test("normalizeMpn ignores formatting but keeps meaning", () => {
  assert.equal(normalizeMpn("ES670-89"), "ES67089");
  assert.equal(normalizeMpn("es670 89"), "ES67089");
  assert.equal(normalizeMpn("ES67089"), "ES67089");
  assert.equal(normalizeMpn("ab"), null, "too short to be an identifier");
  assert.equal(normalizeMpn(null), null);
});

test("domainOf strips www and lowercases", () => {
  assert.equal(domainOf("https://www.Vitra.com/en/product/123"), "vitra.com");
  assert.equal(domainOf("not a url"), null);
  assert.equal(domainOf(null), null);
});

test("dedupeOffers merges the same listing seen by two providers", () => {
  const merged = dedupeOffers([
    {
      url: "https://vitra.com/p/1?utm_source=lens",
      seller: "Vitra",
      source: "lens",
      imageUrl: "https://cdn.vitra.com/a.jpg",
    },
    {
      url: "https://vitra.com/p/1",
      source: "shopsavvy",
      price: { value: 1240, currency: "USD" },
      identifiers: { gtin: EAN13 },
    },
  ]);

  assert.equal(merged.length, 1, "tracking params must not split an offer");
  assert.deepEqual(merged[0].sources.sort(), ["lens", "shopsavvy"]);
  // Each provider contributed the field the other lacked.
  assert.equal(merged[0].price.value, 1240);
  assert.equal(merged[0].imageUrl, "https://cdn.vitra.com/a.jpg");
  assert.equal(merged[0].identifiers.gtin, EAN13);
});

test("dedupeOffers keeps genuinely different sellers apart", () => {
  const merged = dedupeOffers([
    { url: "https://vitra.com/p/1", source: "lens" },
    { url: "https://dwr.com/p/1", source: "lens" },
  ]);
  assert.equal(merged.length, 2);
});

test("dedupeOffers survives junk", () => {
  assert.deepEqual(dedupeOffers([]), []);
  assert.deepEqual(dedupeOffers(null), []);
  assert.equal(dedupeOffers([null, undefined]).length, 0);
});

test("detectReusedImages finds photos shared across sellers", () => {
  const reused = detectReusedImages([
    { url: "https://a.com/p", imageUrl: "https://cdn/mfr.jpg" },
    { url: "https://b.com/p", imageUrl: "https://cdn/mfr.jpg" },
    { url: "https://c.com/p", imageUrl: "https://cdn/own.jpg" },
  ]);
  assert.deepEqual(reused.get("https://cdn/mfr.jpg"), ["a.com", "b.com"]);
  assert.equal(reused.has("https://cdn/own.jpg"), false, "one seller is fine");
});

test("detectReusedImages does not flag one seller reusing its own photo", () => {
  const reused = detectReusedImages([
    { url: "https://a.com/p/1", imageUrl: "https://cdn/x.jpg" },
    { url: "https://a.com/p/2", imageUrl: "https://cdn/x.jpg" },
  ]);
  assert.equal(reused.size, 0);
});

test("medianPrice ignores missing and non-positive prices", () => {
  assert.equal(
    medianPrice([
      { price: { value: 100 } },
      { price: { value: 300 } },
      { price: { value: 200 } },
    ]),
    200,
  );
  assert.equal(
    medianPrice([{ price: { value: 100 } }, { price: { value: 200 } }]),
    150,
    "even count averages the middle two",
  );
  assert.equal(medianPrice([{}, { price: null }]), null);
  assert.equal(medianPrice([]), null);
});

test("scoreOffer: GTIN agreement across two sources is HIGH", () => {
  const scored = scoreOffer(
    {
      url: "https://vitra.com/p/1",
      domain: "vitra.com",
      identifiers: { gtin: EAN13 },
      sources: ["lens", "shopsavvy"],
    },
    { gtin: EAN13_AS_14 },
  );
  assert.equal(scored.tier, TIER.HIGH);
  const gtinEvidence = scored.evidence.find((e) => e.kind === "gtin");
  assert.ok(gtinEvidence);
  // The renderer prefixes the kind, so the detail must not repeat it —
  // otherwise the UI reads "GTIN GTIN 4006381333931 matches".
  assert.equal(
    /gtin/i.test(gtinEvidence.detail),
    false,
    "evidence detail must not repeat its own kind",
  );
});

test("scoreOffer: GTIN agreement from a single source is only MEDIUM", () => {
  // One provider echoing itself is not corroboration.
  const scored = scoreOffer(
    {
      url: "https://vitra.com/p/1",
      identifiers: { gtin: EAN13 },
      sources: ["lens"],
    },
    { gtin: EAN13_AS_14 },
  );
  assert.equal(scored.tier, TIER.MEDIUM);
});

test("scoreOffer: GTIN agreement works across identifier widths", () => {
  const scored = scoreOffer(
    {
      url: "https://a.com/p",
      identifiers: { gtin: UPC12 },
      sources: ["a", "b"],
    },
    { gtin: UPC12_AS_14 },
  );
  assert.equal(scored.tier, TIER.HIGH, "UPC-12 must match its GTIN-14 form");
});

test("scoreOffer: MPN plus brand agreement is MEDIUM", () => {
  const scored = scoreOffer(
    {
      url: "https://a.com/p",
      brand: "Herman Miller",
      identifiers: { mpn: "es670-89" },
      sources: ["lens"],
    },
    { brand: "herman miller", mpn: "ES67089" },
  );
  assert.equal(scored.tier, TIER.MEDIUM);
});

test("scoreOffer: visual similarity alone is LOW", () => {
  const scored = scoreOffer(
    { url: "https://a.com/p", visualScore: 0.91, sources: ["lens"] },
    { title: "A chair" },
  );
  assert.equal(scored.tier, TIER.LOW, "no identifier means we did not verify");
});

test("scoreOffer: a vision veto demotes to LOW", () => {
  const scored = scoreOffer(
    {
      url: "https://a.com/p",
      visualScore: 0.88,
      visionVerdict: { same: false, note: "different arm profile" },
      sources: ["lens"],
    },
    { title: "A chair" },
  );
  assert.equal(scored.tier, TIER.LOW);
});

test("scoreOffer: a vision veto never overrides an agreeing GTIN", () => {
  // GTIN is ground truth; a model disagreeing with it is the model being
  // wrong, not the identifier. Photos differ legitimately (angle, styling).
  const scored = scoreOffer(
    {
      url: "https://a.com/p",
      identifiers: { gtin: EAN13 },
      visionVerdict: { same: false, note: "looks different" },
      sources: ["lens", "shopsavvy"],
    },
    { gtin: EAN13_AS_14 },
  );
  assert.equal(scored.tier, TIER.HIGH);
});

test("scoreOffer flags a reused manufacturer photo", () => {
  const offers = [
    { url: "https://a.com/p", imageUrl: "https://cdn/mfr.jpg" },
    { url: "https://b.com/p", imageUrl: "https://cdn/mfr.jpg" },
  ];
  const reusedImages = detectReusedImages(offers);
  const scored = scoreOffer(
    { ...offers[0], domain: "a.com" },
    {},
    { reusedImages },
  );
  assert.ok(scored.flags.some((f) => f.kind === "reused-photo"));
});

test("scoreOffer flags a price far below the median", () => {
  const scored = scoreOffer(
    { url: "https://x.com/p", price: { value: 289 } },
    {},
    { median: 1200, offerCount: 5 },
  );
  assert.ok(scored.flags.some((f) => f.kind === "price-outlier"));
});

test("scoreOffer does not flag price outliers without enough offers", () => {
  // Two offers do not make a median worth accusing anyone over.
  const scored = scoreOffer(
    { url: "https://x.com/p", price: { value: 289 } },
    {},
    { median: 1200, offerCount: 2 },
  );
  assert.equal(
    scored.flags.some((f) => f.kind === "price-outlier"),
    false,
  );
});

test("scoreOffer flags marketplace listings and brand mismatches", () => {
  const scored = scoreOffer(
    {
      url: "https://aliexpress.com/p",
      domain: "aliexpress.com",
      brand: "Generic",
    },
    { brand: "Herman Miller" },
  );
  assert.ok(scored.flags.some((f) => f.kind === "marketplace"));
  assert.ok(scored.flags.some((f) => f.kind === "brand-absent"));
});

test("scoreAndRank orders by tier, then by price ascending", () => {
  const ranked = scoreAndRank(
    [
      {
        url: "https://cheap-low.com/p",
        price: { value: 100 },
        sources: ["lens"],
      },
      {
        url: "https://dwr.com/p",
        identifiers: { gtin: EAN13 },
        price: { value: 1195 },
        sources: ["lens", "shopsavvy"],
      },
      {
        url: "https://vitra.com/p",
        identifiers: { gtin: EAN13 },
        price: { value: 1240 },
        sources: ["lens", "shopsavvy"],
      },
    ],
    { gtin: EAN13_AS_14 },
  );

  assert.equal(ranked[0].domain, "dwr.com", "HIGH tier, cheapest first");
  assert.equal(ranked[1].domain, "vitra.com");
  // The $100 listing is cheapest overall but unverified — it must not lead.
  assert.equal(ranked[2].domain, "cheap-low.com");
  assert.equal(ranked[2].tier, TIER.LOW);
});

test("a product-level image does not trigger the reused-photo flag", () => {
  // Aggregators return ONE product photo for all their offers. Counting that
  // as "shared across sellers" flagged every result in a real Sony lookup and
  // turned the fraud signal into noise.
  const reused = detectReusedImages([
    {
      url: "https://a.com/p",
      imageUrl: "https://cdn/product.jpg",
      imageIsProductLevel: true,
    },
    {
      url: "https://b.com/p",
      imageUrl: "https://cdn/product.jpg",
      imageIsProductLevel: true,
    },
  ]);
  assert.equal(reused.size, 0);
});

test("ASIN agreement lifts an offer to MEDIUM but never to HIGH", () => {
  // Amazon publishes no GTIN, so without ASIN nothing from an Amazon URL
  // could ever clear LOW. But we queried BY asin, so the aggregator echoing
  // it back is an assertion, not corroboration.
  const scored = scoreOffer(
    {
      url: "https://walmart.com/p",
      identifiers: { asin: "B0863TXGM3" },
      sources: ["shopsavvy", "lens"],
    },
    { asin: "B0863TXGM3" },
  );
  assert.equal(scored.tier, TIER.MEDIUM, "never HIGH on an echoed identifier");
  assert.ok(scored.evidence.some((e) => e.kind === "asin"));
});

test("scoreAndRank sinks flagged offers below clean ones in the same tier", () => {
  // A real Sony ASIN returns hundreds of $10 dropshipper listings. Ranking on
  // price alone hands them the top of the list.
  const ranked = scoreAndRank(
    [
      {
        url: "https://scam.myshopify.com/p",
        domain: "aliexpress.com",
        identifiers: { asin: "B0863TXGM3" },
        price: { value: 10 },
        sources: ["shopsavvy"],
      },
      {
        url: "https://walmart.example/p",
        identifiers: { asin: "B0863TXGM3" },
        price: { value: 348 },
        sources: ["shopsavvy"],
      },
    ],
    { asin: "B0863TXGM3" },
  );
  assert.equal(
    ranked[0].domain,
    "walmart.example",
    "clean beats cheap-and-flagged",
  );
  assert.ok(ranked[1].flags.length > 0);
  assert.equal(ranked.length, 2, "the flagged one is still shown");
});

test("scoreAndRank sinks stale prices below fresh ones in the same tier", () => {
  const ranked = scoreAndRank(
    [
      {
        url: "https://old.example/p",
        price: { value: 50 },
        priceStale: true,
        sources: ["shopsavvy"],
      },
      {
        url: "https://fresh.example/p",
        price: { value: 80 },
        sources: ["shopsavvy"],
      },
    ],
    {},
  );
  assert.equal(
    ranked[0].domain,
    "fresh.example",
    "a dated price can't be compared",
  );
});

test("scoreAndRank keeps low-confidence offers rather than dropping them", () => {
  // The product decision is show-everything-and-label-it.
  const ranked = scoreAndRank(
    [{ url: "https://sketchy.com/p", sources: ["lens"] }],
    { gtin: EAN13_AS_14 },
  );
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].tier, TIER.LOW);
});

test("scoreAndRank sorts unpriced offers after priced ones", () => {
  const ranked = scoreAndRank(
    [
      { url: "https://noprice.com/p", sources: ["lens"] },
      { url: "https://priced.com/p", price: { value: 500 }, sources: ["lens"] },
    ],
    {},
  );
  assert.equal(ranked[0].domain, "priced.com");
});

test("summarizeEvidence counts each tier and flag", () => {
  const ranked = scoreAndRank(
    [
      {
        url: "https://vitra.com/p",
        identifiers: { gtin: EAN13 },
        sources: ["lens", "shopsavvy"],
      },
      { url: "https://aliexpress.com/p", sources: ["lens"] },
    ],
    { gtin: EAN13_AS_14 },
  );
  const summary = summarizeEvidence(ranked);
  assert.equal(summary.total, 2);
  assert.equal(summary.high, 1);
  assert.equal(summary.low, 1);
  assert.equal(summary.gtinAgreeing, 1);
  assert.ok(summary.flagged >= 1, "the marketplace listing is flagged");
});
