import crypto from "node:crypto";

/**
 * Server-only helpers to capture AI usage, generated designs, uploaded images,
 * and user activity. Every function is BEST-EFFORT: it swallows its own errors
 * and never throws, so instrumentation can never break the user-facing request.
 * Intended to run inside `after()` so it adds no latency to the response.
 *
 * All writes go through the caller's normal (RLS-bound) Supabase client: the
 * capture RLS policies allow a user to insert their own rows and upload to their
 * own `{userId}/...` storage path.
 */

const EXT_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function extForMime(mime) {
  return EXT_BY_MIME[mime] || "bin";
}

/** Pull client IP + user agent from the request headers. */
export function requestMeta(request) {
  const userAgent = request.headers.get("user-agent") || null;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : null;
  return { ip, userAgent };
}

/** Upload a Buffer to `{bucket}/{userId}/{uuid}.{ext}`. Returns path or null. */
export async function uploadCaptureImage(
  supabase,
  bucket,
  userId,
  buffer,
  contentType,
) {
  try {
    const path = `${userId}/${crypto.randomUUID()}.${extForMime(contentType)}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: false });
    if (error) {
      console.error(`ai-capture: upload to ${bucket} failed`);
      return null;
    }
    return path;
  } catch {
    console.error(`ai-capture: upload to ${bucket} threw`);
    return null;
  }
}

/** Insert a row and return its id (or null). Never throws. */
export async function insertCapture(supabase, table, row) {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(row)
      .select("id")
      .single();
    if (error) {
      console.error(`ai-capture: insert into ${table} failed`);
      return null;
    }
    return data?.id ?? null;
  } catch {
    console.error(`ai-capture: insert into ${table} threw`);
    return null;
  }
}

/** Record a user activity event. */
export async function logActivity(supabase, userId, eventType, meta = {}) {
  return insertCapture(supabase, "activity_events", {
    user_id: userId ?? null,
    event_type: eventType,
    target_type: meta.targetType ?? null,
    target_id: meta.targetId ?? null,
    metadata: meta.metadata ?? null,
    ip: meta.ip ?? null,
    user_agent: meta.userAgent ?? null,
  });
}

/** Best-effort presence update. */
export async function touchLastSeen(supabase, userId) {
  if (!userId) return;
  try {
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    /* best effort */
  }
}
