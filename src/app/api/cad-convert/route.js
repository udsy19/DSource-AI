import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { geometryToDxf, geometryToSvg } from "@/utils/cad";
import {
  COORD_RANGE,
  processFloorPlanGeometry,
  sanitizeFloorPlanGeometry,
  solveScale,
} from "@/utils/cad-geometry";
import { reconcileToDimensions } from "@/utils/cad-reconcile";
import {
  extractJsonResponse,
  getResponseText,
  parseImageData,
} from "@/utils/gemini";
import { checkRateLimit } from "@/utils/rate-limit";

export const maxDuration = 60;

// Dev-only escape hatch for local testing without a login.
// Hard-disabled in production builds; enabled only via .env.local flag.
const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

// Try the strongest model first; fall back if it's unavailable or returns
// unparseable output. Extraction quality varies, so never silently downgrade
// the response — the model used is reported back to the client.
// "-latest" aliases keep working when Google rotates preview model IDs.
// gemini-3.5-flash first: pro-latest (Gemini 3 pro) returns thoughtSignature
// parts that corrupt the SDK's text concatenation in JSON mode, so it burns
// ~35s before failing; flash parses reliably and is faster.
const EXTRACTION_MODELS = ["gemini-3.5-flash", "gemini-pro-latest"];

// One JSON-mode Gemini call with the model-fallback loop shared by the
// extraction, AI-edit, and suggest paths. Throws the last error if every
// model fails.
const generateJsonWithFallback = async (contents) => {
  let lastError = null;
  for (const model of EXTRACTION_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 65536,
          temperature: 0.2,
        },
      });
      return {
        result: extractJsonResponse(await getResponseText(response)),
        model,
      };
    } catch (error) {
      console.error(`CAD Gemini call failed with ${model}:`, error.message);
      lastError = error;
    }
  }
  throw lastError || new Error("Gemini request failed");
};

const CLASSIFICATION_PROMPT = `
Classify this image for a floor-plan digitization tool.

Respond with ONLY a JSON object:
{
  "kind": "floor_plan_drawing" | "floor_plan_sketch" | "interior_photo" | "exterior_photo" | "other",
  "legibility": number (0-1, how clearly walls and rooms can be traced),
  "confidence": number (0-1),
  "reasoning": string (one sentence)
}

"floor_plan_drawing" = a drawn/printed/CAD top-down floor plan (scan or screenshot).
"floor_plan_sketch" = a hand-drawn top-down floor plan.
Photos of rooms or buildings are NOT floor plans.
`;

