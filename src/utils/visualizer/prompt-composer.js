/**
 * Deterministic prompt composition for the AI Visualizer.
 *
 * Every set parameter becomes an explicit, imperative directive — edit models
 * follow instructions ("Adjust the lighting to warm lighting."), not scene
 * descriptions ("a warm-lit living room"). This is the fix for parameters
 * being silently ignored: the client sends structured params and the server
 * composes the one prompt that is actually sent to the model.
 *
 * Pure functions — no I/O — so the whole layer is unit-testable.
 */

const OPENINGS = {
  interior: "Edit this interior photograph.",
  exterior: "Edit this exterior architectural photograph.",
  "floor-plan": "Edit this architectural floor plan drawing.",
};

const QUALITY_TAILS = {
  interior:
    "The result must be a photorealistic, professional interior visualization.",
  exterior:
    "The result must be a photorealistic, professional architectural visualization.",
  "floor-plan":
    "The result must be a clean, precise architectural drawing with crisp linework.",
};

const CREATIVITY_CLAUSES = {
  precise:
    "Make only the requested changes. Preserve the original camera angle, room layout, architectural structure, and every element that was not explicitly mentioned.",
  balanced:
    "Keep the original camera angle, layout, and architectural structure, but you may adapt furnishings and finishes where needed to fulfil the request.",
  creative:
    "You may freely reinterpret furnishings, materials, and decor to best fulfil the request, but keep the same room, viewpoint, and architectural structure.",
};

const sentence = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

/**
 * Builds the directive sentence for one parameter. Exported so the
 * strengthen/retry path can rebuild individual directives with emphasis.
 */
export const directiveFor = (param, value, spaceKind = "interior") => {
  switch (param) {
    case "roomType":
      return spaceKind === "floor-plan"
        ? `The plan must clearly read as a ${value.toLowerCase()} floor plan.`
        : `The space must clearly read as a ${value.toLowerCase()}.`;
    case "style":
      return `Apply a ${value} design style throughout the space.`;
    case "lighting":
      return `Adjust the lighting so the scene has ${value.toLowerCase()} lighting.`;
    case "colorPalette":
      return `Use a ${value.toLowerCase()} color palette across materials and decor.`;
    case "flooring":
      return `Replace the flooring with ${value.toLowerCase()} flooring.`;
    case "wallFinish":
      return `Finish the walls with ${value.toLowerCase()} walls.`;
    case "furnitureDensity":
      return value === "Minimal"
        ? "Keep the furnishing minimal and sparse — only essential pieces."
        : value === "Richly furnished"
          ? "Furnish the space richly with layered decor, textiles, and accessories."
          : "Furnish the space to a balanced, livable level.";
    default:
      return null;
  }
};

/**
 * Compose the final instruction sent to the image model.
 *
 * @param {object} input
 * @param {string|null} input.prompt        free-text user request (optional)
 * @param {object}      input.params        validated params from validateRenderParams
 * @returns {{ instruction: string, directives: Array<{param: string, value: string, text: string}> }}
 */
export const composeRenderPrompt = ({ prompt, params }) => {
  const {
    spaceKind,
    roomType,
    style,
    lighting,
    colorPalette,
    flooring,
    wallFinish,
    furnitureDensity,
    creativity,
  } = params;

  const directives = [];
  for (const [param, value] of Object.entries({
    roomType,
    style,
    lighting,
    colorPalette,
    flooring,
    wallFinish,
    furnitureDensity,
  })) {
    if (value) {
      directives.push({
        param,
        value,
        text: directiveFor(param, value, spaceKind),
      });
    }
  }

  const parts = [
    OPENINGS[spaceKind] ?? OPENINGS.interior,
    prompt ? sentence(prompt) : null,
    ...directives.map((d) => d.text),
    CREATIVITY_CLAUSES[creativity] ?? CREATIVITY_CLAUSES.balanced,
    QUALITY_TAILS[spaceKind] ?? QUALITY_TAILS.interior,
  ].filter(Boolean);

  return { instruction: parts.join(" "), directives };
};

// --- Mood board -------------------------------------------------------------

