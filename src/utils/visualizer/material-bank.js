import {
  callWithRetry,
  extractJsonResponse,
  getResponseText,
} from "@/utils/gemini";

/**
 * Client for the live material-bank catalog API (Option A integration:
 * HTTP, publish-gated, zero DB coupling). When MATERIAL_BANK_API_URL is set,
 * reverse search matches against this catalog instead of the per-user
 * Supabase one.
 *
 * /api/match response shape (verified live):
 * { query, count, results: [{ id, brand, title, category, size_mm, finish,
 *   price_unit, image_url, supplier_domain, score,
 *   price: { price_inr, price_unit, basis, observed_at, source_url, stale } | null }] }
 */

export const isMaterialBankConfigured = () =>
  Boolean(process.env.MATERIAL_BANK_API_URL);

/**
 * Turns the cropped component into a concise catalog search query via Gemini
 * vision. Fail-open: falls back to the detected label.
 */
export const describeCropForSearch = async (ai, cropDataUri, label) => {
  const fallback = { query: label || "interior material" };
  try {
    const matches = cropDataUri.match(/^data:([^;]+);base64,(.+)$/);
    const prompt = `
This image is a cropped "${label || "component"}" from an interior photo.
Write a concise product search query (max 8 words) for finding this item in a
building-materials/furniture catalog. Describe: item type, material, color,
finish/pattern. No brand guesses.

Respond with pure JSON: { "query": string }
`;
    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              inlineData: {
                mimeType: matches ? matches[1] : "image/png",
                data: matches ? matches[2] : cropDataUri,
              },
            },
            { text: prompt },
          ],
        }),
      { label: "Crop description", timeoutMs: 15_000, retries: 0 },
    );
    const parsed = extractJsonResponse(await getResponseText(response));
    if (typeof parsed?.query === "string" && parsed.query.trim()) {
      return { query: parsed.query.trim().slice(0, 120) };
    }
    return fallback;
  } catch (error) {
    console.error("Crop description skipped:", error.message);
    return fallback;
  }
};

const PRICE_UNIT_LABELS = {
  per_sqft: "/sq.ft",
  per_box: "/box",
  per_piece: "/piece",
  per_sqm: "/sq.m",
  per_roll: "/roll",
};

/**
 * Hybrid FTS+vector search against the material bank. Returns candidates in
 * the shape the reverse-search route and match modal consume.
 */
export const searchMaterialBank = async (query, k = 8) => {
  const base = process.env.MATERIAL_BANK_API_URL.replace(/\/$/, "");
  const url = `${base}/api/match?q=${encodeURIComponent(query)}&k=${k}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`material bank /api/match returned ${res.status}`);
    }
    const data = await res.json();
    return (Array.isArray(data?.results) ? data.results : []).map((r) => ({
      id: `mb-${r.id}`,
      name: r.title,
      brand: r.brand,
      category: r.category,
      finish: r.finish,
      size: r.size_mm,
      imageUrl: r.image_url,
      supplier: r.supplier_domain,
      price: r.price?.price_inr ?? null,
      priceUnit: PRICE_UNIT_LABELS[r.price?.price_unit ?? r.price_unit] ?? "",
      priceStale: Boolean(r.price?.stale),
      sourceUrl: r.price?.source_url ?? null,
      score: typeof r.score === "number" ? r.score : null,
      // External catalog item — the modal opens sourceUrl instead of an
      // internal marketplace route.
      link: r.price?.source_url ?? null,
      image_url: r.image_url, // rerank helper reads snake_case field
    }));
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Fetches one product record by id from the material bank. Used by
 * swap-into-render: the client sends only the product id and the server
 * resolves the canonical image URL itself (no client-supplied URLs).
 */
export const getBankProduct = async (productId) => {
  const base = process.env.MATERIAL_BANK_API_URL.replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(
      `${base}/api/product/${encodeURIComponent(productId)}`,
      {
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const product = data?.product;
    if (!product?.image_url) return null;
    return {
      id: product.id,
      title: product.title ?? "product",
      imageUrl: product.image_url,
    };
  } finally {
    clearTimeout(timer);
  }
};
