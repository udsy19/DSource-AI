/**
 * Shared, framework-agnostic auth validation and error mapping.
 * Safe to import from both client and server code (no side effects, no env).
 */

export const PASSWORD_MIN_LENGTH = 8;

// Pragmatic email check — the real validation is done by Supabase; this only
// catches obvious mistakes before a network round-trip.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  const value = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!value)
    return { valid: false, message: "Please enter your email address." };
  if (!EMAIL_REGEX.test(value)) {
    return { valid: false, message: "Please enter a valid email address." };
  }
  return { valid: true, value };
}

/**
 * Strong-password policy: at least PASSWORD_MIN_LENGTH chars, with at least one
 * letter and one number. Keep this in sync with the Supabase Auth password
 * policy (Dashboard → Authentication → Policies).
 */
export function validatePassword(password) {
  const value = typeof password === "string" ? password : "";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    };
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return {
      valid: false,
      message: "Password must include at least one letter and one number.",
    };
  }
  return { valid: true, value };
}

/**
 * 0–4 strength score with a label, for an optional strength meter.
 */
export function getPasswordStrength(password) {
  const value = typeof password === "string" ? password : "";
  let score = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^a-zA-Z0-9]/.test(value)) score++;
  const clamped = Math.min(score, 4);
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score: clamped, label: labels[clamped] };
}

/**
 * Guards against open-redirects: only allow same-origin relative paths.
 */
export function safeNextPath(next, fallback = "/") {
  if (typeof next !== "string" || !next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

/**
 * Maps raw Supabase auth errors to user-safe messages that don't leak internals
 * or enable account enumeration. Returns a stable `code` the UI can branch on
 * (e.g. to offer a "resend confirmation" action).
 */
export function mapAuthError(error) {
  if (!error)
    return {
      code: "generic",
      message: "Something went wrong. Please try again.",
    };

  const code = error.code || "";
  const status = error.status || 0;
  const raw = (error.message || "").toLowerCase();

  if (
    code === "invalid_credentials" ||
    raw.includes("invalid login credentials")
  ) {
    return {
      code: "invalid_credentials",
      message: "The email or password is incorrect.",
    };
  }
  if (code === "email_not_confirmed" || raw.includes("email not confirmed")) {
    return {
      code: "email_not_confirmed",
      message: "Please confirm your email address first. Need a new link?",
    };
  }
  if (
    status === 429 ||
    code.includes("rate") ||
    raw.includes("rate limit") ||
    raw.includes("too many")
  ) {
    return {
      code: "rate_limited",
      message: "Too many attempts. Please wait a moment and try again.",
    };
  }
  if (
    code === "weak_password" ||
    raw.includes("password should") ||
    raw.includes("weak password")
  ) {
    return {
      code: "weak_password",
      message: `Please choose a stronger password (at least ${PASSWORD_MIN_LENGTH} characters, with letters and numbers).`,
    };
  }
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    raw.includes("already registered") ||
    raw.includes("already been registered")
  ) {
    // Avoid confirming account existence outright.
    return {
      code: "email_exists",
      message:
        "If that email is available, your account has been created. Check your inbox to confirm it.",
    };
  }
  if (
    code === "otp_expired" ||
    raw.includes("expired") ||
    raw.includes("invalid token")
  ) {
    return {
      code: "link_expired",
      message: "That link is invalid or has expired. Please request a new one.",
    };
  }

  return {
    code: "generic",
    message: "Something went wrong. Please try again.",
  };
}