const MOODBOARD_CREATIVITY_CLAUSES = {
  precise:
    "Stay strictly faithful to the provided products, palette, and references — do not invent unrelated items.",
  balanced:
    "Complement the provided elements with a few tasteful, coordinated additions.",
  creative:
    "Freely add complementary materials, textures, and decor ideas that elevate the concept.",
};

const ASPECT_LABELS = {
  "4:3": "landscape 4:3",
  "3:4": "portrait 3:4",
  "1:1": "square 1:1",
  "16:9": "widescreen 16:9",
};

/**
 * Compose the mood-board generation instruction.
 * Image order contract: the inspiration photo (if any) is FIRST in the image
 * array, followed by product photos — the wording below relies on that.
 */
export const composeMoodboardPrompt = ({
  prompt,
  params,
  productCount = 0,
  hasInspiration = false,
}) => {
  const { spaceKind, roomType, colorPalette, aspectRatio, creativity } = params;

  const directives = [];
  if (roomType) {
    directives.push({
      param: "roomType",
      value: roomType,
      text: `The board is for a ${roomType.toLowerCase()} ${
        spaceKind === "exterior" ? "exterior" : "interior"
      } project.`,
    });
  }
  if (colorPalette) {
    directives.push({
      param: "colorPalette",
      value: colorPalette,
      text: `Build the board around a ${colorPalette.toLowerCase()} color palette.`,
    });
  }

  const parts = [
    "Create a professional interior design mood board.",
    hasInspiration
      ? "Use the first provided photo as the overall inspiration reference for the board's direction."
      : null,
    productCount > 0
      ? `Feature the ${productCount} provided product photo${
          productCount > 1 ? "s" : ""
        } as the hero elements of the board, complemented by coordinated material swatches, textures, and color chips.`
      : "Compose the board from coordinated material swatches, textures, furniture pieces, and color chips.",
    prompt ? sentence(prompt) : null,
    ...directives.map((d) => d.text),
    MOODBOARD_CREATIVITY_CLAUSES[creativity] ??
      MOODBOARD_CREATIVITY_CLAUSES.balanced,
    `Compose the board in a ${ASPECT_LABELS[aspectRatio] ?? "landscape 4:3"} format.`,
    "Flat-lay collage composition on a clean neutral background, magazine-quality, with balanced spacing between elements.",
  ].filter(Boolean);

  return { instruction: parts.join(" "), directives };
};

// --- Image to CAD -----------------------------------------------------------

const CAD_VIEW_DIRECTIVES = {
  "floor-plan":
    "Produce a top-down 2D floor plan view with accurate wall lines, door swings, window symbols, and simplified furniture symbols.",
  "2d-view":
    "Produce a front-facing 2D elevation view with clean orthographic line work.",
};

/**
 * Compose the image→CAD conversion instruction. Deliberately precise-only:
 * a technical drawing must not take creative liberties.
 */
export const composeCadPrompt = ({ prompt, params }) => {
  const parts = [
    "Convert this photograph into a precise, black-and-white 2D architectural CAD drawing.",
    CAD_VIEW_DIRECTIVES[params.view] ?? CAD_VIEW_DIRECTIVES["floor-plan"],
    prompt ? sentence(prompt) : null,
    "Preserve the real layout and proportions of the source photo exactly.",
    "Pure white background, uniform thin black linework, no colors, no shading, no photorealistic textures — drafting-standard output.",
  ].filter(Boolean);

  return { instruction: parts.join(" "), directives: [] };
};

/**
 * Retry emphasis for CAD conversions whose output still looked photographic
 * or showed the wrong view.
 */
export const strengthenCadPrompt = ({ prompt, params }) => {
  const { instruction } = composeCadPrompt({ prompt, params });
  return `CRITICAL REQUIREMENT (was ignored last time): the output MUST be a black-and-white technical line drawing with zero photographic content. ${instruction}`;
};

/**
 * Rebuild the instruction with hard emphasis on directives the verification
 * step found ignored. Used for the single automatic retry. Works for any
 * mode: pass that mode's compose function (defaults to render).
 */
