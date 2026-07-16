import { NextResponse } from "next/server";
import { startAiLog } from "@/utils/ai-log";
import { requireAuth } from "@/utils/api-auth";
import { checkRateLimit } from "@/utils/rate-limit";
import { MAX_IMAGE_CHARS, normalizeBaseImage } from "@/utils/visualizer/images";
import { generatePanorama } from "@/utils/visualizer/pano";

const RATE_LIMIT = { windowMs: 60_000, max: 4 };

const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

export async function POST(request) {
  const aiLog = startAiLog("pano");
  let user;
  if (DEV_BYPASS) {
    user = { id: "dev-bypass" };
  } else {
    try {
      user = await requireAuth();
      aiLog.userId = user.id;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const limit = checkRateLimit(`pano:${user.id}`, RATE_LIMIT);
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

  const normalized = await normalizeBaseImage(body.image);
  if (!normalized.image) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  try {
    const { pano, mimeType } = await generatePanorama(normalized.image);
    return NextResponse.json({ success: true, pano, mimeType });
  } catch (error) {
    console.error("Panorama generation failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not build a panorama for this image." },
      { status: 502 },
    );
  }
}
