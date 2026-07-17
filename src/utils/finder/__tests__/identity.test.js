import assert from "node:assert/strict";
import { test } from "node:test";
import { enrichIdentity, offerFromSource, searchKeyFor } from "../score.js";

test("searchKeyFor prefers identifiers over prose, strongest first", () => {
  assert.deepEqual(
    searchKeyFor({
      gtin: "4006381333931",
      asin: "B0863TXGM3",
      mpn: "X",
      title: "t",
    }),
    { kind: "gtin", value: "4006381333931" },
  );
  assert.deepEqual(
    searchKeyFor({ asin: "B0863TXGM3", mpn: "X1", title: "t" }),
    {
      kind: "asin",
      value: "B0863TXGM3",
    },
  );
});

test("searchKeyFor returns a BARE mpn, never brand-prefixed", () => {
  // Verified against the live ShopSavvy API: ids=WH-1000XM4 returns offers,
  // ids="SONY WH-1000XM4" errors. This value is an identifier for lookup, not
  // a search phrase — prefixing the brand silently returned zero sellers for
  // every photo-identified product.
  const key = searchKeyFor({
    brand: "SONY",
    mpn: "WH-1000XM4",
    title: "Sony headphones",
  });
  assert.deepEqual(key, { kind: "mpn", value: "WH-1000XM4" });
  assert.equal(
    /sony/i.test(key.value),
    false,
    "the brand must not be in the identifier",
  );
});

test("searchKeyFor falls back to text only when no identifier exists", () => {
  assert.deepEqual(searchKeyFor({ query: "walnut lounge chair" }), {
    kind: "text",
    value: "walnut lounge chair",
  });
  assert.deepEqual(searchKeyFor({ title: "a chair" }), {
    kind: "text",
    value: "a chair",
  });
  assert.equal(searchKeyFor({}), null);
  assert.equal(searchKeyFor(null), null);
});

test("enrichIdentity fills blanks but never overwrites the source page", () => {
  // What we read from the product's own page outranks a third party's claim.
  const enriched = enrichIdentity(
    { title: null, brand: null, asin: "B0863TXGM3", mpn: null },
    [
      {
        title: "Sony WH-1000XM4",
        brand: "Sony",
        identifiers: { mpn: "WH1000XM4/B" },
      },
    ],
  );
  assert.equal(enriched.title, "Sony WH-1000XM4");
  assert.equal(enriched.mpn, "WH1000XM4/B");
  assert.equal(enriched.asin, "B0863TXGM3");
});

test("enrichIdentity does not clobber a title we already read", () => {
  const enriched = enrichIdentity(
    { title: "From the page", brand: "RealBrand" },
    [{ title: "From an aggregator", brand: "OtherBrand", identifiers: {} }],
  );
  assert.equal(enriched.title, "From the page");
  assert.equal(enriched.brand, "RealBrand");
});

test("enrichIdentity survives no offers", () => {
  assert.equal(enrichIdentity({ title: "x" }, []).title, "x");
  assert.equal(enrichIdentity({ title: "x" }, null).title, "x");
});

test("offerFromSource makes the pasted page a seller", () => {
  // Paste a Vitra link and Vitra must appear among the sellers — it also means
  // the URL path returns something useful with zero providers configured.
  const offer = offerFromSource({
    sourceUrl: "https://www.vitra.com/en-gb/product/123",
    brand: "Vitra",
    title: "Eames Lounge",
    identifiers: { gtin: "4006381333931" },
  });
  assert.equal(offer.domain, "vitra.com");
  assert.equal(offer.seller, "Vitra");
  assert.equal(offer.source, "source-page");
  assert.equal(offer.identifiers.gtin, "4006381333931");
});

test("offerFromSource is null for the image path", () => {
  assert.equal(offerFromSource({ title: "from a photo" }), null);
  assert.equal(offerFromSource(null), null);
});
