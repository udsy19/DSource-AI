import {
  callWithRetry,
  extractJsonResponse,
  getResponseText,
  parseImageData,
} from "@/utils/gemini";
import { normalizeGtin } from "./score";

/**
 * Per-offer visual verification.
 *
 * This is the step that separates "found the same product" from "found
 * something that looks like it" — which is the entire difference between what
 * we're building and a similar-items feed.
 *
 * Two economics rules, both load-bearing:
 *
 * 1. NEVER verify an offer whose GTIN already agrees. The identifier is ground
 *    truth; a model second-guessing it is the model being wrong. Shopify skips
 *    the LLM for ~80% of merchants this way, and it's the single biggest cost
 *    lever here.
 * 2. Fail-open. Verification is an enhancement — if it errors, the offer keeps
 *    the tier its identifiers earned. It never blocks a result.
 */

const VERIFY_MODEL = "gemini-2.5-flash";
const VERIFY_TIMEOUT_MS = 30_000;
const MAX_VERIFY = 8;

const VERIFY_PROMPT = (count) => `
The FIRST image is the product the user is looking for.
The next ${count} images are numbered candidate listings (1..${count}), in order.

For each candidate, decide whether it is THE SAME PRODUCT — the same
manufacturer's same model — not merely a similar-looking item.

Be strict. A different colourway of the same model is still the same product.
A different model with the same silhouette is NOT. When you cannot tell,
say so rather than guessing: "unsure" is a useful answer here and a wrong
"yes" is not.

Respond with pure JSON (no markdown fencing):
{ "verdicts": [ { "n": number, "same": true|false|null, "note": string } ] }
"same": true = same product, false = different product, null = cannot tell.
"note" is at most 8 words on what decided it, e.g. "same shell, same base"
or "arms differ, deeper seat".
`;

/**
 * Verifies candidate offers against the query image.
 *
 * @param {object} ai GoogleGenAI client
 * @param {string} queryImageDataUri
 * @param {object[]} offers
 * @param {object} identity
 * @returns {Promise<object[]>} offers, each possibly carrying `visionVerdict`
 */
export const verifyOffers = async (ai, queryImageDataUri, offers, identity) => {
  if (!queryImageDataUri || !Array.isArray(offers) || offers.length === 0) {
    return offers ?? [];
  }

  const identityGtin = normalizeGtin(identity?.gtin);

  // Rule 1: skip anything the identifier already settled.
  const needsVerify = [];
  const settled = [];
  for (const offer of offers) {
    const offerGtin = normalizeGtin(offer?.identifiers?.gtin);
    if (identityGtin && offerGtin && offerGtin === identityGtin) {
      settled.push(offer);
    } else if (offer?.imageUrl) {
      needsVerify.push(offer);
    } else {
      settled.push(offer);
    }
  }

  if (needsVerify.length === 0) return offers;

  const batch = needsVerify.slice(0, MAX_VERIFY);
  const unverified = needsVerify.slice(MAX_VERIFY);

  try {
    // Fetch candidate images in parallel — sequential fetches dominated the
    // wall-clock time of the equivalent step in reverse-search.
    const loaded = (
      await Promise.all(batch.map((offer) => loadImagePart(offer)))
    ).filter(Boolean);

    if (loaded.length === 0) return offers;

    const query = parseImageData(queryImageDataUri);
    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: VERIFY_MODEL,
          contents: [
            { inlineData: { mimeType: query.mimeType, data: query.data } },
            ...loaded.map((l) => l.part),
            { text: VERIFY_PROMPT(loaded.length) },
          ],
        }),
      { label: "Offer verification", timeoutMs: VERIFY_TIMEOUT_MS, retries: 0 },
    );

    const parsed = extractJsonResponse(await getResponseText(response));
    const verdicts = Array.isArray(parsed?.verdicts) ? parsed.verdicts : [];

    const byOffer = new Map();
    for (const verdict of verdicts) {
      const n = Number(verdict?.n);
      const target = loaded[n - 1]?.offer;
      if (!target) continue;
      byOffer.set(target, {
        same:
          verdict.same === true ? true : verdict.same === false ? false : null,
        note:
          typeof verdict.note === "string" ? verdict.note.slice(0, 60) : null,
      });
    }

    return [
      ...settled,
      ...batch.map((offer) =>
        byOffer.has(offer)
          ? { ...offer, visionVerdict: byOffer.get(offer) }
          : offer,
      ),
      ...unverified,
    ];
  } catch (error) {
    // Rule 2: an offer keeps whatever its identifiers earned.
    console.error("Offer verification skipped:", error.message);
    return offers;
  }
};

/**
 * Candidate images come from provider payloads (server-sourced), not from
 * client input, so they don't go through the client-image host allowlist. They
 * are still only ever passed to the model as bytes — never stored, never
 * re-served — which keeps us inside Shopify's and Amazon's caching terms.
 */
const loadImagePart = async (offer) => {
  try {
    const res = await fetch(offer.imageUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      offer,
      part: {
        inlineData: {
          mimeType: res.headers.get("content-type") || "image/jpeg",
          data: buffer.toString("base64"),
        },
      },
    };
  } catch {
    return null;
  }
};
