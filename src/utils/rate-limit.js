/**
 * Lightweight in-memory rate limiter (fixed window).
 *
 * Best-effort only: state lives in the process, so it resets on cold start and
 * is not shared across serverless instances. Use it as a cheap first line of
 * defense against runaway cost/abuse; a durable limiter (Redis/Upstash) should
 * back it in production.
 */

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 10;
const MAX_TRACKED_KEYS = 10_000;

// key -> { count, resetAt }
const buckets = new Map();

const pruneExpired = (now) => {
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) {
      buckets.delete(key);
    }
  }
};

/**
 * Records a hit for `key` and reports whether it is within the allowed window.
 *
 * @returns {{ allowed: boolean, remaining: number, resetAt: number, retryAfterMs: number }}
 */
export const checkRateLimit = (
  key,
  { windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX } = {},
) => {
  const now = Date.now();

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > MAX_TRACKED_KEYS) {
    pruneExpired(now);
  }

  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt, retryAfterMs: 0 };
  }

  if (entry.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: max - entry.count,
    resetAt: entry.resetAt,
    retryAfterMs: 0,
  };
};
