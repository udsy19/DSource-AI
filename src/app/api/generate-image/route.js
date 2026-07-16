import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import Replicate from "replicate";
import { requireAuth } from "@/utils/api-auth";
import {
  callWithRetry,
  extractJsonResponse,
  getResponseText,
  parseImageData,
} from "@/utils/gemini";
import { checkRateLimit } from "@/utils/rate-limit";
import { getModel } from "@/utils/replicate-models";
import { createClient } from "@/utils/supabase/server";
import {
  aspectRatioFromImage,
  isValidBox,
  MAX_IMAGE_CHARS,
  normalizeBaseImage,
  normalizeProductImages,
} from "@/utils/visualizer/images";
import { sanitizeLayers } from "@/utils/visualizer/layers";
import {
  getBankProduct,
  isMaterialBankConfigured,
} from "@/utils/visualizer/material-bank";
import { routeTask } from "@/utils/visualizer/model-router";
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
  composeReferencePrompt,
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
          // Yes/no classification — no chain-of-thought needed; a zero
          // thinking budget cuts the call from ~2.4s to well under 1s.
          config: { thinkingConfig: { thinkingBudget: 0 } },
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
    // Multi-input models can't "match_input_image" unambiguously — compute
    // the room's aspect explicitly (this caused the cropped-swap bug).
    const aspectRatio = await aspectRatioFromImage(
      normalized.image,
      getModel("seedream-4")?.aspectRatios ?? [],
    );
    return {
      task: "swap",
      params: { ...params, swapProductId: productId },
      // Order contract (A/B tested): product FIRST, room LAST — the model
      // treats the last image as the canvas to edit.
      images: [productImage, normalized.image],
      requiresImage: true,
      requiresMultiImage: true,
      io: aspectRatio ? { aspectRatio } : {},
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

  // Reference-guided render: the user attached an inspiration image to their
  // words ("add the flooring from this image"). Data URIs only — same intake
  // contract as the room photo.
  if (body.referenceImage && typeof body.referenceImage === "string") {
    if (body.referenceImage.length > MAX_IMAGE_CHARS) {
      return {
        error: "The reference image is too large (max 10MB).",
        status: 413,
      };
    }
    const reference = await normalizeBaseImage(body.referenceImage);
    if (!reference.image) return { error: reference.error, status: 400 };

    const composeInput = { prompt, params };
    const aspectRatio = await aspectRatioFromImage(
      normalized.image,
      getModel("seedream-4")?.aspectRatios ?? [],
    );
    return {
      task: "reference",
      params,
      // Order contract (same as swap): reference FIRST, room LAST — the
      // multi-image editor treats the last image as the canvas.
      images: [reference.image, normalized.image],
      requiresImage: true,
      requiresMultiImage: true,
      io: aspectRatio ? { aspectRatio } : {},
      instruction: composeReferencePrompt(composeInput).instruction,
      verify: (image) => verifyAdherence(ai, image, params),
      strengthen: (failures) =>
        strengthenPrompt(
          composeInput,
          failures.map((f) => f.param),
          composeReferencePrompt,
        ),
    };
  }

  const composeInput = { prompt, params };
  return {
    task: "render",
    params,
    images: [normalized.image],
    requiresImage: true,
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
    task: "moodboard",
    params,
    images,
    requiresImage: false,
    requiresMultiImage: true,
    io: { aspectRatio: params.aspectRatio },
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
    task: "cad",
    params,
    images: [normalized.image],
    requiresImage: true,
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
  // Stage timing: one structured log line per request so slow renders can be
  // attributed to a specific hop (auth / prepare / guard / generate / verify /
  // retry / persist) instead of guessed at.
  const t0 = Date.now();
  let tPrev = t0;
  const timings = {};
  const mark = (stage) => {
    const now = Date.now();
    timings[stage] = now - tPrev;
    tPrev = now;
  };

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
  mark("auth+parse");

  try {
    const prepared = await PREPARERS[mode](body, prompt, notices);
    mark("prepare");
    if (prepared.error) {
      return NextResponse.json(
        { error: prepared.error },
        { status: prepared.status ?? 400 },
      );
    }

    // --- Model resolution: the router decides per task; body.model is an
    // undocumented override kept for internal testing only. ---
    const route = routeTask(prepared.task);
    let modelKey = route.modelKey;
    let modelConfig = route.model;
    if (typeof body.model === "string" && body.model && getModel(body.model)) {
      modelKey = body.model;
      modelConfig = getModel(body.model);
    }
    if (prepared.requiresMultiImage && !modelConfig.multiImage) {
      return NextResponse.json(
        { error: "This task needs a model that can combine multiple images." },
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

    // "Different renders every time" off → fixed seed (models that support it).
    const seed =
      body.variedSeed === false && modelConfig.supportsSeed ? 42 : undefined;
    // IO policy: router defaults, then task-specific values from the preparer.
    const generateOpts = { seed, ...route.io, ...(prepared.io ?? {}) };

    // --- Generate, with the topic guard racing alongside ---
    // The guard (typed prompts only; params are whitelisted enums) used to
    // gate generation serially, adding its full latency to every prompted
    // render. Running it concurrently hides that cost; on the rare rejection
    // the generated image is simply discarded.
    const guardPromise =
      prompt && GEMINI_READY
        ? runTopicGuard(prompt)
        : Promise.resolve({ allowed: true, notice: null });
    const [result0, guard] = await Promise.all([
      generateOnce(
        modelConfig,
        prepared.instruction,
        prepared.images,
        generateOpts,
      ),
      guardPromise,
    ]);
    let result = result0;
    mark("generate+guard");

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
      mark("verify");
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
        mark("adherenceRetry");
        if (adherence.failures.length > 0 && !adherence.skipped) {
          notices.push(
            `The model may not have fully applied: ${adherence.failures
              .map((f) => `${f.param} (${f.expected})`)
              .join(", ")}.`,
          );
        }
      }
    }

    // --- Persist to history (best-effort, after the response is sent) ---
    // The upload + insert used to cost ~1.6s of user-visible latency for a
    // fire-and-forget write. The id is minted here so the client gets it
    // immediately; after() runs the save once the response has flushed.
    // (cookies() is captured now — request APIs aren't available inside after.)
    let renderId = null;
    if (DEV_BYPASS) {
      notices.push("History is not saved in dev bypass mode.");
    } else {
      renderId = crypto.randomUUID();
      const savedImage = result.image;
      const savedMime = result.mimeType;
      const savedAdherence = adherence;
      const cookieStore = await cookies();
      after(async () => {
        try {
          const supabase = await createClient(cookieStore);
          await saveRender(supabase, user.id, {
            renderId,
            imageBase64: savedImage,
            mimeType: savedMime,
            model: modelKey,
            prompt,
            composedPrompt: prepared.instruction,
            params: prepared.params,
            adherence: savedAdherence,
            mode,
            layers: sanitizeLayers(body.layers),
          });
        } catch (persistError) {
          console.error("Render persistence failed:", persistError.message);
        }
      });
    }
    mark("persist");
    console.log(
      `[generate-image] mode=${mode} model=${modelKey} total=${
        Date.now() - t0
      }ms stages=${JSON.stringify(timings)}`,
    );

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
