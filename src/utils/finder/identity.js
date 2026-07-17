import {
  callWithRetry,
  extractJsonResponse,
  getResponseText,
  parseImageData,
} from "@/utils/gemini";
import { explainFetchFailure, fetchProductPage } from "./fetch-ladder";
import { hasStrongIdentifier, parseProductIdentity } from "./jsonld";

/**
 * Resolving "what product is this?" from either input path.
 *
 * The two paths are asymmetric and it's worth being blunt about why:
 *
 *   URL   -> a database join. JSON-LD gives a real identifier; we look it up.
 *   IMAGE -> a guess. The model reads whatever text is visible and we search
 *            that string. When a label is legible this is ~95% reliable; when
 *            it isn't, the model fails CONFIDENTLY and its confidence does not
 *            track correctness.
 *
 * That second failure mode is the whole reason `findability` exists below. A
 * fluent, specific, wrong answer is worse than an honest "we can't tell", so
 * the model is asked to rate its own footing and we propagate that verdict to
 * the UI rather than burying it.
 */

const TRIAGE_MODEL = "gemini-2.5-flash";

const TRIAGE_PROMPT = `
You are identifying a single product from a photo so it can be found for sale.

Read ONLY what is actually visible. Do not infer a brand from styling, and do
not guess a model number that is not legibly printed. A confident wrong answer
is much worse than an honest "unknown" — an unknown sends the user down a
different, working path, while a wrong guess sends them nowhere.

Report:
- brand: the brand name if it is legibly printed or unmistakably a logo, else null
- model: the model/part number if legibly printed, else null
- barcode: the digits if a barcode or its printed number is legible, else null
- title: a short plain-language name for the item ("walnut lounge chair")
- category: a broad category ("seating", "lighting", "tile", "appliance")
- query: a search query (max 8 words) that would find this exact product
- findability: one of
    "identifier"  - a brand+model or barcode is legible; this is findable exactly
    "branded"     - a brand is legible but no model; findable with effort
    "generic"     - no identifiers visible; only a visual match is possible
- note: at most 12 words on what you could and could not read

Respond with pure JSON (no markdown fencing):
{ "brand": string|null, "model": string|null, "barcode": string|null,
  "title": string, "category": string, "query": string,
  "findability": "identifier"|"branded"|"generic", "note": string }
`;

const FINDABILITY = new Set(["identifier", "branded", "generic"]);

/**
 * Reads a product photo into an identity.
 *
 * Fail-open, per the house convention for auxiliary AI steps: on any failure
 * we return a `generic` identity rather than throwing, so the search still
 * runs on a visual match and the user gets something honest.
 */
export const identifyFromImage = async (ai, imageDataUri) => {
  const fallback = {
    title: null,
    brand: null,
    gtin: null,
    mpn: null,
    query: null,
    category: null,
    findability: "generic",
    note: "We couldn't read any labels on this photo.",
    source: "vision",
    identifiers: {},
  };

  try {
    const image = parseImageData(imageDataUri);
    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: TRIAGE_MODEL,
          contents: [
            { inlineData: { mimeType: image.mimeType, data: image.data } },
            { text: TRIAGE_PROMPT },
          ],
        }),
      { label: "Product triage", timeoutMs: 20_000, retries: 0 },
    );

    const parsed = extractJsonResponse(await getResponseText(response));
    if (!parsed) return fallback;

    const brand = trimOrNull(parsed.brand, 80);
    const mpn = trimOrNull(parsed.model, 60);
    const gtin = digitsOrNull(parsed.barcode);
    const findability = FINDABILITY.has(parsed.findability)
      ? parsed.findability
      : "generic";

    return {
      title: trimOrNull(parsed.title, 120),
      brand,
      gtin,
      mpn,
      asin: null,
      query: trimOrNull(parsed.query, 120) ?? trimOrNull(parsed.title, 120),
      category: trimOrNull(parsed.category, 60),
      findability,
      note: trimOrNull(parsed.note, 120),
      source: "vision",
      identifiers: pruneNullish({ gtin, mpn }),
    };
  } catch (error) {
    console.error("Product triage skipped:", error.message);
    return fallback;
  }
};

/**
 * Reads a product URL into an identity.
 *
 * Unlike the image path this can legitimately fail (blocked, 404, no markup),
 * and the caller needs to distinguish those — so failures come back as a
 * result object, not an exception.
 */
export const identifyFromUrl = async (url) => {
  const page = await fetchProductPage(url);
  if (!page.ok) {
    return {
      ok: false,
      reason: page.reason,
      error: explainFetchFailure(page.reason),
    };
  }

  const identity = parseProductIdentity(page.html, url);
  if (!identity) {
    return {
      ok: false,
      reason: "no-product",
      error:
        "We read that page but couldn't find a product on it. Is it a product page?",
    };
  }

  return {
    ok: true,
    identity: {
      ...identity,
      // A page with a GTIN is a join; a page with only a title is a guess.
      // The rest of the pipeline branches on this, so name it the same way
      // the image path does.
      findability: hasStrongIdentifier(identity) ? "identifier" : "generic",
      query: identity.title,
      sourceUrl: url,
    },
    via: page.via,
  };
};

const trimOrNull = (value, max) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const digitsOrNull = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const digits = String(value).replace(/[^\d]/g, "");
  return digits.length >= 8 && digits.length <= 14 ? digits : null;
};

const pruneNullish = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