const buildExtractionPrompt = () => `
You are an expert architectural drafter digitizing a floor plan image into vector geometry.

Coordinate system: origin at the image's top-left corner, x increases right, y increases down.
Scale the image so its LONGEST side spans exactly 0 to ${COORD_RANGE}. All coordinates must be within 0-${COORD_RANGE}.

Trace the plan and respond with ONLY a JSON object (no markdown, no commentary):
{
  "walls": [{ "x1": number, "y1": number, "x2": number, "y2": number, "thickness": number }],
  "openings": [{ "type": "door" | "window", "x1": number, "y1": number, "x2": number, "y2": number, "hingeAtStart": boolean, "swingSide": "left" | "right" }],
  "rooms": [{ "label": string, "polygon": [[x, y], ...] }],
  "fixtures": [{ "type": "stairs" | "fireplace" | "sink" | "counter" | "closet" | "appliance" | "bathroom" | "other", "label": string, "x1": number, "y1": number, "x2": number, "y2": number }],
  "dimensions": [{ "text": string, "x1": number, "y1": number, "x2": number, "y2": number }],
  "unitsHint": "mm" | "cm" | "m" | "ftin" | "unknown",
  "confidence": number (0-1, your honest confidence in this extraction),
  "issues": [string]
}

Rules:
- Trace EVERY wall as a straight centerline segment. Split segments at corners and junctions so endpoints of touching walls coincide.
- "thickness" is the wall's drawn thickness in the same coordinate units (typically 5-25); omit if unclear.
- Doors and windows are short segments lying along a wall, spanning the opening. Doors are usually drawn with a swing arc; windows as thin double lines within a wall.
- For each door, read its swing arc (the arc's center is the hinge): set "hingeAtStart" to true if the hinge is at the (x1,y1) end of the opening segment, false if at the (x2,y2) end. Set "swingSide" to the side the door leaf swings toward when facing along the x1->x2 direction: "left" or "right". Omit both for windows.
- "dimensions": every legible printed or hand-written dimension string on the plan (e.g. "3500", "3.50 m", "11'-6\\"", "3'6\\"", "350cm", "118\\"", "66½", "40.5"), with "text" exactly as written including fraction marks. Hand-drawn plans often write many measurements along walls — capture ALL of them; they are the most valuable data on the plan. The segment (x1,y1)-(x2,y2) must span EXACTLY the extent that dimension measures — the dimension line between its extension lines / arrowheads / tick marks, in the same 0-${COORD_RANGE} coordinate space. Only include dimensions whose measured extent is clearly identifiable; skip any you cannot tie to a specific span.
- "fixtures": built-in features drawn on the plan — stairs, fireplaces, sinks, counters, closets, appliances, bathroom fixtures — as their bounding box (x1,y1 top-left, x2,y2 bottom-right) with "label" as printed on the plan (or "" if unlabeled). Do not include loose furniture.
- "unitsHint": the unit style the plan's dimensions are written in ("ftin" for feet-and-inches plans); "unknown" if you cannot tell.
- "rooms": one entry per enclosed room, as a simplified polygon (corner points only, in order). Use the room's printed name for "label" if the plan has one, otherwise infer from fixtures (e.g. "Bathroom") or use "".
- List anything you could not read reliably in "issues" (e.g. "dimensions illegible", "left wing cropped").
- Be conservative: only include walls you can actually see. Do not invent geometry.
`;

// Furniture symbols the client can place and the AI editor may add.
const ASSET_SYMBOLS = [
  "sofa",
  "armchair",
  "coffee-table",
  "tv-unit",
  "potted-plant",
  "dining-table",
  "kitchen-sink",
  "stove",
  "fridge",
  "bed-double",
  "bed-single",
  "wardrobe",
  "bathtub",
  "toilet",
  "washbasin",
];

const FLOOR_PATTERN_VALUES = '"tiles", "herringbone", "planks", or null';

const MAX_EDIT_PROMPT_LENGTH = 2000;

const buildEditPrompt = (geometry, mmPerUnit, editPrompt) => `
You are an expert CAD drafting assistant editing a digitized floor plan.

CURRENT GEOMETRY (JSON — walls, openings, rooms, fixtures, dimensions, assets):
${JSON.stringify(geometry)}

Coordinate system: normalized units 0-${COORD_RANGE}, origin top-left, x increases right, y increases down. 1 unit = ${mmPerUnit} mm — use this to reason about real-world sizes (e.g. a double bed is roughly 1500 x 2000 mm).

USER INSTRUCTION (apply exactly this, nothing more):
"""
${editPrompt}
"""

Available asset "symbol" ids you may add to "assets": ${ASSET_SYMBOLS.join(", ")}.
Assets have the shape { "id": string, "symbol": string, "x": number, "y": number, "w": number | null, "h": number | null, "rotation": number }; x/y is the placement position and w/h the size, all in the same 0-${COORD_RANGE} normalized units (use null for w/h to get sensible defaults). Rooms may carry "floorPattern": ${FLOOR_PATTERN_VALUES}.

Respond with ONLY a JSON object (no markdown, no commentary):
{
  "geometry": <the FULL modified geometry object, same schema as the input, including all unchanged walls/openings/rooms/fixtures/dimensions/assets>,
  "summary": "<one sentence describing what was changed>",
  "applied": boolean
}

Rules:
- Preserve everything the instruction does not mention — copy it through unchanged.
- Never delete walls unless the instruction explicitly asks for it.
- Keep every coordinate within 0-${COORD_RANGE}.
- Give any new asset a unique "id".
- If the instruction cannot be done with this schema and the available symbols/patterns, set "applied" to false, return the geometry UNCHANGED, and explain why in "summary".
- Be conservative: make the smallest change that satisfies the instruction.
`;

