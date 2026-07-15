// Convert a data URL (or bare base64 string) into { data, mimeType } for Gemini inlineData parts
export const parseImageData = (imageData) => {
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

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 1;

const isRetryableError = (error) => {
  const status = error?.status ?? error?.code ?? error?.response?.status;
  if (status === 429 || status === 500 || status === 503) {
    return true;
  }
  const message = String(error?.message ?? "").toLowerCase();
  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("overloaded") ||
    message.includes("temporarily") ||
    message.includes("unavailable")
  );
};

const withTimeout = (promise, ms, label) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

// Providers answer 429s with retry-after ≈1s; retrying instantly just hits
// the same limit, so back off briefly before each retry attempt.
const RETRY_BACKOFF_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs an async model call with a hard timeout and a bounded retry on
 * transient failures (429/5xx/timeout). Non-retryable errors surface immediately.
 */
export const callWithRetry = async (
  fn,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    label = "Gemini request",
  } = {},
) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withTimeout(Promise.resolve().then(fn), timeoutMs, label);
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryableError(error)) {
        await sleep(RETRY_BACKOFF_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const extractJsonResponse = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Model response was empty or not a string");
  }

  const trimmed = rawText.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
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
