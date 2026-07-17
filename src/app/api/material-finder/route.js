import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { hostQueryImage, unhostQueryImage } from "@/utils/finder/host-image";
import { identifyFromImage, identifyFromUrl } from "@/utils/finder/identity";
import {
  providersFor,
  unconfiguredProviders,
} from "@/utils/finder/provider-registry";
import { identityFromCatalog } from "@/utils/finder/providers/catalog";
import {
  enrichIdentity,
  offerFromSource,
  scoreAndRank,
  searchKeyFor,
  summarizeEvidence,
} from "@/utils/finder/score";
import { verifyOffers } from "@/utils/finder/verify";
import { checkRateLimit } from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import { MAX_IMAGE_CHARS, normalizeBaseImage } from "@/utils/visualizer/images";

/**
 * The Material Finder pipeline: a product URL or photo in, every seller we can
 * verify out, each labeled with the evidence behind it.
 *
 * Shape mirrors /api/reverse-search deliberately — validation errors return
 * plain JSON with real status codes, then the long part streams as NDJSON
 * stage events so the client can narrate a 30-60s search instead of spinning.
 *
 * Auth-gated and rate-limited because every search spends real money across
 * several vendors.
 */

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

// Lower than reverse-search's 10/min: this fans out to paid third parties,
// where reverse-search only hits our own catalog.
const RATE_LIMIT = { windowMs: 60_000, max: 5 };