const buildSuggestPrompt = (geometry, mmPerUnit) => `
You are reviewing a digitized floor plan. Suggest up to 5 concrete, actionable improvements the user could make with the available tools (add furniture assets from the list, set floor patterns, fix wall alignment, label rooms).

GEOMETRY (JSON, coordinates normalized 0-${COORD_RANGE}, 1 unit = ${mmPerUnit} mm):
${JSON.stringify(geometry)}

Available asset symbol ids: ${ASSET_SYMBOLS.join(", ")}.
Available floorPattern values: ${FLOOR_PATTERN_VALUES}.

Respond ONLY {"suggestions": ["..."]} — each suggestion one short sentence (max 200 characters).
`;

const classificationError = (classification) => {
  const kind = classification?.kind;
  if (kind === "interior_photo" || kind === "exterior_photo") {
    return "This looks like a photo, not a floor plan. Converting photos of spaces into floor plans isn't reliably possible with current AI — please upload a drawn or scanned top-down floor plan instead.";
  }
  if (kind === "floor_plan_drawing" || kind === "floor_plan_sketch") {
    return "This floor plan is too unclear to trace reliably. Try a higher-resolution scan or a straighter, better-lit photo of the plan.";
  }
  return "We couldn't recognize a floor plan in this image. Please upload a drawn or scanned top-down floor plan.";
};

// Parsed dimension values outside this range are almost certainly misread —
// no printed floor-plan dimension measures less than 10cm or more than 50m.
const MIN_DIMENSION_MM = 100;
const MAX_DIMENSION_MM = 50000;

/**
 * Parse a printed dimension string into millimeters, or null if unreadable.
 *
 * Handles:
 * - Feet-and-inches: 11'-6", 11'6", 11', 6" (feet x 304.8 + inches x 25.4)
 * - Explicit metric units: "3500mm", "350 cm", "3.5 m", "3,50m" (decimal comma)
 * - Plain numbers, interpreted by unitsHint: mm as-is, cm x10, m x1000,
 *   ftin as feet. When unitsHint is unknown, a documented magnitude
 *   heuristic applies:
 *     value < 50      -> meters (no room span is under 50mm or over 50m)
 *     50..1000        -> centimeters if value*10 is a plausible room span
 *                        (500-15000mm), otherwise millimeters
 *     value > 1000    -> millimeters
 * - Results outside 100mm..50000mm are rejected (returns null).
 */
// Hand-written plans use fraction notation ("66½", "40 1/2", "¾") — fold it
// into decimals before unit parsing.
const normalizeFractionText = (text) =>
  text
    .replace(/(\d)\s*½/g, "$1.5")
    .replace(/(\d)\s*¼/g, "$1.25")
    .replace(/(\d)\s*¾/g, "$1.75")
    .replace(/½/g, "0.5")
    .replace(/¼/g, "0.25")
    .replace(/¾/g, "0.75")
    .replace(/(\d+)[\s-]+1\/2/g, "$1.5")
    .replace(/(\d+)[\s-]+1\/4/g, "$1.25")
    .replace(/(\d+)[\s-]+3\/4/g, "$1.75");

