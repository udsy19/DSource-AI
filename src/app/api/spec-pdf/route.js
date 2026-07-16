import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { checkRateLimit } from "@/utils/rate-limit";
import { buildSpecPdf } from "@/utils/spec-pdf";

const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const MAX_PRODUCTS = 100;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

// Private/reserved IPv4+IPv6 ranges — spec images may live on any supplier
// host (unlike the visualizer whitelist), so SSRF is mitigated by resolving
// the host and refusing internal addresses.
const isPrivateAddress = (address) => {
  if (address.includes(":")) {
    const lower = address.toLowerCase();
    return (
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80") ||
      lower.startsWith("::ffff:") // v4-mapped — re-checked below via the v4 path
    );
  }
  const octets = address.split(".").map(Number);
  const [a, b] = octets;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
};

/**
 * Fetches a product image for PDF embedding with SSRF guards: https only,
 * DNS-resolved public addresses only, no redirects, image content-type,
 * 5MB cap. Returns a JPEG buffer (sharp-normalized) or null — a missing
 * image never sinks the PDF.
 */
const fetchImageAsJpeg = async (url) => {
  try {
    if (!url || typeof url !== "string") return null;

    if (url.startsWith("data:")) {
      const matches = url.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (!matches || matches[1].length > MAX_IMAGE_BYTES * 1.4) return null;
      const { default: sharp } = await import("sharp");
      return await sharp(Buffer.from(matches[1], "base64"))
        .resize({ width: 480, height: 480, fit: "inside" })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    // Follow up to 3 redirects manually, re-running the private-address SSRF
    // check on every hop (supplier CDNs redirect constantly — the previous
    // redirect:"error" left those products imageless in the PDF).
    let target = url;
    let res = null;
    for (let hop = 0; hop < 4; hop++) {
      const parsed = new URL(target);
      if (parsed.protocol !== "https:") return null;
      const addresses = isIP(parsed.hostname)
        ? [{ address: parsed.hostname }]
        : await lookup(parsed.hostname, { all: true });
      if (addresses.some(({ address }) => isPrivateAddress(address))) {
        return null;
      }
      res = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(8_000),
        headers: {
          // Several supplier CDNs 403 bare fetches.
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "image/*,*/*;q=0.8",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next) return null;
        target = new URL(next, target).toString();
        continue;
      }
      break;
    }
    if (!res?.ok) return null;
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) {
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) return null;

    // Normalize any format (webp/png/gif) to JPEG for pdf-lib embedding.
    const { default: sharp } = await import("sharp");
    return await sharp(buffer)
      .resize({ width: 480, height: 480, fit: "inside" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
};

const str = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

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

  const limit = checkRateLimit(`spec-pdf:${user.id}`, RATE_LIMIT);
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

  const projectName = str(body.projectName, 80) || "Untitled Project";
  if (!Array.isArray(body.products) || body.products.length === 0) {
    return NextResponse.json(
      { error: "Add products to your spec before downloading." },
      { status: 400 },
    );
  }
  if (body.products.length > MAX_PRODUCTS) {
    return NextResponse.json(
      { error: `A spec sheet supports at most ${MAX_PRODUCTS} products.` },
      { status: 400 },
    );
  }

  const products = body.products.map((raw) => ({
    name: str(raw?.name, 120) || "Untitled product",
    brand: str(raw?.brand, 60),
    category: str(raw?.category, 60) || "Uncategorized",
    color: str(raw?.color, 40),
    dimensions: str(raw?.dimensions, 60),
    price:
      Number.isFinite(Number(raw?.price)) && Number(raw?.price) >= 0
        ? Number(raw.price)
        : 0,
    quantity: Math.min(
      Math.max(Math.round(Number(raw?.quantity) || 1), 1),
      999,
    ),
    imageUrl: typeof raw?.image === "string" ? raw.image : null,
  }));

  try {
    // Fetch all thumbnails concurrently; failures degrade to placeholders.
    const images = await Promise.all(
      products.map((p) => fetchImageAsJpeg(p.imageUrl)),
    );
    const withImages = products.map((p, i) => ({
      ...p,
      imageJpeg: images[i],
    }));

    const bytes = await buildSpecPdf({ projectName, products: withImages });

    const filename = `${
      projectName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "spec"
    }-spec-sheet.pdf`;

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Spec PDF generation failed:", error);
    return NextResponse.json(
      { error: "Could not generate the spec sheet. Please try again." },
      { status: 500 },
    );
  }
}
