import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { searchShopSavvy } from "../providers/shopsavvy.js";

/**
 * Fixture copied from a REAL /v1/products/offers?ids= response (2026-07-16).
 * Every quirk here is one the live API actually has, and each one silently
 * produced zero sellers before it was found by probing:
 *   - offers nested at data[0].offers, not data.offers
 *   - the link field is `URL`, uppercase
 *   - availability is the bare string "in"
 */
const LIVE_SHAPE = {
  success: true,
  data: [
    {
      title: "Coca-Cola, 12 fl oz, 6 Pack",
      brand: "Coca-Cola",
      barcode: "49000006346",
      amazon: "B01DSYGR7O",
      model: "049000012507",
      mpn: "049000012507",
      images: ["https://i.shopsavvy.com/coke.jpg"],
      identifiers: { amazon: "B01DSYGR7O", barcode: 49000006346 },
      offers: [
        {
          availability: "in",
          condition: "new",
          retailer: "Target",
          currency: "USD",
          price: 8.99,
          seller: null,
          URL: "https://www.target.com/p/coke",
          timestamp: "2026-07-07T23:29:05.248Z",
        },
        {
          availability: null,
          condition: "new",
          retailer: "Shop Smart Deals",
          currency: "USD",
          price: 17.97,
          seller: "ThirdPartyCo",
          URL: "https://www.shopsmartdeals.com/products/coke",
          timestamp: "2017-01-01T00:00:00.000Z",
        },
      ],
    },
  ],
  meta: { credits_used: 3, credits_remaining: 993 },
};

const NOW = Date.parse("2026-07-16T00:00:00.000Z");

const withFetch = (impl, fn) => async () => {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  process.env.SHOPSAVVY_API_KEY = "ss_test";
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
    mock.restoreAll();
  }
};

const ok = (body) => async () => ({
  ok: true,
  status: 200,
  json: async () => body,
});

test(
  "parses the live wire format: nested offers, uppercase URL, bare 'in'",
  withFetch(ok(LIVE_SHAPE), async () => {
    const offers = await searchShopSavvy(
      { kind: "gtin", value: "049000006346" },
      { now: NOW },
    );

    assert.equal(offers.length, 2, "offers live at data[0].offers");

    const target = offers[0];
    assert.equal(target.seller, "Target");
    assert.equal(target.url, "https://www.target.com/p/coke", "reads `URL`");
    assert.equal(target.domain, "target.com");
    assert.equal(target.price.value, 8.99);
    assert.equal(target.inStock, true, "'in' means in stock");
    assert.equal(target.priceStale, false, "observed last week");
  }),
);

test(
  "labels a stale price rather than presenting it as current",
  withFetch(ok(LIVE_SHAPE), async () => {
    // The real API mixes 2017 observations in with this week's.
    const offers = await searchShopSavvy(
      { kind: "gtin", value: "049000006346" },
      { now: NOW },
    );
    const old = offers[1];
    assert.equal(old.priceStale, true);
    assert.ok(old.ageDays > 3000, "a 2017 price is ~9 years old");
    assert.equal(old.inStock, null, "null availability is unknown, not false");
    assert.equal(old.marketplaceSeller, "ThirdPartyCo");
  }),
);

test(
  "carries identifiers from the product, so offers can clear LOW",
  withFetch(ok(LIVE_SHAPE), async () => {
    const offers = await searchShopSavvy(
      { kind: "gtin", value: "049000006346" },
      { now: NOW },
    );
    // 49000006346 is a 11-digit barcode; normalizeGtin pads/validates it.
    assert.equal(offers[0].identifiers.asin, "B01DSYGR7O");
    assert.equal(offers[0].identifiers.mpn, "049000012507");
  }),
);

test(
  "sends ids= (plural) — every other param name is rejected by the API",
  withFetch(
    async (url) => {
      assert.ok(
        url.includes("/v1/products/offers?ids="),
        `expected /v1/products/offers?ids=, got ${url}`,
      );
      return { ok: true, status: 200, json: async () => LIVE_SHAPE };
    },
    async () => {
      await searchShopSavvy(
        { kind: "gtin", value: "049000006346" },
        { now: NOW },
      );
    },
  ),
);

test(
  "does not spend credits on a text query",
  withFetch(
    async () => {
      throw new Error("must not call the API for a text key");
    },
    async () => {
      const offers = await searchShopSavvy(
        { kind: "text", value: "a grey chair" },
        { now: NOW },
      );
      assert.deepEqual(offers, []);
    },
  ),
);

test(
  "surfaces a success:false body as an error rather than silent emptiness",
  withFetch(
    ok({
      success: false,
      error: "A product identifier is required.",
      error_detail: { code: "ERR_IDENTIFIER_REQUIRED" },
      // The live API zeroes this on errors regardless of the real balance —
      // never infer billing state from it.
      meta: { credits_remaining: 0 },
    }),
    async () => {
      await assert.rejects(
        () => searchShopSavvy({ kind: "gtin", value: "1" }, { now: NOW }),
        /ERR_IDENTIFIER_REQUIRED/,
      );
    },
  ),
);

test(
  "an unknown product is empty, not an error",
  withFetch(
    async () => ({ ok: false, status: 404 }),
    async () => {
      const offers = await searchShopSavvy(
        { kind: "gtin", value: "049000006346" },
        { now: NOW },
      );
      assert.deepEqual(offers, []);
    },
  ),
);

test(
  "drops offers with no link — an offer you cannot open is not an offer",
  withFetch(
    ok({
      success: true,
      data: [{ title: "X", offers: [{ retailer: "Ghost", price: 5 }] }],
    }),
    async () => {
      const offers = await searchShopSavvy(
        { kind: "gtin", value: "049000006346" },
        { now: NOW },
      );
      assert.deepEqual(offers, []);
    },
  ),
);
