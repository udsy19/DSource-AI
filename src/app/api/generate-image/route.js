import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
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
import { createClient } from "@/utils/supabase/server";
import {
  hasDirectiveParams,
  validateRenderParams,
} from "@/utils/visualizer/params";
import {
  composeRenderPrompt,
  strengthenPrompt,
} from "@/utils/visualizer/prompt-composer";
import { saveRender } from "@/utils/visualizer/persist";
import { verifyAdherence } from "@/utils/visualizer/verify";

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

/**
 * Normalizes the edit-base image to a data URI. Accepts data URIs / raw
 * base64 as-is; https URLs are downloaded server-side ONLY when they point at
 * our own Supabase storage (history items use short-lived signed URLs) —
 * anything else is rejected to prevent SSRF.
 */
const normalizeBaseImage = async (image) => {
  if (!image.startsWith("http")) {
    return { image, error: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !image.startsWith(`${supabaseUrl}/storage/`)) {
    return {
      image: null,
      error: "Image URLs are not accepted — upload the photo directly.",
    };
  }

  const res = await fetch(image);
  if (!res.ok) {
    return {
      image: null,
      error: "That render is no longer available — please re-select or re-upload it.",
    };
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/png";
  return { image: `data:${mime};base64,${buffer.toString("base64")}`, error: null };
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

const generateWithGemini = async (instruction, image, seed) => {
  const imageData = parseImageData(image);
  const contents = [
    { inlineData: { data: imageData.data, mimeType: imageData.mimeType } },
    { text: instruction },
  ];

  const imageResponse = await callWithRetry(
    () =>
      ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents,
        ...(seed !== undefined ? { config: { seed } } : {}),
      }),
    { label: "Image generation", timeoutMs: 60_000 },
  );

  const candidateParts =
    imageResponse?.candidates?.[0]?.content?.parts ??
    imageResponse?.parts ??
    [];
  for (const part of candidateParts) {
    if (part.inlineData) {
      return {
        image: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }
  return null;
};

const generateWithReplicate = async (modelConfig, instruction, image, seed) => {
  const input = modelConfig.buildInput(instruction, image, { seed });
  const output = await callWithRetry(
    () => replicate.run(modelConfig.slug, { input }),
    {
      label: `${modelConfig.label} generation`,
      timeoutMs: REPLICATE_TIMEOUT_MS,
    },
  );

  const url = toImageUrl(output);
  if (!url) return null;

  const downloaded = await fetch(url);
  if (!downloaded.ok) {
    throw new Error(
      `Failed to download generated image (${downloaded.status})`,
    );
  }
  const arrayBuffer = await downloaded.arrayBuffer();
  return {
    image: Buffer.from(arrayBuffer).toString("base64"),
    mimeType: downloaded.headers.get("content-type") || "image/png",
  };
};

const generateOnce = (modelConfig, instruction, image, seed) =>
  modelConfig.provider === "gemini"
    ? generateWithGemini(instruction, image, seed)
    : generateWithReplicate(modelConfig, instruction, image, seed);

// --- Topic guard -----------------------------------------------------------

/**
 * Checks a free-text prompt is interior/architecture related. Only runs when
 * the user actually typed one — params-only requests are intrinsically
 * on-topic. Fail-open: a guard outage must not block generation.
 *
 * @returns {{ allowed: boolean, notice: string|null }}
 */
const runTopicGuard = async (prompt) => {
  const guardPrompt = `
    Analyze this text prompt and determine if it is related to interior redesign, architecture, home improvement, construction, floor layouts, room remodeling, furniture arrangement, lighting redesign, or similar architectural contexts.

    Prompt: "${prompt}"

    Respond with pure JSON:
    { "isValid": boolean, "confidence": number, "reasoning": string }
  `;

  try {
    const response = await callWithRetry(
      () =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ text: guardPrompt }],
        }),
      { label: "Prompt validation", timeoutMs: 15_000, retries: 0 },
    );
    const result = extractJsonResponse(await getResponseText(response));
    return {
      allowed: Boolean(result.isValid) && result.confidence >= 0.5,
      notice: null,
    };
  } catch (error) {
    console.error("Topic guard skipped:", error.message);
    return { allowed: true, notice: "Prompt topic check was unavailable." };
  }
};

// --- Route -----------------------------------------------------------------

