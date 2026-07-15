import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import {
  callWithRetry,
  extractJsonResponse,
  getResponseText,
} from "@/utils/gemini";
import { isAllowedImageHost } from "@/utils/image-hosts.mjs";
import { checkRateLimit } from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import { embedImage } from "@/utils/visualizer/embeddings";
import {
  cropBoxToDataUri,
  isValidBox,
  MAX_IMAGE_CHARS,
  normalizeBaseImage,
} from "@/utils/visualizer/images";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const CANDIDATE_COUNT = 8;
const RESULT_COUNT = 5;

const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

const parseImageData = (imageData) => {
  const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    return { data: matches[2], mimeType: matches[1] || "image/png" };
  }
  return { data: imageData, mimeType: "image/png" };
};

/**
 * Gemini re-rank of the embedding candidates: sees the query crop plus each
 * candidate's catalog photo and orders/vetoes them. Fail-open — on any
 * failure the embedding order stands.
 */
const rerankCandidates = async (cropDataUri, label, candidates) => {
  try {
    const candidateParts = [];
    const usable = [];
    for (const candidate of candidates) {
      if (!candidate.image_url || !isAllowedImageHost(candidate.image_url)) {
        continue;
      }
      try {
        const res = await fetch(candidate.image_url);
        if (!res.ok) continue;
        const buffer = Buffer.from(await res.arrayBuffer());
        candidateParts.push({
          inlineData: {
            mimeType: res.headers.get("content-type") || "image/jpeg",
            data: buffer.toString("base64"),
          },
        });
        usable.push(candidate);
      } catch {
        // Skip candidates whose image can't be fetched.
      }
    }
    if (usable.length === 0) {
      return { candidates, reranked: false };
    }

    const crop = parseImageData(cropDataUri);
    const prompt = `
The FIRST image is a ${label || "component"} cropped from a room photo.
The following ${usable.length} images are numbered product candidates (1..${usable.length}) from a materials catalog, in that order.

Rank the candidates by how visually and functionally similar each product is to the item in the first image (shape, material, color, type). Exclude candidates that are clearly a different kind of item.

Respond with pure JSON (no markdown fencing):
{ "ranking": [candidate numbers, best first, excluding vetoed], "reason": string }
`;

    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            { inlineData: { mimeType: crop.mimeType, data: crop.data } },
            ...candidateParts,
            { text: prompt },
          ],
        }),
      { label: "Match re-ranking", timeoutMs: 30_000, retries: 0 },
    );

    const parsed = extractJsonResponse(await getResponseText(response));
    const ranking = Array.isArray(parsed?.ranking) ? parsed.ranking : [];
    const ordered = ranking
      .map((n) => usable[Number(n) - 1])
      .filter(Boolean);

    if (ordered.length === 0) {
      return { candidates, reranked: false };
    }
    return {
      candidates: ordered,
      reranked: true,
      reason: typeof parsed?.reason === "string" ? parsed.reason : null,
    };
  } catch (error) {
    console.error("Re-ranking skipped:", error.message);
    return { candidates, reranked: false };
  }
};

export async function POST(request) {
  let user;
  if (DEV_BYPASS) {
    user = { id: "dev-bypass" };
  } else {
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const limit = checkRateLimit(`reverse-search:${user.id}`, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.image || typeof body.image !== "string") {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }
  if (body.image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "Image is too large." }, { status: 413 });
  }
  if (!isValidBox(body.box)) {
    return NextResponse.json(
      { error: "Invalid region — box must be [ymin, xmin, ymax, xmax] in 0-1000." },
      { status: 400 },
    );
  }
  const label = typeof body.label === "string" ? body.label.slice(0, 60) : null;
  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim().slice(0, 60)
      : null;

  const normalized = await normalizeBaseImage(body.image);
  if (!normalized.image) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  try {
    // 1. Crop the selected component out of the render.
    const crop = await cropBoxToDataUri(normalized.image, body.box);

    // 2. Embed the crop (same CLIP space as the catalog backfill).
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Reverse search is not configured. Please contact support." },
        { status: 500 },
      );
    }
    const embedding = await embedImage(crop);

    // 3. Nearest neighbors from the user's own catalog (pgvector RPC).
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { data: rows, error: rpcError } = await supabase.rpc(
      "match_products",
      {
        query_embedding: embedding,
        match_count: CANDIDATE_COUNT,
        filter_category: category,
      },
    );

    if (rpcError) {
      console.error("match_products RPC failed:", rpcError.message);
      return NextResponse.json(
        {
          success: false,
          error:
            "The search index isn't ready yet — apply the embeddings migration and run the backfill script.",
        },
        { status: 503 },
      );
    }

    let candidates = rows ?? [];
    // If a category filter produced nothing, retry unfiltered rather than
    // showing an empty result for a mislabeled catalog.
    if (candidates.length === 0 && category) {
      const { data: fallbackRows } = await supabase.rpc("match_products", {
        query_embedding: embedding,
        match_count: CANDIDATE_COUNT,
        filter_category: null,
      });
      candidates = fallbackRows ?? [];
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        croppedImage: crop,
        notice:
          "No indexed products yet — run the embeddings backfill on your catalog.",
      });
    }

    // 4. Re-rank with Gemini vision (fail-open to embedding order).
    let rerank = { candidates, reranked: false };
    if (!DEV_BYPASS) {
      rerank = await rerankCandidates(crop, label, candidates);
    }

    const matches = rerank.candidates.slice(0, RESULT_COUNT).map((row) => ({
      id: row.id,
      productId: row.product_id,
      name: row.product_name,
      brand: row.brand_name,
      category: row.category_name,
      color: row.color,
      colorFamily: row.color_family,
      series: row.series_name,
      imageUrl: row.image_url,
      similarity: typeof row.similarity === "number" ? row.similarity : null,
      link: `/marketplace/products/${row.product_id ?? row.id}`,
    }));

    return NextResponse.json({
      success: true,
      matches,
      croppedImage: crop,
      reranked: rerank.reranked,
      rerankReason: rerank.reason ?? null,
    });
  } catch (error) {
    console.error("Reverse search failed:", error);
    const message = String(error?.message ?? "");
    if (message.includes("too small")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "Reverse search failed. Please try again." },
      { status: 500 },
    );
  }
}
