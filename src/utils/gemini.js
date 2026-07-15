/**
 * Error for responses the model returned but that we can't use (bad JSON,
 * safety block, etc.). Carries an HTTP status and a message safe to show the
 * user. Routes map this to a distinct response instead of a generic 500.
 */
export class AiResponseError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.name = "AiResponseError";
    this.status = status;
  }
}

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const BASE_RETRY_DELAY_MS = 500;
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 2;

const BLOCKED_FINISH_REASONS = new Set([
  "SAFETY",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "RECITATION",
]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorStatus = (error) => {
  if (!error) return null;
  if (typeof error.status === "number") return error.status;
  if (typeof error.code === "number") return error.code;
  const match = String(error.message ?? "").match(/\b(4\d\d|5\d\d)\b/);
  return match ? Number(match[1]) : null;
};

/**
 * Call ai.models.generateContent with a timeout (via AbortController) and
 * limited exponential-backoff retries for transient failures (HTTP 429/5xx).
 * Does not retry 4xx validation/safety errors.
 */
export const generateContentWithResilience = async (
  ai,
  params,
  { timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES } = {},
) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await ai.models.generateContent({
        ...params,
        config: { ...(params.config ?? {}), abortSignal: controller.signal },
      });
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);
      const isTransient = status !== null && TRANSIENT_STATUSES.has(status);
      if (!isTransient || attempt === maxRetries) {
        throw error;
      }
      await delay(BASE_RETRY_DELAY_MS * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
};

/**
 * Throw an AiResponseError (422) if the model refused / blocked the request,
 * detected via promptFeedback.blockReason or a blocking candidate finishReason.
 */
export const assertNotBlocked = (response, userMessage) => {
  const blockReason = response?.promptFeedback?.blockReason;
  const finishReason = response?.candidates?.[0]?.finishReason;
  if (
    blockReason ||
    (finishReason && BLOCKED_FINISH_REASONS.has(finishReason))
  ) {
    throw new AiResponseError(userMessage, 422);
  }
};

/**
 * Parse model text into a JSON object, guarding shape. Throws an
 * AiResponseError (422) with a user-appropriate message on bad model output.
 */
export const parseModelJsonObject = (rawText, userMessage) => {
  let parsed;
  try {
    parsed = extractJsonResponse(rawText);
  } catch {
    throw new AiResponseError(userMessage, 422);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new AiResponseError(userMessage, 422);
  }
  return parsed;
};

export const extractJsonResponse = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Model response was empty or not a string");
  }

  const trimmed = rawText.trim();

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch) {
      return JSON.parse(fencedMatch[1]);
    }
    throw new Error("Failed to parse JSON from model response");
  }
};

export const getResponseText = async (response) => {
  if (!response) {
    return "";
  }

  if (typeof response.text === "function") {
    return await response.text();
  }

  if (typeof response.text === "string") {
    return response.text;
  }

  if (response.response) {
    const nested = response.response;
    if (typeof nested.text === "function") {
      return await nested.text();
    }
    if (typeof nested.text === "string") {
      return nested.text;
    }
  }

  return "";
};