export async function POST(request) {
  // Step 0: Require an authenticated user (also keys rate limiting).
  let user;
  if (DEV_BYPASS) {
    console.warn(
      "[generate-image] DEV_AUTH_BYPASS active — auth & topic guard skipped",
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

  // --- Input validation ---
  const prompt =
    typeof body.prompt === "string" && body.prompt.trim().length > 0
      ? body.prompt.trim()
      : null;

  if (prompt && prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt is too long (max ${MAX_PROMPT_LENGTH} characters).` },
      { status: 400 },
    );
  }

  if (!body.image || typeof body.image !== "string") {
    return NextResponse.json(
      { error: "Upload a room photo first — every model edits your image." },
      { status: 400 },
    );
  }
  if (body.image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json(
      { error: "Image is too large. Please use an image under 10MB." },
      { status: 413 },
    );
  }

  const normalized = await normalizeBaseImage(body.image);
  if (!normalized.image) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }
  const image = normalized.image;
  if (image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json(
      { error: "Image is too large. Please use an image under 10MB." },
      { status: 413 },
    );
  }

  const validation = validateRenderParams(body.params);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.errors.join(" ") },
      { status: 400 },
    );
  }
  const params = validation.params;

  if (!prompt && !hasDirectiveParams(params)) {
    return NextResponse.json(
      {
        error:
          "Describe a change or set at least one parameter (style, lighting, space, or palette).",
      },
      { status: 400 },
    );
  }

  // --- Model resolution ---
  const modelKey =
    typeof body.model === "string" && body.model ? body.model : DEFAULT_MODEL;
  const modelConfig = getModel(modelKey);
  if (!modelConfig) {
    return NextResponse.json(
      { error: "Unknown model selected." },
      { status: 400 },
    );
  }
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

  const notices = [];

  try {
    // --- Topic guard (typed prompts only; params are whitelisted enums) ---
    if (prompt && !DEV_BYPASS) {
      const guard = await runTopicGuard(prompt);
      if (guard.notice) notices.push(guard.notice);
      if (!guard.allowed) {
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

    // --- Compose the instruction (single source of truth for the prompt) ---
    const { instruction } = composeRenderPrompt({ prompt, params });

    // "Different renders every time" off → fixed seed (models that support it).
    const seed =
      body.variedSeed === false && modelConfig.supportsSeed ? 42 : undefined;

    // --- Generate ---
    let result = await generateOnce(modelConfig, instruction, image, seed);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No image was generated. Please try again with a different prompt.",
        },
        { status: 502 },
      );
    }

    // --- Verify adherence, retry once with strengthened directives ---
    let adherence = { checked: [], failures: [], skipped: false, retried: false };
    if (!DEV_BYPASS) {
      const check = await verifyAdherence(
        ai,
        { data: result.image, mimeType: result.mimeType },
        params,
      );
      adherence = { ...check, retried: false };

      if (check.failures.length > 0) {
        const strengthened = strengthenPrompt(
          { prompt, params },
          check.failures.map((f) => f.param),
        );
        try {
          const retryResult = await generateOnce(
            modelConfig,
            strengthened,
            image,
            seed,
          );
          if (retryResult) {
            const recheck = await verifyAdherence(
              ai,
              { data: retryResult.image, mimeType: retryResult.mimeType },
              params,
            );
            // Keep the retry only if it did not get worse.
            if (
              recheck.skipped ||
              recheck.failures.length <= check.failures.length
            ) {
              result = retryResult;
              adherence = { ...recheck, retried: true };
            }
            if (adherence.failures.length > 0 && !adherence.skipped) {
              notices.push(
                `The model may not have fully applied: ${adherence.failures
                  .map((f) => `${f.param} (${f.expected})`)
                  .join(", ")}.`,
              );
            }
          }
        } catch (retryError) {
          // Retry is best-effort; deliver the first result.
          console.error("Adherence retry failed:", retryError.message);
          notices.push(
            `The model may not have fully applied: ${check.failures
              .map((f) => `${f.param} (${f.expected})`)
              .join(", ")}.`,
          );
        }
      }
    }

    // --- Persist to history (best-effort) ---
    let renderId = null;
    if (DEV_BYPASS) {
      notices.push("History is not saved in dev bypass mode.");
    } else {
      try {
        const cookieStore = await cookies();
        const supabase = await createClient(cookieStore);
        const saved = await saveRender(supabase, user.id, {
          imageBase64: result.image,
          mimeType: result.mimeType,
          model: modelKey,
          prompt,
          composedPrompt: instruction,
          params,
          adherence,
        });
        renderId = saved.renderId;
      } catch (persistError) {
        console.error("Render persistence failed:", persistError.message);
        notices.push("This render could not be saved to your history.");
      }
    }

    return NextResponse.json(
      {
        success: true,
        images: [result],
        model: modelConfig.label,
        composedPrompt: instruction,
        adherence,
        renderId,
        notices,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in generate-image endpoint:", error);
    return mapGenerationError(error);
  }
}
