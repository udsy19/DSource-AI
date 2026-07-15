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
import {
  DEFAULT_MODEL,
  DEFAULT_MOODBOARD_MODEL,
  getModel,
} from "@/utils/replicate-models";
import { createClient } from "@/utils/supabase/server";
import {
  isValidBox,
  MAX_IMAGE_CHARS,
  normalizeBaseImage,
  normalizeProductImages,
} from "@/utils/visualizer/images";
import {
  getBankProduct,
  isMaterialBankConfigured,
} from "@/utils/visualizer/material-bank";
import {
  hasDirectiveParams,
  validateCadParams,
  validateMoodboardParams,
  validateRenderParams,
} from "@/utils/visualizer/params";
import { saveRender } from "@/utils/visualizer/persist";
import {
  composeCadPrompt,
  composeMoodboardPrompt,
  composeRenderPrompt,
  composeSwapPrompt,
  locationHintFromBox,
  strengthenCadPrompt,
  strengthenPrompt,
} from "@/utils/visualizer/prompt-composer";
import { verifyAdherence, verifyCad } from "@/utils/visualizer/verify";

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
const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const REPLICATE_TIMEOUT_MS = 120_000;
const MODES = ["render", "moodboard", "cad"];

// Dev-only escape hatch for local testing without a login.
// Hard-disabled in production builds; enabled only via .env.local flag.
const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

// Topic guard + adherence verification depend on Gemini, not on auth — run
// them whenever a real-looking key is configured, bypass or not.
const GEMINI_READY = Boolean(
  process.env.GOOGLE_GENAI_API_KEY?.startsWith("AIza"),
);

// Split a data URI (or raw base64) into Gemini inlineData fields.
const parseImageData = (imageData) => {
  if (!imageData.includes(",")) {
    return { data: imageData, mimeType: "image/png" };
  }
  const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    return { data: matches[2], mimeType: matches[1] || "image/png" };
  }
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

