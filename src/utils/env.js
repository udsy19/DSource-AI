/**
 * Fail-fast environment variable validation.
 *
 * `NEXT_PUBLIC_*` vars are inlined at build time and safe to read in the
 * browser bundle. The remaining vars are server-only secrets validated
 * lazily — only when running on the server, at first use — so they never
 * throw (or leak) inside client code, and never fail a build that runs
 * with placeholder env (CI).
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

const assertServerOnly = (name) => {
  if (typeof window !== "undefined") {
    throw new Error(
      `${name} is server-only and must not be read in the browser.`,
    );
  }
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
  assertServerOnly("GOOGLE_GENAI_API_KEY");
  return assertEnv("GOOGLE_GENAI_API_KEY", process.env.GOOGLE_GENAI_API_KEY);
};

/**
 * @returns {string} Server-only Supabase service-role key. Bypasses RLS —
 * never expose it to client code.
 * @throws If called in a browser context, or if the var is unset on the server.
 */
export const getSupabaseServiceRoleKey = () => {
  assertServerOnly("SUPABASE_SERVICE_ROLE_KEY");
  return assertEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
};

/**
 * @returns {string} Server-only Replicate API token.
 * @throws If called in a browser context, or if the var is unset on the server.
 */
export const getReplicateToken = () => {
  assertServerOnly("REPLICATE_API_TOKEN");
  return assertEnv("REPLICATE_API_TOKEN", process.env.REPLICATE_API_TOKEN);
};

/**
 * Admin emails allowed to perform privileged actions (e.g. granting roles).
 * Configured via the ADMIN_EMAILS env var (comma-separated).
 *
 * @returns {string[]} Lowercased, trimmed admin email allowlist.
 * @throws If called in a browser context, or if the var is unset on the server.
 */
export const getAdminEmails = () => {
  assertServerOnly("ADMIN_EMAILS");
  return assertEnv("ADMIN_EMAILS", process.env.ADMIN_EMAILS)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};
