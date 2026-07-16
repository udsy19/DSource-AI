import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { searchCatalog } from "@/utils/catalog";
import { checkRateLimit } from "@/utils/rate-limit";

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

/**
 * Client-callable text search over the material-bank catalog — the thin
 * bridge the mood-board product picker needs (marketplace pages call
 * searchCatalog server-side; client components cannot).
 */
export async function GET(request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(`catalog-search:${user.id}`, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many searches. Please wait a moment." },
      { status: 429 },
    );
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  try {
    const results = await searchCatalog(q, 24);
    if (!results) {
      return NextResponse.json({
        products: [],
        notice: "The catalog is not reachable right now.",
      });
    }
    return NextResponse.json({
      products: results
        .filter((r) => r.image_url)
        .map((r) => ({
          id: r.id,
          name: r.title ?? "Untitled product",
          brand: r.brand ?? null,
          price: r.price_inr ?? null,
          priceUnit: r.price_unit ?? null,
          imageUrl: r.image_url,
        })),
    });
  } catch (error) {
    console.error("Catalog search failed:", error.message);
    return NextResponse.json({
      products: [],
      notice: "The catalog is not reachable right now.",
    });
  }
}
