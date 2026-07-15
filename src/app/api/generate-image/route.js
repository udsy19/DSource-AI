import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import Replicate from "replicate";
import { requireAuth } from "@/utils/api-auth";
import {
  callWithRetry,
  extractJsonResponse,
  getResponseText,
} from "@/utils/gemini";
import { checkRateLimit } from "@/utils/rate-limit";
import { DEFAULT_MODEL, getModel } from "@/utils/replicate-models";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

// useFileOutput: false → run() returns plain URL strings instead of FileOutput
// streams, which we can fetch and re-encode uniformly.
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  useFileOutput: false,
});

const MAX_PROMPT_LENGTH = 2000;
// Frontend caps uploads at 10MB; base64 inflates by ~4/3, so allow headroom.
const MAX_IMAGE_CHARS = 20_000_000;
const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const REPLICATE_TIMEOUT_MS = 120_000;

// Dev-only escape hatch for local testing without a login/Gemini key.
// Hard-disabled in production builds; enabled only via .env.local flag.
const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

// Helper function to convert base64 data URL to base64 string and extract mime type
const parseImageData = (imageData) => {
  if (!imageData) return null;

  // If it's already a base64 string without data URL prefix
  if (!imageData.includes(",")) {
    return { data: imageData, mimeType: "image/png" };
  }

  // Extract mime type and base64 data from data URL
  const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    return {
      data: matches[2],
      mimeType: matches[1] || "image/png",
    };
  }

  // If it's just base64 data
  return { data: imageData, mimeType: "image/png" };
};

// Normalize the many shapes replicate.run() can return into a single URL string.
const toImageUrl = (output) => {
  const first = Array.isArray(output) ? output[0] : output;
  if (!first) return null;
  if (typeof first === "string") return first;
  if (typeof first.url === "string") return first.url;
  if (typeof first.url === "function") return String(first.url());
  return null;
};

// Build the descriptive prompt shared by every model.
const buildEnhancedPrompt = (
  prompt,
  { spaceType, style, lighting, colorPalette },
) => {
  let enhanced = prompt;
  if (spaceType) enhanced = `${spaceType} space: ${enhanced}`;
  if (style) enhanced = `${enhanced}, ${style} style`;
  if (lighting) enhanced = `${enhanced}, with ${lighting} lighting`;
  if (colorPalette) {
    enhanced = `${enhanced}, using ${colorPalette} color palette`;
  }
  return `High-quality architectural visualization: ${enhanced}. Professional interior design rendering, photorealistic, detailed, 4K quality.`;
};

// Translate a generation/runtime failure into a user-safe response.
const mapGenerationError = (error) => {
  const status = error?.status ?? error?.code ?? error?.response?.status;
  const message = String(error?.message ?? "").toLowerCase();

  if (
    message.includes("safety") ||
    message.includes("blocked") ||
    message.includes("prohibited") ||
    message.includes("flagged")
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "This request was blocked by the content safety filter. Try rephrasing your prompt.",
      },
      { status: 400 },
    );
  }

  if (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit")
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "The image service is busy right now. Please try again in a moment.",
      },
      { status: 503 },
    );
  }

  if (message.includes("timed out") || message.includes("timeout")) {
    return NextResponse.json(
      { success: false, error: "The request took too long. Please try again." },
      { status: 504 },
    );
  }

  return NextResponse.json(
    { success: false, error: "Failed to generate image. Please try again." },
    { status: 500 },
  );
};

// --- Generation backends ---------------------------------------------------

const generateWithGemini = async (enhancedPrompt, image) => {
  const contents = [];
  let prompt = enhancedPrompt;

  if (image) {
    const imageData = parseImageData(image);
    if (imageData) {
      contents.push({
        inlineData: { data: imageData.data, mimeType: imageData.mimeType },
      });
      prompt = `Edit this image: ${enhancedPrompt}`;
    }
  }
  contents.push({ text: prompt });

  const imageResponse = await callWithRetry(
    () =>
      ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents,
      }),
    { label: "Image generation", timeoutMs: 60_000 },
  );

  const images = [];
  const candidateParts =
    imageResponse?.candidates?.[0]?.content?.parts ??
    imageResponse?.parts ??
    [];
  for (const part of candidateParts) {
    if (part.inlineData) {
      images.push({
        image: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      });
    }
  }
  return images;
};