const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

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

  const limit = checkRateLimit(`material-finder:${user.id}`, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many searches. Please wait a moment and try again." },
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

  const url = typeof body.url === "string" ? body.url.trim() : null;
  const image = typeof body.image === "string" ? body.image : null;

  if (!url && !image) {
    return NextResponse.json(
      { error: "Paste a product link or add a photo to search." },
      { status: 400 },
    );
  }
  if (image && image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json(
      { error: "That image is too large." },
      { status: 413 },
    );
  }

  let queryImage = null;
  if (image) {
    const normalized = await normalizeBaseImage(image);
    if (!normalized.image) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }
    queryImage = normalized.image;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));

      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      let hostedPath = null;

      try {
        // 1. Resolve what the thing IS. -------------------------------------
        emit({ stage: "identify", via: url ? "url" : "image" });

        let identity;
        if (url) {
          const result = await identifyFromUrl(url);
          if (!result.ok) {
            emit({ done: true, success: false, error: result.error });
            controller.close();
            return;
          }
          identity = result.identity;
        } else {
          identity = await identifyFromImage(ai, queryImage);
        }

        emit({
          stage: "identified",
          identity: publicIdentity(identity),
          findability: identity.findability,
        });

        // 2. Host the query image if any provider needs a fetchable URL.
        //    Lens and Shopify both take a URL, not an upload.
        let hostedUrl = null;
        if (queryImage && !DEV_BYPASS) {
          const hosted = await hostQueryImage(supabase, user.id, queryImage);
          hostedUrl = hosted?.url ?? null;
          hostedPath = hosted?.path ?? null;
        }

        // 3. Catalog first — for furniture it's the only source with a real
        //    identity to join on, and a hit seeds every other provider.
        let key = searchKeyFor(identity);
        const chosen = providersFor({ hasImage: Boolean(queryImage), key });

        // The pasted page is a seller in its own right, and the one whose
        // identifiers we read first-hand rather than inferred.
        const sourceOffer = offerFromSource(identity);

        const catalogProvider = chosen.find((p) => p.id === "catalog");
        let catalogOffers = [];
        if (catalogProvider) {
          emit({ stage: "search", provider: catalogProvider.label });
          catalogOffers = await runProvider(catalogProvider, {
            imageDataUri: queryImage,
            query: identity.query ?? identity.title,
            supabase,
            category: identity.category,
            key,
            imageUrl: hostedUrl,
          });

          // A confident catalog hit upgrades the identity, which is the point
          // of running it first — the open web gets searched for a named
          // product rather than a vague description.
          const seed = identityFromCatalog(catalogOffers);
          if (seed && !identity.brand) {
            identity = { ...identity, ...seed, source: "catalog" };
            key = searchKeyFor(identity);
            emit({
              stage: "identified",
              identity: publicIdentity(identity),
              seeded: true,
            });
          }
        }

        // 4. Fan out to everyone else, in parallel.
        const rest = chosen.filter((p) => p.id !== "catalog");
        for (const provider of rest) {
          emit({ stage: "search", provider: provider.label });
        }

        const settled = await Promise.all(
          rest.map((provider) =>
            runProvider(provider, {
              imageDataUri: queryImage,
              query: identity.query ?? identity.title,
              supabase,
              category: identity.category,
              key,
              imageUrl: hostedUrl,
            }),
          ),
        );

        const offers = [
          ...(sourceOffer ? [sourceOffer] : []),
          ...catalogOffers,
          ...settled.flat(),
        ];

        if (offers.length === 0) {
          emit({
            done: true,
            success: true,
            identity: publicIdentity(identity),
            offers: [],
            summary: null,
            notice: noticeForEmpty(identity, chosen.length),
            unconfigured: unconfiguredProviders(),
          });
          controller.close();
          return;
        }

        // 5. Fill identity gaps from what the providers know. An Amazon URL
        //    yields only an ASIN, but the aggregators know the product's name
        //    and model — rendering "Unidentified product" while holding that
        //    would just be discarding the answer.
        identity = enrichIdentity(identity, offers);
        emit({ stage: "identified", identity: publicIdentity(identity) });

        // 6. Verify visually — skipped wherever a GTIN already agrees.
        emit({ stage: "verify", count: offers.length });
        const verified = queryImage
          ? await verifyOffers(ai, queryImage, offers, identity)
          : offers;

        // 7. Score, flag and rank. Nothing is dropped — low confidence is
        //    labeled, not hidden.
        const ranked = scoreAndRank(verified, identity);

        emit({
          done: true,
          success: true,
          identity: publicIdentity(identity),
          offers: ranked,
          summary: summarizeEvidence(ranked),
          unconfigured: unconfiguredProviders(),
        });
      } catch (error) {
        console.error("Material finder failed:", error);
        emit({
          done: true,
          success: false,
          error: "The search failed. Please try again.",
        });
      } finally {
        // The user's photo is not ours to keep.
        if (hostedPath) await unhostQueryImage(supabase, hostedPath);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

/**
 * One provider failing must never sink the search — the whole point of a
 * fan-out is that the others still answer. Errors are logged and swallowed,
 * matching the house fail-open convention.
 */
const runProvider = async (provider, params) => {
  try {
    const offers = await provider.search(params);
    return Array.isArray(offers) ? offers : [];
  } catch (error) {
    console.error(`Provider ${provider.id} failed:`, error.message);
    return [];
  }
};

/**
 * Identity as the client sees it. Drops the internal `identifiers` duplicate
 * and anything the UI has no business rendering.
 */
const publicIdentity = (identity) => ({
  title: identity.title ?? null,
  brand: identity.brand ?? null,
  gtin: identity.gtin ?? null,
  mpn: identity.mpn ?? null,
  asin: identity.asin ?? null,
  imageUrl: identity.imageUrl ?? null,
  category: identity.category ?? null,
  findability: identity.findability ?? null,
  note: identity.note ?? null,
  source: identity.source ?? null,
  sourceUrl: identity.sourceUrl ?? null,
});

/**
 * Empty states are directions, not moods — say what happened and what to do
 * next, and never blame the user for a gap that is ours.
 */
const noticeForEmpty = (identity, providerCount) => {
  // Distinguish "nothing was searched" from "we searched and found nothing".
  // Reporting the second when the first is true is a lie the user can't see
  // through, and it sends them looking for a product that may be easy to find.
  if (providerCount === 0) {
    return "No seller sources are switched on yet, so we couldn't look. This is a setup gap on our side, not a dead end.";
  }
  return identity.findability === "generic"
    ? "We couldn't read a brand or model on this, so there was nothing to match exactly. A photo of the label, or a link to the product, would find it."
    : "We identified the product but found no one selling it right now.";
};