const parseDimensionText = (text, unitsHint) => {
  if (typeof text !== "string") return null;
  const trimmed = normalizeFractionText(text.trim());
  if (!trimmed) return null;

  const inRange = (mm) =>
    Number.isFinite(mm) && mm >= MIN_DIMENSION_MM && mm <= MAX_DIMENSION_MM
      ? mm
      : null;

  // Feet-inches: 11'-6", 11'6", 11', 6"
  const ftin = trimmed.match(
    /^(?:(\d+(?:\.\d+)?)\s*['’]\s*-?\s*)?(?:(\d+(?:\.\d+)?)\s*["”])?$/,
  );
  if (ftin && (ftin[1] || ftin[2])) {
    const feet = Number(ftin[1] || 0);
    const inches = Number(ftin[2] || 0);
    return inRange(feet * 304.8 + inches * 25.4);
  }

  // Normalize European decimal commas ("3,50 m" -> "3.50 m")
  const normalized = trimmed.replace(",", ".");

  // Explicit metric unit suffix: "3500mm", "350 cm", "3.5 m"
  const metric = normalized.match(/^(\d+(?:\.\d+)?)\s*(mm|cm|m)\.?$/i);
  if (metric) {
    const value = Number(metric[1]);
    const unit = metric[2].toLowerCase();
    const mm =
      unit === "mm" ? value : unit === "cm" ? value * 10 : value * 1000;
    return inRange(mm);
  }

  // Bare number: interpret via the plan's unit style
  const plain = normalized.match(/^(\d+(?:\.\d+)?)$/);
  if (!plain) return null;
  const value = Number(plain[1]);
  if (!(value > 0)) return null;

  if (unitsHint === "mm") return inRange(value);
  if (unitsHint === "cm") return inRange(value * 10);
  if (unitsHint === "m") return inRange(value * 1000);
  // Bare number on a feet-inches plan: hand-measured plans write inch counts
  // without the " mark (118, 66.5); values under 24 are more plausibly feet
  // (24" spans no room, 24' does).
  if (unitsHint === "ftin")
    return inRange(value >= 24 ? value * 25.4 : value * 304.8);

  // unitsHint unknown — magnitude heuristic (documented above)
  if (value < 50) return inRange(value * 1000);
  if (value <= 1000) {
    const asCm = value * 10;
    return inRange(asCm >= 500 && asCm <= 15000 ? asCm : value);
  }
  return inRange(value);
};

const SCALE_WARNINGS = {
  "door-heuristic":
    "Scale estimated from standard door width — confirm a measurement before relying on dimensions",
  assumed:
    "No printed dimensions or doors found — scale is a rough assumption; set a known measurement",
};

const planSizeFromBounds = (bounds) => {
  if (!bounds) return null;
  if (Number.isFinite(bounds.width) && Number.isFinite(bounds.height)) {
    return { width: bounds.width, height: bounds.height };
  }
  return {
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
};

// Optional professional export: the cad-export microservice authors a richer
// DXF (blocks, hatching, real dimensions, title block) — and a DWG when its
// ODA converter is installed — from the same processed geometry the JS
// renderer consumes. Unset CAD_EXPORT_URL or any failure returns null so the
// baseline JS renderer always keeps the conversion response working.
const renderProfessionalExport = async (processed) => {
  const baseUrl = process.env.CAD_EXPORT_URL;
  if (!baseUrl) return null;
  try {
    const response = await fetch(`${baseUrl}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        geometry: processed,
        meta: {
          projectName: "DSource Floor Plan",
          dateStr: new Date().toISOString().slice(0, 10),
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error(`CAD export service responded with ${response.status}`);
      return null;
    }
    const result = await response.json();
    if (typeof result?.dxf !== "string") {
      console.error("CAD export service response is missing a dxf string");
      return null;
    }
    return result;
  } catch (error) {
    console.error("CAD export service request failed:", error.message);
    return null;
  }
};

// Sanitize client-echoed geometry (never trust client input). Returns either
// the sanitized result or a ready-to-return 400 response.
const sanitizeClientGeometry = (rawGeometry) => {
  try {
    return { sanitized: sanitizeFloorPlanGeometry(rawGeometry) };
  } catch (error) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: `Invalid geometry: ${error.message}. Send back the geometry object from a previous conversion response.`,
        },
        { status: 400 },
      ),
    };
  }
};

const buildSuccessResponse = ({
  geometry,
  processed,
  pro,
  scale,
  warnings,
  confidence,
  model,
  classification,
}) => ({
  success: true,
  svg: geometryToSvg(processed),
  dxf: pro?.dxf ?? geometryToDxf(processed),
  dwg: pro?.dwg ?? null,
  exportEngine: pro ? "ezdxf" : "js",
  stats: {
    walls: geometry.walls.length,
    doors: geometry.openings.filter((o) => o.type === "door").length,
    windows: geometry.openings.filter((o) => o.type === "window").length,
    rooms: geometry.rooms.length,
    fixtures: (geometry.fixtures ?? []).length,
    dimensions: (geometry.dimensions ?? []).length,
    assets: (geometry.assets ?? []).length,
  },
  confidence,
  warnings: [
    ...warnings,
    ...(pro?.warnings ?? []),
    ...(process.env.CAD_EXPORT_URL && !pro
      ? ["Professional export service unavailable — using baseline DXF"]
      : []),
  ],
  model,
  classification,
  scale,
  // The sanitized pre-scale geometry: clients echo this back with a corrected
  // mmPerUnit for a render-only re-scale, without re-running extraction.
  geometry,
  planSizeMm: planSizeFromBounds(processed.bounds),
});

export async function POST(request) {
  // Same auth + rate-limit prologue as every other AI route — the pipeline
  // makes multiple Gemini calls per conversion.
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
  const limit = checkRateLimit(`cad-convert:${user.id}`, {
    windowMs: 60_000,
    max: 6,
  });
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

  try {
    const body = await request.json();

    const mmPerUnitInput = Number(body?.mmPerUnit);
    const scaleOverrideMmPerUnit =
      Number.isFinite(mmPerUnitInput) && mmPerUnitInput > 0
        ? mmPerUnitInput
        : null;

    // AI edit mode: the client echoes back geometry plus a natural-language
    // instruction. Gemini returns the FULL modified geometry, which is
    // re-sanitized (never trust model output), processed, and rendered.
    if (body?.editPrompt !== undefined) {
      const editPrompt =
        typeof body.editPrompt === "string" ? body.editPrompt.trim() : "";
      if (!editPrompt || editPrompt.length > MAX_EDIT_PROMPT_LENGTH) {
        return NextResponse.json(
          {
            success: false,
            error: `editPrompt must be a non-empty string of at most ${MAX_EDIT_PROMPT_LENGTH} characters`,
          },
          { status: 400 },
        );
      }
      if (!body?.geometry || !scaleOverrideMmPerUnit) {
        return NextResponse.json(
          {
            success: false,
            error:
              "AI edit requires the geometry and a positive mmPerUnit from a previous conversion response",
          },
          { status: 400 },
        );
      }

      const { sanitized, errorResponse } = sanitizeClientGeometry(
        body.geometry,
      );
      if (errorResponse) return errorResponse;

      const { result: edit, model: editModel } = await generateJsonWithFallback(
        [
          {
            text: buildEditPrompt(
              sanitized.geometry,
              scaleOverrideMmPerUnit,
              editPrompt,
            ),
          },
        ],
      );

      const editSummary = typeof edit?.summary === "string" ? edit.summary : "";
      const editApplied = edit?.applied !== false;

      // Second sanitize — never trust model output. A declined edit
      // (applied: false) may omit the geometry; fall back to the unchanged
      // input so the plan still renders.
      let resanitized;
      try {
        resanitized = sanitizeFloorPlanGeometry(
          edit?.geometry ?? (editApplied ? undefined : sanitized.geometry),
        );
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: "The AI edit produced invalid geometry — try rephrasing",
            details: { summary: editSummary },
          },
          { status: 422 },
        );
      }

      const scale = {
        mmPerUnit: scaleOverrideMmPerUnit,
        source: "user",
        confidence: 1,
        samples: 0,
      };
      const processed = await processFloorPlanGeometry(
        resanitized.geometry,
        scale.mmPerUnit,
      );
      const pro = await renderProfessionalExport(processed);

      return NextResponse.json({
        ...buildSuccessResponse({
          geometry: resanitized.geometry,
          processed,
          pro,
          scale,
          warnings: resanitized.warnings,
          confidence: null,
          model: editModel,
          classification: null,
        }),
        editSummary,
        editApplied,
      });
    }

    // Suggest mode: one Gemini review pass over the geometry — no rendering,
    // no svg/dxf, just up to 5 actionable improvement strings.
    if (body?.suggest) {
      if (!body?.geometry || !scaleOverrideMmPerUnit) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Suggestions require the geometry and a positive mmPerUnit from a previous conversion response",
          },
          { status: 400 },
        );
      }

      const { sanitized, errorResponse } = sanitizeClientGeometry(
        body.geometry,
      );
      if (errorResponse) return errorResponse;

      const { result } = await generateJsonWithFallback([
        {
          text: buildSuggestPrompt(sanitized.geometry, scaleOverrideMmPerUnit),
        },
      ]);
      const suggestions = (
        Array.isArray(result?.suggestions) ? result.suggestions : []
      )
        .filter((s) => typeof s === "string")
        .slice(0, 5)
        .map((s) => s.slice(0, 200));

      return NextResponse.json({ success: true, suggestions });
    }

    // Reconcile mode: adjust wall coordinates so every written dimension's
    // real-world span equals its printed value (constraint solve), then
    // process and render the adjusted geometry like render-only. Mutually
    // inconsistent dimensions are reported, not silently enforced.
    if (body?.reconcile) {
      if (!body?.geometry || !scaleOverrideMmPerUnit) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Reconcile requires the geometry and a positive mmPerUnit from a previous conversion response",
          },
          { status: 400 },
        );
      }

      const { sanitized, errorResponse } = sanitizeClientGeometry(
        body.geometry,
      );
      if (errorResponse) return errorResponse;

      if ((sanitized.geometry.dimensions ?? []).length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No written dimensions to reconcile against",
          },
          { status: 400 },
        );
      }

      const scale = {
        mmPerUnit: scaleOverrideMmPerUnit,
        source: "user",
        confidence: 1,
        samples: 0,
      };

      let reconciled;
      try {
        reconciled = await reconcileToDimensions(
          sanitized.geometry,
          scale.mmPerUnit,
        );
      } catch (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 422 },
        );
      }

      const processed = await processFloorPlanGeometry(
        reconciled.geometry,
        scale.mmPerUnit,
      );
      const pro = await renderProfessionalExport(processed);

      return NextResponse.json({
        ...buildSuccessResponse({
          geometry: reconciled.geometry,
          processed,
          pro,
          scale,
          warnings: sanitized.warnings,
          confidence: null,
          model: null,
          classification: null,
        }),
        reconcile: reconciled.report,
      });
    }

    // Render-only mode: the client echoes back previously extracted geometry
    // with a corrected scale. No Gemini calls — just re-sanitize (never trust
    // client input), process, and render.
    if (body?.geometry && scaleOverrideMmPerUnit) {
      const { sanitized, errorResponse } = sanitizeClientGeometry(
        body.geometry,
      );
      if (errorResponse) return errorResponse;

      const { geometry, warnings } = sanitized;
      const scale = {
        mmPerUnit: scaleOverrideMmPerUnit,
        source: "user",
        confidence: 1,
        samples: 0,
      };
      const processed = await processFloorPlanGeometry(
        geometry,
        scale.mmPerUnit,
      );
      const pro = await renderProfessionalExport(processed);

      return NextResponse.json(
        buildSuccessResponse({
          geometry,
          processed,
          pro,
          scale,
          warnings,
          confidence: null,
          model: null,
          classification: null,
        }),
      );
    }

    const imageData = parseImageData(body?.image);

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: "An image is required" },
        { status: 400 },
      );
    }

    if (imageData.mimeType === "image/svg+xml") {
      return NextResponse.json(
        {
          success: false,
          error:
            "SVG files can't be analyzed for CAD conversion. Please upload the plan as a JPG or PNG.",
        },
        { status: 400 },
      );
    }

    const imagePart = {
      inlineData: { data: imageData.data, mimeType: imageData.mimeType },
    };

    // Step 1: Gate — only proceed on images that are actually floor plans
    const classificationResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [imagePart, { text: CLASSIFICATION_PROMPT }],
    });
    const classification = extractJsonResponse(
      await getResponseText(classificationResponse),
    );

    const isFloorPlan =
      (classification.kind === "floor_plan_drawing" ||
        classification.kind === "floor_plan_sketch") &&
      (classification.legibility ?? 0) >= 0.3;

    if (!isFloorPlan) {
      return NextResponse.json(
        {
          success: false,
          error: classificationError(classification),
          details: classification,
        },
        { status: 422 },
      );
    }

    // Step 2: Extract structured geometry, with model fallback
    const { result: extraction, model: extractionModel } =
      await generateJsonWithFallback([
        imagePart,
        { text: buildExtractionPrompt() },
      ]);

    // Parse printed dimension texts into millimeters before sanitizing —
    // sanitizeFloorPlanGeometry drops entries with a null/invalid valueMm.
    if (Array.isArray(extraction.dimensions)) {
      extraction.dimensions = extraction.dimensions.map((d) => ({
        text: d?.text,
        valueMm: parseDimensionText(d?.text, extraction.unitsHint),
        x1: d?.x1,
        y1: d?.y1,
        x2: d?.x2,
        y2: d?.y2,
      }));
    }

    // Step 3: Validate/clean geometry — honest failure beats a wrong drawing.
    // completeFromRooms heals fresh extractions (inferred interior walls,
    // room/opening snapping); client-edited geometry is never completed.
    let sanitized;
    try {
      sanitized = sanitizeFloorPlanGeometry(extraction, {
        completeFromRooms: true,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `${error.message}. Try a clearer or higher-resolution image of the plan.`,
          details: { issues: extraction.issues || [] },
        },
        { status: 422 },
      );
    }

    const { geometry, warnings } = sanitized;
    if (Array.isArray(extraction.issues)) {
      warnings.push(...extraction.issues.filter((i) => typeof i === "string"));
    }

    // Step 4: Solve real-world scale from printed dimensions (or fall back
    // to door-width heuristics), then process geometry into millimeters.
    const solvedScale = solveScale(geometry);
    const scale = scaleOverrideMmPerUnit
      ? {
          mmPerUnit: scaleOverrideMmPerUnit,
          source: "user",
          confidence: 1,
          samples: 0,
        }
      : solvedScale;
    if (SCALE_WARNINGS[scale.source]) {
      warnings.push(SCALE_WARNINGS[scale.source]);
    }

    const processed = await processFloorPlanGeometry(geometry, scale.mmPerUnit);
    const pro = await renderProfessionalExport(processed);

    // Step 5: Render the processed mm geometry to SVG preview + DXF download
    return NextResponse.json(
      buildSuccessResponse({
        geometry,
        processed,
        pro,
        scale,
        warnings,
        confidence:
          typeof extraction.confidence === "number"
            ? Math.min(Math.max(extraction.confidence, 0), 1)
            : null,
        model: extractionModel,
        classification,
      }),
    );
  } catch (error) {
    console.error("Error in cad-convert endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to convert the image. Please try again.",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
