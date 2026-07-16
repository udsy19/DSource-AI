/**
 * Shared helpers for the folio (visualizer_projects) API routes.
 */

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MIGRATION_NOTICE =
  "Folios are not set up yet — apply the 20260717_projects migration to start filing renders.";

/** Trims an optional text field to null; rejects non-strings/overlong values. */
export const optionalText = (value, maxLength) => {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "string" || value.trim().length > maxLength) {
    return { ok: false };
  }
  return { ok: true, value: value.trim() || null };
};

/** Rethrowable Error that preserves the Supabase error code (e.g. 42P01). */
export const withCode = (error) =>
  Object.assign(new Error(error.message), { code: error.code });
