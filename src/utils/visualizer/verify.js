import {
  callWithRetry,
  extractJsonResponse,
  getResponseText,
} from "@/utils/gemini";

/**
 * Post-generation adherence verification.
 *
 * Sends the generated image to Gemini vision with the list of requested
 * parameters and asks it to judge each one. Failures feed the single
 * automatic retry with strengthened directives.
 *
 * Fail-open by design: if the verification call itself errors (missing key,
 * quota, timeout), the render is still delivered — we report the check as
 * skipped rather than blocking the user's result.
 */

const VERIFIABLE_PARAMS = ["roomType", "style", "lighting", "colorPalette"];

const PARAM_QUESTIONS = {
  roomType: (v) => `Does the space clearly read as a ${v}?`,
  style: (v) => `Does the design style clearly match "${v}"?`,
  lighting: (v) => `Does the scene's lighting clearly match "${v}" lighting?`,
  colorPalette: (v) => `Does the color palette clearly match "${v}"?`,
};

/**
 * @param {object} ai        GoogleGenAI client
 * @param {object} image     { data: base64 string, mimeType: string }
 * @param {object} params    validated render params
 * @returns {Promise<{ checked: string[], failures: Array<{param: string, expected: string, observed: string}>, skipped: boolean }>}
 */
export const verifyAdherence = async (ai, image, params) => {
  const requested = VERIFIABLE_PARAMS.filter((p) => params[p]);
  if (requested.length === 0) {
    return { checked: [], failures: [], skipped: false };
  }

  const questions = requested
    .map(
      (p) =>
        `- "${p}" (expected: ${params[p]}): ${PARAM_QUESTIONS[p](params[p])}`,
    )
    .join("\n");

  const prompt = `
You are auditing an AI-generated interior/architecture image against the parameters the user requested.

For each requested parameter below, judge whether the image clearly satisfies it:
${questions}

Respond with pure JSON (no markdown fencing):
{
  "results": [
    { "param": string, "matches": boolean, "observed": string }
  ]
}
"observed" is a short description of what the image actually shows for that attribute.
Be lenient on subjective calls — only mark "matches": false when the attribute is clearly wrong or absent.
`;

  try {
    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            { inlineData: { mimeType: image.mimeType, data: image.data } },
            { text: prompt },
          ],
        }),
      { label: "Adherence verification", timeoutMs: 20_000, retries: 0 },
    );

    const parsed = extractJsonResponse(await getResponseText(response));
    const results = Array.isArray(parsed?.results) ? parsed.results : [];

    const failures = results
      .filter((r) => r?.matches === false && requested.includes(r?.param))
      .map((r) => ({
        param: r.param,
        expected: params[r.param],
        observed: typeof r.observed === "string" ? r.observed : "",
      }));

    return { checked: requested, failures, skipped: false };
  } catch (error) {
    console.error("Adherence verification skipped:", error.message);
    return { checked: requested, failures: [], skipped: true };
  }
};

const CAD_VIEW_QUESTIONS = {
  "floor-plan": "Is it a top-down floor plan view (not a perspective photo)?",
  "2d-view":
    "Is it a front-facing 2D elevation view (not a perspective photo)?",
};

/**
 * CAD-specific verification: the output must be a technical line drawing in
 * the requested view. Same fail-open contract as verifyAdherence.
 */
export const verifyCad = async (ai, image, view) => {
  const prompt = `
You are auditing an image that is supposed to be a technical architectural CAD drawing.

Judge these two attributes:
- "drawingStyle": Is the image a clean black-and-white technical line drawing with no photographic textures or colors?
- "view" (expected: ${view}): ${CAD_VIEW_QUESTIONS[view] ?? CAD_VIEW_QUESTIONS["floor-plan"]}

Respond with pure JSON (no markdown fencing):
{
  "results": [
    { "param": string, "matches": boolean, "observed": string }
  ]
}
Be lenient on subjective calls — only mark "matches": false when clearly wrong.
`;

  try {
    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            { inlineData: { mimeType: image.mimeType, data: image.data } },
            { text: prompt },
          ],
        }),
      { label: "CAD verification", timeoutMs: 20_000, retries: 0 },
    );

    const parsed = extractJsonResponse(await getResponseText(response));
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    const failures = results
      .filter((r) => r?.matches === false)
      .map((r) => ({
        param: r.param,
        expected: r.param === "view" ? view : "technical line drawing",
        observed: typeof r.observed === "string" ? r.observed : "",
      }));

    return { checked: ["drawingStyle", "view"], failures, skipped: false };
  } catch (error) {
    console.error("CAD verification skipped:", error.message);
    return { checked: ["drawingStyle", "view"], failures: [], skipped: true };
  }
};
