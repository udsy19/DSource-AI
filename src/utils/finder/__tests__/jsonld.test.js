import assert from "node:assert/strict";
import { test } from "node:test";
import {
  asinFromUrl,
  extractJsonLdBlocks,
  flattenNodes,
  hasStrongIdentifier,
  parsePrice,
  parseProductIdentity,
} from "../jsonld.js";

const page = (jsonld) =>
  `<html><head><script type="application/ld+json">${jsonld}</script></head><body></body></html>`;

test("parses a well-formed Product", () => {
  const identity = parseProductIdentity(
    page(
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Eames Lounge Chair",
        brand: { "@type": "Brand", name: "Herman Miller" },
        gtin13: "4006381333931",
        mpn: "ES670-89",
        sku: "HM-ES670",
        image: "https://cdn.example.com/chair.jpg",
        offers: {
          "@type": "Offer",
          price: "1240.00",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      }),
    ),
    "https://example.com/p/1",
  );

  assert.equal(identity.title, "Eames Lounge Chair");
  assert.equal(identity.brand, "Herman Miller");
  assert.equal(identity.gtin, "4006381333931");
  assert.equal(identity.mpn, "ES670-89");
  assert.equal(identity.price.value, 1240);
  assert.equal(identity.price.currency, "USD");
  assert.equal(identity.inStock, true);
  assert.equal(identity.imageUrl, "https://cdn.example.com/chair.jpg");
});

test("finds the Product inside an @graph wrapper", () => {
  // Yoast and most WordPress commerce stacks ship this shape.
  const identity = parseProductIdentity(
    page(
      JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", name: "Shop" },
          { "@type": "BreadcrumbList" },
          { "@type": "Product", name: "Chair", gtin13: "4006381333931" },
        ],
      }),
    ),
  );
  assert.equal(identity.title, "Chair");
  assert.equal(identity.gtin, "4006381333931");
});

test("finds the Product in a root-level array", () => {
  const identity = parseProductIdentity(
    page(
      JSON.stringify([
        { "@type": "Organization", name: "Shop" },
        { "@type": "Product", name: "Chair" },
      ]),
    ),
  );
  assert.equal(identity.title, "Chair");
});

test("accepts an array @type containing Product", () => {
  const identity = parseProductIdentity(
    page(JSON.stringify({ "@type": ["Product", "Thing"], name: "Chair" })),
  );
  assert.equal(identity.title, "Chair");
});

test("reads offers given as an array", () => {
  const identity = parseProductIdentity(
    page(
      JSON.stringify({
        "@type": "Product",
        name: "Chair",
        offers: [
          { "@type": "Offer", price: 1240, priceCurrency: "USD" },
          { "@type": "Offer", price: 1300, priceCurrency: "USD" },
        ],
      }),
    ),
  );
  assert.equal(identity.price.value, 1240);
});

test("unwraps AggregateOffer", () => {
  const identity = parseProductIdentity(
    page(
      JSON.stringify({
        "@type": "Product",
        name: "Chair",
        offers: {
          "@type": "AggregateOffer",
          offers: [{ "@type": "Offer", price: "999", priceCurrency: "EUR" }],
        },
      }),
    ),
  );
  assert.equal(identity.price.value, 999);
  assert.equal(identity.price.currency, "EUR");
});

test("prefers the most specific GTIN key", () => {
  const identity = parseProductIdentity(
    page(
      JSON.stringify({
        "@type": "Product",
        name: "X",
        gtin14: "04006381333931",
        gtin13: "4006381333931",
      }),
    ),
  );
  assert.equal(identity.gtin, "04006381333931");
});

test("reads a GTIN out of productID", () => {
  const identity = parseProductIdentity(
    page(
      JSON.stringify({
        "@type": "Product",
        name: "X",
        productID: "gtin13:4006381333931",
      }),
    ),
  );
  assert.equal(identity.gtin, "4006381333931");
});

test("falls back to the offer for identifiers the Product omits", () => {
  const identity = parseProductIdentity(
    page(
      JSON.stringify({
        "@type": "Product",
        name: "X",
        offers: { "@type": "Offer", gtin13: "4006381333931", mpn: "M-1" },
      }),
    ),
  );
  assert.equal(identity.gtin, "4006381333931");
  assert.equal(identity.mpn, "M-1");
});

test("brand as a bare string", () => {
  const identity = parseProductIdentity(
    page(JSON.stringify({ "@type": "Product", name: "X", brand: "Vitra" })),
  );
  assert.equal(identity.brand, "Vitra");
});

test("out-of-stock availability", () => {
  const identity = parseProductIdentity(
    page(
      JSON.stringify({
        "@type": "Product",
        name: "X",
        offers: { availability: "https://schema.org/OutOfStock" },
      }),
    ),
  );
  assert.equal(identity.inStock, false);
});

test("a malformed block does not lose a valid one", () => {
  // Broken JSON-LD is common; throwing here would fail real pages.
  const html = `<html>
    <script type="application/ld+json">{ this is not json }</script>
    <script type="application/ld+json">${JSON.stringify({
      "@type": "Product",
      name: "Survivor",
    })}</script>
  </html>`;
  assert.equal(parseProductIdentity(html).title, "Survivor");
});