export const strengthenPrompt = (
  input,
  failedParams,
  composeFn = composeRenderPrompt,
) => {
  const { instruction, directives } = composeFn(input);

  const emphasized = failedParams
    .map((param) => {
      const d = directives.find((item) => item.param === param);
      return d
        ? `CRITICAL REQUIREMENT (was ignored last time): ${d.text}`
        : null;
    })
    .filter(Boolean);

  return [...emphasized, instruction].join(" ");
};

// --- Swap product into render -------------------------------------------

const LOCATION_COLS = ["left", "center", "right"];
const LOCATION_ROWS = ["upper", "middle", "lower"];

/** Rough human-readable location of a box_2d center, e.g. "lower left". */
export const locationHintFromBox = (box) => {
  if (!Array.isArray(box) || box.length !== 4) return null;
  const cx = (box[1] + box[3]) / 2;
  const cy = (box[0] + box[2]) / 2;
  const col = LOCATION_COLS[Math.min(2, Math.floor(cx / 334))];
  const row = LOCATION_ROWS[Math.min(2, Math.floor(cy / 334))];
  return row === "middle" && col === "center" ? "center" : `${row} ${col}`;
};

/**
 * Compose the instruction for swapping a real catalog product into the room.
 * Image order contract (A/B tested on seedream-4): product photo FIRST,
 * room photo LAST — the model treats the last image as the canvas; the
 * reverse order produced a product hero shot with the room discarded.
 */
/**
 * Reference-guided render: the user attached an inspiration image alongside
 * their words ("add the flooring from this image"). Image order contract
 * (same as swap): reference FIRST, room LAST — the multi-image editor treats
 * the last image as the canvas.
 */
export const composeReferencePrompt = ({ prompt, params }) => {
  const rendered = composeRenderPrompt({ prompt: null, params });
  const parts = [
    "The first image is a reference for materials, colors, or furnishings.",
    "The last image is a photograph of a room — that photograph is the one to edit.",
    prompt
      ? `Apply this instruction, taking whatever it mentions from the reference image: ${sentence(prompt)}`
      : "Transfer the dominant materials and palette of the reference image onto the room's surfaces and furnishings.",
    ...rendered.directives.map((d) => d.text),
    "Keep the room photograph's camera angle, architecture, and layout exactly the same. Do not copy the reference image's room or composition — only take the elements the instruction asks for.",
    "The result must be a photorealistic, professional interior visualization.",
  ].filter(Boolean);
  return { instruction: parts.join(" "), directives: rendered.directives };
};

export const composeSwapPrompt = ({
  productName,
  componentLabel,
  locationHint,
  sizeHint,
  prompt,
}) => {
  const parts = [
    `The first image is a product photo of ${productName}.`,
    "The last image is a photograph of a room.",
    `Edit the room photograph: remove the ${componentLabel || "highlighted item"}${
      locationHint ? ` in the ${locationHint} of the image` : ""
    } and place the product from the first image in its position, at the same angle and realistic scale.`,
    // The models tend to hero the product at the reference photo's framing —
    // pin the size to the removed item's actual footprint in the room photo.
    sizeHint
      ? `CRITICAL: the removed item occupies roughly ${sizeHint} of the room photograph — the product must occupy that same area, no larger. Do not zoom in on it or enlarge it.`
      : "The product must occupy the same visual footprint as the item it replaces — do not enlarge it.",
    "Reproduce the product's exact design, colors, materials, and proportions.",
    prompt ? sentence(prompt) : null,
    "Keep every other element of the room photograph exactly the same — camera angle, walls, floor, rug, curtains, plants, decor, and lighting. Do not add or remove any other furniture or objects.",
    "The result must be a photorealistic, professional interior visualization.",
  ].filter(Boolean);
  return { instruction: parts.join(" "), directives: [] };
};

/** Human-readable footprint of a 0-1000 box, e.g. "12% of the width and 30% of the height". */
export const sizeHintFromBox = (box) => {
  if (!Array.isArray(box) || box.length !== 4) return null;
  const w = Math.round((box[3] - box[1]) / 10);
  const h = Math.round((box[2] - box[0]) / 10);
  if (!w || !h) return null;
  return `${w}% of the image width and ${h}% of its height`;
};
