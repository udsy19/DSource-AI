import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseArrayField,
  parseMultiValue,
  sanitizeString,
  toNumber,
} from "../product-normalize.js";

test("sanitizeString trims and nulls empty values", () => {
  assert.equal(sanitizeString("  hello  "), "hello");
  assert.equal(sanitizeString("   "), null);
  assert.equal(sanitizeString(null), null);
  assert.equal(sanitizeString(undefined), null);
  assert.equal(sanitizeString(42), "42");
});

test("parseArrayField splits on commas and pipes", () => {
  assert.deepEqual(parseArrayField("a, b | c"), ["a", "b", "c"]);
  assert.equal(parseArrayField("   "), null);
  assert.equal(parseArrayField(null), null);
});

test("parseMultiValue splits only on pipes", () => {
  assert.deepEqual(parseMultiValue("a | b|c"), ["a", "b", "c"]);
  assert.deepEqual(parseMultiValue("a, b"), ["a, b"]);
  assert.equal(parseMultiValue(""), null);
});

test("toNumber parses finite numbers only", () => {
  assert.equal(toNumber("3.14"), 3.14);
  assert.equal(toNumber(""), null);
  assert.equal(toNumber(null), null);
  assert.equal(toNumber("not-a-number"), null);
});