test("decodes HTML-escaped JSON-LD", () => {
  const html =
    '<script type="application/ld+json">{&quot;@type&quot;:&quot;Product&quot;,&quot;name&quot;:&quot;Escaped&quot;}</script>';
  assert.equal(parseProductIdentity(html).title, "Escaped");
});

test("extracts an ASIN from an Amazon URL", () => {
  assert.equal(
    asinFromUrl("https://www.amazon.com/dp/B08N5WRWNW"),
    "B08N5WRWNW",
  );
  assert.equal(
    asinFromUrl("https://www.amazon.co.uk/gp/product/B08N5WRWNW/ref=x"),
    "B08N5WRWNW",
  );
  assert.equal(asinFromUrl("https://example.com/p/1"), null);
});

test("an Amazon page with no Product markup still yields the ASIN", () => {
  // Amazon carries no GTIN in markup — the ASIN is the only identity we get.
  const identity = parseProductIdentity(
    "<html><body>no jsonld here</body></html>",
    "https://www.amazon.com/dp/B08N5WRWNW",
  );
  assert.equal(identity.asin, "B08N5WRWNW");
  assert.equal(hasStrongIdentifier(identity), true);
});

test("picks the page's own product, not a recommendation rail entry", () => {
  // "Customers also bought" carousels ship valid Product markup. Taking the
  // first node would confidently identify the wrong item.
  const identity = parseProductIdentity(
    page(
      JSON.stringify([
        {
          "@type": "Product",
          name: "Recommended Side Table",
          url: "https://shop.com/p/side-table",
        },
        {
          "@type": "Product",
          name: "The Actual Chair",
          url: "https://shop.com/p/the-chair",
          offers: { price: "1240", priceCurrency: "USD" },
        },
      ]),
    ),
    "https://shop.com/p/the-chair",
  );
  assert.equal(identity.title, "The Actual Chair");
});

test("matches the page product by @id when url is absent", () => {
  const identity = parseProductIdentity(
    page(
      JSON.stringify([
        {
          "@type": "Product",
          name: "Rail Item",
          "@id": "https://shop.com/p/other",
        },
        {
          "@type": "Product",
          name: "Real Item",
          "@id": "https://shop.com/p/mine",
        },
      ]),
    ),
    "https://shop.com/p/mine?utm_source=x",
  );
  assert.equal(identity.title, "Real Item");
});

test("falls back to the product carrying offers when no url matches", () => {
  // Rail entries usually carry no offer; the page's own product does.
  const identity = parseProductIdentity(
    page(
      JSON.stringify([
        { "@type": "Product", name: "Rail Item" },
        { "@type": "Product", name: "Real Item", offers: { price: "10" } },
      ]),
    ),
    "https://shop.com/p/unmatched",
  );
  assert.equal(identity.title, "Real Item");
});

test("a single product is used regardless of url mismatch", () => {
  // Redirects and canonical URLs mean the fetched URL often differs from the
  // markup's. With only one candidate there is nothing to disambiguate.
  const identity = parseProductIdentity(
    page(
      JSON.stringify({
        "@type": "Product",
        name: "Only Product",
        url: "https://shop.com/canonical/path",
      }),
    ),
    "https://shop.com/totally/different",
  );
  assert.equal(identity.title, "Only Product");
});

test("returns null when there is nothing to identify", () => {
  assert.equal(parseProductIdentity("<html></html>"), null);
  assert.equal(parseProductIdentity(""), null);
  assert.equal(parseProductIdentity(null), null);
});

test("a non-Product page yields nothing", () => {
  const html = page(JSON.stringify({ "@type": "Article", name: "A post" }));
  assert.equal(parseProductIdentity(html), null);
});

test("parsePrice handles the formats retailers actually emit", () => {
  assert.equal(parsePrice("$1,240.00"), 1240);
  assert.equal(parsePrice("1240"), 1240);
  assert.equal(parsePrice(1240), 1240);
  assert.equal(parsePrice("USD 1,240.50"), 1240.5);
  assert.equal(parsePrice("free"), null);
  assert.equal(parsePrice(null), null);
  assert.equal(parsePrice("0"), null, "zero is not a price");
});

test("hasStrongIdentifier distinguishes a join from a guess", () => {
  assert.equal(hasStrongIdentifier({ gtin: "4006381333931" }), true);
  assert.equal(hasStrongIdentifier({ mpn: "ES670" }), true);
  assert.equal(hasStrongIdentifier({ asin: "B08N5WRWNW" }), true);
  assert.equal(hasStrongIdentifier({ title: "A chair" }), false);
  assert.equal(hasStrongIdentifier(null), false);
});

test("extractJsonLdBlocks and flattenNodes handle junk", () => {
  assert.deepEqual(extractJsonLdBlocks(null), []);
  assert.deepEqual(extractJsonLdBlocks("<html></html>"), []);
  assert.deepEqual(flattenNodes([]), []);
  assert.deepEqual(flattenNodes([null]), []);
});
