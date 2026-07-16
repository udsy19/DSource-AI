/**
 * Fail-fast environment variable validation.
 *
 * `NEXT_PUBLIC_*` vars are inlined at build time and safe to read in the
 * browser bundle. `GOOGLE_GENAI_API_KEY` is server-only and is validated
 * lazily — only when running on the server — so it never throws (or leaks)
 * inside client code.
 */

const assertEnv = (name, value) => {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        "Add it to .env.local (see .env.example).",
    );
  }
  return value;
};

// NEXT_PUBLIC_* vars must be referenced STATICALLY (process.env.FOO) so the
// bundler can inline them into the client bundle. A dynamic process.env[name]
// is not inlined and reads undefined in the browser — which previously threw
// on every page. Keep these as direct static reads.
/** @returns {string} Public Supabase project URL. */
export const getSupabaseUrl = () =>
  assertEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

/** @returns {string} Public Supabase anon key. */
export const getSupabaseAnonKey = () =>
  assertEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

/**
 * @returns {string} Server-only Google GenAI API key.
 * @throws If called in a browser context, or if the var is unset on the server.
 */
export const getGoogleGenAIKey = () => {
  if (typeof window !== "undefined") {
    throw new Error(
      "GOOGLE_GENAI_API_KEY is server-only and must not be read in the browser.",
    );
  }
  return assertEnv("GOOGLE_GENAI_API_KEY", process.env.GOOGLE_GENAI_API_KEY);
};
