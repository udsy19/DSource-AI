import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { startAiLog } from "@/utils/ai-log";
import { requireAuth } from "@/utils/api-auth";
import {
  callWithRetry,
  extractJsonResponse,
  getResponseText,
  parseImageData,
} from "@/utils/gemini";
import { checkRateLimit } from "@/utils/rate-limit";
import {
  isValidBox,
  MAX_IMAGE_CHARS,
  normalizeBaseImage,
} from "@/utils/visualizer/images";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const MAX_COMPONENTS = 10;

const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

const DETECTION_PROMPT = `
Detect the distinct interior components in this image that a user could shop
for: furniture (sofa, chairs, tables, beds), lighting (lamps, pendants),
soft furnishings (rugs, carpets, curtains, cushions), surface finishes
(flooring, wall paint/covering, tiles), and decor (artwork, plants, mirrors).

Respond with pure JSON (no markdown fencing):
{
  "components": [
    {
      "label": string,            // short shoppable name, e.g. "Sofa", "Pendant Light"
      "category": string,         // broad category, e.g. "Sofa", "Lighting", "Flooring", "Rug", "Wall Finish"
      "box_2d": [ymin, xmin, ymax, xmax],  // integers 0-1000, normalized to the image
      "confidence": number        // 0-1
    }
  ]
}

Rules:
- At most ${MAX_COMPONENTS} components; only include confidence >= 0.4.
- One entry per distinct physical item (do not repeat the same sofa twice).
- box_2d must tightly bound the item.
`;

export async function POST(request) {
  const aiLog = startAiLog("detect-components");
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

  const limit = checkRateLimit(`detect-components:${user.id}`, RATE_LIMIT);
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
    const imageData = parseImageData(normalized.image);
    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              inlineData: {
                mimeType: imageData.mimeType,
                data: imageData.data,
              },
            },
            { text: DETECTION_PROMPT },
          ],
        }),
      { label: "Component detection", timeoutMs: 30_000 },
    );

    const parsed = extractJsonResponse(await getResponseText(response));
    const components = (
      Array.isArray(parsed?.components) ? parsed.components : []
    )
      .filter(
        (c) =>
          typeof c?.label === "string" &&
          isValidBox(c?.box_2d) &&
          (typeof c?.confidence !== "number" || c.confidence >= 0.4),
      )
      .slice(0, MAX_COMPONENTS)
      .map((c) => ({
        label: c.label,
        category: typeof c.category === "string" ? c.category : c.label,
        box_2d: c.box_2d.map((v) => Math.round(v)),
        confidence:
          typeof c.confidence === "number"
            ? Math.min(Math.max(c.confidence, 0), 1)
            : null,
      }));

    return NextResponse.json({ success: true, components });
  } catch (error) {
    console.error("Component detection failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Could not detect components in this image. Please try again.",
      },
      { status: 502 },
    );
  }
}