const generateWithGemini = async (instruction, images, seed) => {
  const contents = [
    ...images.map((img) => {
      const parsed = parseImageData(img);
      return {
        inlineData: { data: parsed.data, mimeType: parsed.mimeType },
      };
    }),
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

const generateWithReplicate = async (
  modelConfig,
  instruction,
  images,
  opts,
) => {
  const input = modelConfig.buildInput(instruction, images[0] ?? null, {
    ...opts,
    images,
  });
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

const generateOnce = (modelConfig, instruction, images, opts = {}) =>
  modelConfig.provider === "gemini"
    ? generateWithGemini(instruction, images, opts.seed)
    : generateWithReplicate(modelConfig, instruction, images, opts);

// --- Topic guard -----------------------------------------------------------

/**
 * Checks a free-text prompt is interior/architecture related. Only runs when
 * the user actually typed one — params-only requests are intrinsically
 * on-topic. Fail-open: a guard outage must not block generation.
 */
const runTopicGuard = async (prompt) => {
  const guardPrompt = `
    Analyze this text prompt and determine if it is related to interior redesign, architecture, home improvement, construction, floor layouts, room remodeling, furniture arrangement, lighting redesign, mood boards for interior projects, or similar architectural contexts.

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

// --- Per-mode request preparation -------------------------------------------
// Each prepares: input images, composed instruction, verify + strengthen fns.
// Returns { error, status } on invalid input.

const prepareRender = async (body, prompt) => {
  if (!body.image || typeof body.image !== "string") {
    return {
      error: "Upload a room photo first — every model edits your image.",
      status: 400,
    };
  }
  const normalized = await normalizeBaseImage(body.image);
  if (!normalized.image) return { error: normalized.error, status: 400 };

  const validation = validateRenderParams(body.params);
  if (!validation.ok) {
    return { error: validation.errors.join(" "), status: 400 };
  }
  const params = validation.params;

  // Swap-into-render: fuse a real catalog product into the room. The client
  // sends only the product id — the canonical image URL is resolved
  // server-side from the material bank (no client-supplied URLs).
  if (body.swap && typeof body.swap === "object") {
    if (!isMaterialBankConfigured()) {
      return {
        error: "Product swap requires the material bank connection.",
        status: 503,
      };
    }
    const productId = Number(body.swap.productId);
    if (!Number.isFinite(productId)) {
      return { error: "Invalid product for swap.", status: 400 };
    }
    const product = await getBankProduct(productId);
    if (!product) {
      return {
        error: "That product is no longer available in the material bank.",
        status: 404,
      };
    }
    const productImageRes = await fetch(product.imageUrl);
    if (!productImageRes.ok) {
      return {
        error: "The product's photo could not be loaded — try another match.",
        status: 502,
      };
    }
    const productBuffer = Buffer.from(await productImageRes.arrayBuffer());
    const productImage = `data:${
      productImageRes.headers.get("content-type") || "image/jpeg"
    };base64,${productBuffer.toString("base64")}`;

    const componentLabel =
      typeof body.swap.label === "string" ? body.swap.label.slice(0, 60) : null;
    const locationHint = isValidBox(body.swap.box)
      ? locationHintFromBox(body.swap.box)
      : null;

    const composeInput = {
      productName: product.title,
      componentLabel,
      locationHint,
      prompt,
    };
    return {
      params: { ...params, swapProductId: productId },
      // Order contract with the composer: room FIRST, product SECOND.
      images: [normalized.image, productImage],
      requiresImage: true,
      requiresMultiImage: true,
      defaultModel: DEFAULT_MOODBOARD_MODEL,
      instruction: composeSwapPrompt(composeInput).instruction,
      // Style params don't apply to a swap; skip param verification.
      verify: async () => ({ checked: [], failures: [], skipped: false }),
      strengthen: () => composeSwapPrompt(composeInput).instruction,
    };
  }

  if (!prompt && !hasDirectiveParams(params)) {
    return {
      error:
        "Describe a change or set at least one parameter (style, lighting, space, or palette).",
      status: 400,
    };
  }

  const composeInput = { prompt, params };
  return {
    params,
    images: [normalized.image],
    requiresImage: true,
    defaultModel: DEFAULT_MODEL,
    instruction: composeRenderPrompt(composeInput).instruction,
    verify: (image) => verifyAdherence(ai, image, params),
    strengthen: (failures) =>
      strengthenPrompt(
        composeInput,
        failures.map((f) => f.param),
      ),
  };
};

const prepareMoodboard = async (body, prompt, notices) => {
  const validation = validateMoodboardParams(body.params);
  if (!validation.ok) {
    return { error: validation.errors.join(" "), status: 400 };
  }
  const params = validation.params;

  let inspiration = null;
  if (body.image && typeof body.image === "string") {
    const normalized = await normalizeBaseImage(body.image);
    if (!normalized.image) return { error: normalized.error, status: 400 };
    inspiration = normalized.image;
  }

  const { images: productImages, errors: productErrors } =
    await normalizeProductImages(body.products);
  notices.push(...productErrors);

  if (
    !prompt &&
    !hasDirectiveParams(params) &&
    !inspiration &&
    productImages.length === 0
  ) {
    return {
      error:
        "Add products, upload an inspiration photo, or set at least one parameter to generate a mood board.",
      status: 400,
    };
  }

  // Order contract with the composer: inspiration first, then products.
  const images = [...(inspiration ? [inspiration] : []), ...productImages];
  const composeInput = {
    prompt,
    params,
    productCount: productImages.length,
    hasInspiration: Boolean(inspiration),
  };

  return {
    params,
    images,
    requiresImage: false,
    requiresMultiImage: true,
    defaultModel: DEFAULT_MOODBOARD_MODEL,
    aspectRatio: params.aspectRatio,
    instruction: composeMoodboardPrompt(composeInput).instruction,
    verify: (image) => verifyAdherence(ai, image, params),
    strengthen: (failures) =>
      strengthenPrompt(
        composeInput,
        failures.map((f) => f.param),
        composeMoodboardPrompt,
      ),
  };
};

const prepareCad = async (body, prompt) => {
  if (!body.image || typeof body.image !== "string") {
    return {
      error: "Upload a photo or floor plan to convert to CAD.",
      status: 400,
    };
  }
  const normalized = await normalizeBaseImage(body.image);
  if (!normalized.image) return { error: normalized.error, status: 400 };

  const validation = validateCadParams(body.params);
  if (!validation.ok) {
    return { error: validation.errors.join(" "), status: 400 };
  }
  const params = validation.params;
  const composeInput = { prompt, params };

  return {
    params,
    images: [normalized.image],
    requiresImage: true,
    defaultModel: DEFAULT_MODEL,
    instruction: composeCadPrompt(composeInput).instruction,
    verify: (image) => verifyCad(ai, image, params.view),
    strengthen: () => strengthenCadPrompt(composeInput),
  };
};

const PREPARERS = {
  render: prepareRender,
  moodboard: prepareMoodboard,
  cad: prepareCad,
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

  const mode = typeof body.mode === "string" ? body.mode : "render";
  if (!MODES.includes(mode)) {
    return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
  }

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
  if (typeof body.image === "string" && body.image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json(
      { error: "Image is too large. Please use an image under 10MB." },
      { status: 413 },
    );
  }

  const notices = [];

  try {
    const prepared = await PREPARERS[mode](body, prompt, notices);
    if (prepared.error) {
      return NextResponse.json(
        { error: prepared.error },
        { status: prepared.status ?? 400 },
      );
    }

    // --- Model resolution ---
    const modelKey =
      typeof body.model === "string" && body.model
        ? body.model
        : prepared.defaultModel;
    const modelConfig = getModel(modelKey);
    if (!modelConfig) {
      return NextResponse.json(
        { error: "Unknown model selected." },
        { status: 400 },
      );
    }
    if (prepared.requiresMultiImage && !modelConfig.multiImage) {
      return NextResponse.json(
        {
          error: `${modelConfig.label} can't combine multiple images — pick Nano Banana or Gemini for mood boards.`,
        },
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
            error:
              "Image generation is not configured. Please contact support.",
          },
          { status: 500 },
        );
      }
    }

    // --- Topic guard (typed prompts only; params are whitelisted enums) ---
    if (prompt && GEMINI_READY) {
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

    // "Different renders every time" off → fixed seed (models that support it).
    const seed =
      body.variedSeed === false && modelConfig.supportsSeed ? 42 : undefined;
    const generateOpts = { seed, aspectRatio: prepared.aspectRatio };

    // --- Generate ---
    let result = await generateOnce(
      modelConfig,
      prepared.instruction,
      prepared.images,
      generateOpts,
    );
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
    let adherence = {
      checked: [],
      failures: [],
      skipped: false,
      retried: false,
    };
    if (GEMINI_READY) {
      const check = await prepared.verify({
        data: result.image,
        mimeType: result.mimeType,
      });
      adherence = { ...check, retried: false };

      if (check.failures.length > 0) {
        try {
          const retryResult = await generateOnce(
            modelConfig,
            prepared.strengthen(check.failures),
            prepared.images,
            generateOpts,
          );
          if (retryResult) {
            const recheck = await prepared.verify({
              data: retryResult.image,
              mimeType: retryResult.mimeType,
            });
            // Keep the retry only if it did not get worse.
            if (
              recheck.skipped ||
              recheck.failures.length <= check.failures.length
            ) {
              result = retryResult;
              adherence = { ...recheck, retried: true };
            }
          }
        } catch (retryError) {
          // Retry is best-effort; deliver the first result.
          console.error("Adherence retry failed:", retryError.message);
        }
        if (adherence.failures.length > 0 && !adherence.skipped) {
          notices.push(
            `The model may not have fully applied: ${adherence.failures
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
          composedPrompt: prepared.instruction,
          params: prepared.params,
          adherence,
          mode,
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
        mode,
        composedPrompt: prepared.instruction,
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
