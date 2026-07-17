import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePrefixSegments, urlFromSegments } from "../prefix-url.js";

const seg = (path) => path.split("/").filter(Boolean);

test("rebuilds a product URL from the prefix", () => {
  assert.equal(
    urlFromSegments(seg("ikea.com/gb/en/p/billy-bookcase-white-00263850")),
    "https://ikea.com/gb/en/p/billy-bookcase-white-00263850",
  );
  assert.equal(
    urlFromSegments(seg("www.amazon.com/dp/B0863TXGM3")),
    "https://www.amazon.com/dp/B0863TXGM3",
  );
});

test("carries the query string — it belongs to the target, not to us", () => {
  // Product pages are full of ?variant= / ?color= and dropping them lands the
  // user on a different product than the one they were looking at.
  assert.equal(
    urlFromSegments(
      seg("shop.com/p/chair"),
      new URLSearchParams({ variant: "42", color: "oak" }),
    ),
    "https://shop.com/p/chair?variant=42&color=oak",
  );
});

test("a bare domain is enough", () => {
  assert.equal(urlFromSegments(seg("ikea.com")), "https://ikea.com");
});

test("REFUSES anything that is not unmistakably a hostname", () => {
  // This is the guard that stops the catch-all from re-creating the bug we
  // deleted: a typo must 404, not silently become a product search.
  for (const path of [
    "pricng",
    "abut",
    "some-random-path",
    "hello",
    "p",
    "404",
  ]) {
    assert.equal(
      urlFromSegments(seg(path)),
      null,
      `"${path}" must not be read as a host`,
    );
  }
});

test("REFUSES reserved app routes even though they are real paths", () => {
  for (const path of [
    "api/material-finder",
    "material-finder/find",
    "about",
    "pricing",
    "studio/x",
  ]) {
    assert.equal(
      urlFromSegments(seg(path)),
      null,
      `"${path}" is ours, not a target`,
    );
  }
});

test("REFUSES file-ish paths", () => {
  for (const path of [
    "sitemap.xml",
    "robots.txt",
    "favicon.ico",
    "index.php",
  ]) {
    assert.equal(
      urlFromSegments(seg(path)),
      null,
      `"${path}" is a file, not a host`,
    );
  }
});

test("REFUSES junk that superficially looks hostlike", () => {
  assert.equal(
    urlFromSegments(seg("a.b")),
    null,
    "TLD too short / name too short",
  );
  assert.equal(
    urlFromSegments(seg("-bad.com")),
    null,
    "label cannot start with a hyphen",
  );
  assert.equal(urlFromSegments(seg("has space.com")), null);
  assert.equal(urlFromSegments([]), null);
  assert.equal(urlFromSegments(null), null);
  assert.equal(urlFromSegments(["", ""]), null);
});

test("tolerates a pasted scheme", () => {
  // dsource.ai/https://ikea.com/x and dsource.ai/ikea.com/x are the same wish.
  const raw = ["https:", "", "ikea.com", "gb", "p", "billy"];
  assert.equal(
    urlFromSegments(normalizePrefixSegments(raw)),
    "https://ikea.com/gb/p/billy",
  );
});

test("normalizePrefixSegments drops empties and a leading scheme", () => {
  assert.deepEqual(normalizePrefixSegments(["https:", "", "a.com", "b"]), [
    "a.com",
    "b",
  ]);
  assert.deepEqual(normalizePrefixSegments(["http:", "", "a.com"]), ["a.com"]);
  assert.deepEqual(normalizePrefixSegments(["a.com", "b"]), ["a.com", "b"]);
  assert.deepEqual(normalizePrefixSegments(null), []);
});

test("re-encodes path segments rather than trusting them", () => {
  const url = urlFromSegments(seg("shop.com/p/chair%20one"));
  assert.equal(url, "https://shop.com/p/chair%20one");
});
