import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import {
  callWithRetry,
  extractJsonResponse,
  getResponseText,
  parseImageData,
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
import {
  describeCropForSearch,
  isMaterialBankConfigured,
  searchMaterialBank,
} from "@/utils/visualizer/material-bank";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const CANDIDATE_COUNT = 8;
const RESULT_COUNT = 5;

const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

/**
 * Gemini re-rank of the candidates: sees the query crop plus each candidate's
 * catalog photo and orders/vetoes them. Fail-open — on any failure the
 * original order stands.
 *
 * `trustHosts`: candidate URLs from the material-bank API are server-sourced
 * (not client input), so they may be fetched without the client-image host
 * whitelist. Supabase-catalog candidates keep the whitelist.
 */
const rerankCandidates = async (
  cropDataUri,
  label,
  candidates,
  { trustHosts = false } = {},
) => {
  try {
    // Fetch all candidate images in parallel — sequential fetches were a
    // large share of the pipeline's wall-clock time.
    const fetched = await Promise.all(
      candidates.map(async (candidate) => {
        const imageUrl = candidate.image_url ?? candidate.imageUrl;
        if (!imageUrl) return null;
        if (!trustHosts && !isAllowedImageHost(imageUrl)) return null;
        try {
          const res = await fetch(imageUrl, {
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) return null;
          const buffer = Buffer.from(await res.arrayBuffer());
          return {
            candidate,
            part: {
              inlineData: {
                mimeType: res.headers.get("content-type") || "image/jpeg",
                data: buffer.toString("base64"),
              },
            },
          };
        } catch {
          // Skip candidates whose image can't be fetched.
          return null;
        }
      }),
    );
    const loaded = fetched.filter(Boolean);
    const candidateParts = loaded.map((f) => f.part);
    const usable = loaded.map((f) => f.candidate);
    if (usable.length === 0) {
      return { candidates, reranked: false };
    }

    const crop = parseImageData(cropDataUri);
    const prompt = `
The FIRST image is a ${label || "component"} cropped from a room photo.
The following ${usable.length} images are numbered product candidates (1..${usable.length}) from a materials catalog, in that order.

Rank the candidates by how visually and functionally similar each product is to the item in the first image (shape, material, color, type). Exclude candidates that are clearly a different kind of item.

Respond with pure JSON (no markdown fencing):
{ "ranking": [ { "n": candidate number, "note": string } ] }
Order "ranking" best-first, excluding vetoed candidates. "note" is a scannable
reason of AT MOST 6 words, e.g. "same conical shade, slender base" or
"right shape, darker color".
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
    // Accept both {n, note} objects and bare numbers (model drift tolerance).
    const ordered = ranking
      .map((entry) => {
        const n = typeof entry === "number" ? entry : Number(entry?.n);
        const candidate = usable[n - 1];
        if (!candidate) return null;
        const note =
          typeof entry?.note === "string" ? entry.note.slice(0, 60) : null;
        return { ...candidate, matchNote: note };
      })
      .filter(Boolean);

    if (ordered.length === 0) {
      return { candidates, reranked: false };
    }
    return { candidates: ordered, reranked: true };
  } catch (error) {
    console.error("Re-ranking skipped:", error.message);
    return { candidates, reranked: false };
  }
};

/**
 * Fallback matcher: the user's own Supabase catalog via CLIP + pgvector.
 * Used when MATERIAL_BANK_API_URL is not configured.
 */
const matchViaSupabase = async (crop, category) => {
  if (!process.env.REPLICATE_API_TOKEN) {
    return {
      error: "Reverse search is not configured. Please contact support.",
      status: 500,
    };
  }
  const embedding = await embedImage(crop);

  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const { data: rows, error: rpcError } = await supabase.rpc("match_products", {
    query_embedding: embedding,
    match_count: CANDIDATE_COUNT,
    filter_category: category,
  });

  if (rpcError) {
    console.error("match_products RPC failed:", rpcError.message);
    return {
      error:
        "The search index isn't ready yet — apply the embeddings migration and run the backfill script.",
      status: 503,
    };
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

  return {
    candidates: candidates.map((row) => ({
      id: row.id,
      name: row.product_name,
      brand: row.brand_name,
      category: row.category_name,
      color: row.color,
      colorFamily: row.color_family,
      series: row.series_name,
      imageUrl: row.image_url,
      image_url: row.image_url,
      similarity: typeof row.similarity === "number" ? row.similarity : null,
      link: `/marketplace/products/${row.product_id ?? row.id}`,
    })),
  };
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
      {
        error:
          "Invalid region — box must be [ymin, xmin, ymax, xmax] in 0-1000.",
      },
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

  // The pipeline takes 10-20s (describe + hybrid search + vision rerank), so
  // the response is an NDJSON stream: stage events first, final payload last.
  // Validation errors above still return plain JSON with real status codes.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));

      try {
        // 1. Crop the selected component out of the render.
        emit({ stage: "crop" });
        const crop = await cropBoxToDataUri(normalized.image, body.box);

        // 2. Find candidates — material bank API when configured, else the
        //    user's own Supabase catalog (CLIP + pgvector).
        let candidates;
        let searchQuery = null;
        if (isMaterialBankConfigured()) {
          emit({ stage: "describe" });
          const described = await describeCropForSearch(ai, crop, label);
          searchQuery = described.query;
          emit({ stage: "search", query: searchQuery });
          candidates = await searchMaterialBank(searchQuery, CANDIDATE_COUNT);
          if (candidates.length === 0 && label && searchQuery !== label) {
            candidates = await searchMaterialBank(label, CANDIDATE_COUNT);
          }
          if (candidates.length === 0) {
            emit({
              done: true,
              success: true,
              matches: [],
              croppedImage: crop,
              searchQuery,
              notice:
                "No matches found in the material bank for this component.",
            });
            controller.close();
            return;
          }
        } else {
          emit({ stage: "search" });
          const result = await matchViaSupabase(crop, category);
          if (result.error) {
            emit({ done: true, success: false, error: result.error });
            controller.close();
            return;
          }
          candidates = result.candidates;
          if (candidates.length === 0) {
            emit({
              done: true,
              success: true,
              matches: [],
              croppedImage: crop,
              notice:
                "No indexed products yet — run the embeddings backfill on your catalog.",
            });
            controller.close();
            return;
          }
        }

        // 3. Re-rank with Gemini vision (fail-open to original order).
        emit({ stage: "rerank", count: candidates.length });
        const rerank = await rerankCandidates(crop, label, candidates, {
          trustHosts: isMaterialBankConfigured(),
        });

        const matches = rerank.candidates
          .slice(0, RESULT_COUNT)
          // Drop the internal snake_case duplicate before responding.
          .map(({ image_url: _imageUrl, ...match }) => match);

        emit({
          done: true,
          success: true,
          matches,
          croppedImage: crop,
          searchQuery,
          reranked: rerank.reranked,
        });
      } catch (error) {
        console.error("Reverse search failed:", error);
        const message = String(error?.message ?? "");
        emit({
          done: true,
          success: false,
          error: message.includes("too small")
            ? message
            : "Reverse search failed. Please try again.",
        });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
