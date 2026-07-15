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
  const { spaceKind, roomType, style, lighting, colorPalette, creativity } =
    params;

  const directives = [];
  for (const [param, value] of Object.entries({
    roomType,
    style,
    lighting,
    colorPalette,
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

/**
 * Rebuild the instruction with hard emphasis on directives the verification
 * step found ignored. Used for the single automatic retry.
 */
export const strengthenPrompt = ({ prompt, params }, failedParams) => {
  const { instruction, directives } = composeRenderPrompt({ prompt, params });

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