const generateWithReplicate = async (modelConfig, enhancedPrompt, image) => {
  const input = modelConfig.buildInput(enhancedPrompt, image);
  const output = await callWithRetry(
    () => replicate.run(modelConfig.slug, { input }),
    {
      label: `${modelConfig.label} generation`,
      timeoutMs: REPLICATE_TIMEOUT_MS,
    },
  );

  const url = toImageUrl(output);
  if (!url) return [];

  const downloaded = await fetch(url);
  if (!downloaded.ok) {
    throw new Error(
      `Failed to download generated image (${downloaded.status})`,
    );
  }
  const arrayBuffer = await downloaded.arrayBuffer();
  return [
    {
      image: Buffer.from(arrayBuffer).toString("base64"),
      mimeType: downloaded.headers.get("content-type") || "image/png",
    },
  ];
};

// --- Route -----------------------------------------------------------------

export async function POST(request) {
  // Step 0: Require an authenticated user (also keys rate limiting).
  let user;
  if (DEV_BYPASS) {
    console.warn(
      "[generate-image] DEV_AUTH_BYPASS active — auth & validation skipped",
    );
    user = { id: "dev-bypass" };
  } else {
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const limit = checkRateLimit(`generate-image:${user.id}`, RATE_LIMIT);
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

  const { prompt, spaceType, style, lighting, colorPalette, image } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt is too long (max ${MAX_PROMPT_LENGTH} characters).` },
      { status: 400 },
    );
  }

  if (image !== undefined && image !== null) {
    if (typeof image !== "string") {
      return NextResponse.json(
        { error: "Invalid image data" },
        { status: 400 },
      );
    }
    if (image.length > MAX_IMAGE_CHARS) {
      return NextResponse.json(
        { error: "Image is too large. Please use an image under 10MB." },
        { status: 413 },
      );
    }
  }

  // Resolve the requested model.
  const modelConfig = getModel(
    typeof body.model === "string" ? body.model : DEFAULT_MODEL,
  );
  if (!modelConfig) {
    return NextResponse.json(
      { error: "Unknown model selected." },
      { status: 400 },
    );
  }

  // Edit-only models need an uploaded image to work from.
  if (modelConfig.mode === "edit" && !image) {
    return NextResponse.json(
      {
        success: false,
        error: `The ${modelConfig.label} model needs an uploaded image to edit. Upload a room photo or pick a different model.`,
      },
      { status: 400 },
    );
  }

  // Configuration guards for Replicate-backed models.
  if (modelConfig.provider === "replicate") {
    if (!modelConfig.slug) {
      return NextResponse.json(
        {
          success: false,
          error: `The ${modelConfig.label} model isn't configured yet.`,
        },
        { status: 503 },
      );
    }
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          error: "Image generation is not configured. Please contact support.",
        },
        { status: 500 },
      );
    }
  }

  try {
    // Step 1: Validate that the prompt is interior/architecture related.
    // Skipped under DEV_BYPASS so the visualizer works without a Gemini key.
    if (!DEV_BYPASS) {
      const validationPrompt = `
    Analyze this text prompt and determine if it is related to interior redesign, architecture, home improvement, construction, floor layouts, room remodeling, furniture arrangement, lighting redesign, or similar architectural contexts.

    Prompt: "${prompt}"

    Respond with a JSON object containing:
    {
      "isValid": boolean,
      "confidence": number (0-1),
      "category": string (if valid, what category it falls into),
      "reasoning": string
    }
    `;

      const validationResponse = await callWithRetry(
        () =>
          ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ text: validationPrompt }],
          }),
        { label: "Prompt validation" },
      );

      const validationResult = extractJsonResponse(
        await getResponseText(validationResponse),
      );

      if (!validationResult.isValid || validationResult.confidence < 0.5) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your request must be about interior redesign, architecture, or home improvement. Please provide a prompt related to these topics.",
          },
          { status: 400 },
        );
      }
    }

    // Step 2: Generate with the selected backend.
    const enhancedPrompt = buildEnhancedPrompt(prompt, {
      spaceType,
      style,
      lighting,
      colorPalette,
    });

    const images =
      modelConfig.provider === "gemini"
        ? await generateWithGemini(enhancedPrompt, image)
        : await generateWithReplicate(modelConfig, enhancedPrompt, image);

    if (images.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No image was generated. Please try again with a different prompt.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { success: true, images, model: modelConfig.label },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in generate-image endpoint:", error);
    return mapGenerationError(error);
  }
}
