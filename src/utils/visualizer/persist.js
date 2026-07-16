/**
 * Persistence for visualizer renders: Supabase Storage (image bytes) +
 * `visualizer_renders` table (metadata). See
 * supabase/migrations/20260714_visualizer_renders.sql for the schema.
 *
 * Every function here is best-effort from the route's perspective: callers
 * catch failures and degrade to a user-facing notice — a broken history
 * pipeline must never block delivering a successful render.
 */

export const RENDERS_BUCKET = "visualizer-renders";
export const SIGNED_URL_TTL_SECONDS = 3600;

const EXT_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Uploads the render image and inserts its metadata row.
 * Runs under the user's own session (RLS scopes everything to auth.uid()).
 *
 * @returns {Promise<{ renderId: string, imagePath: string }>}
 */
export const saveRender = async (
  supabase,
  userId,
  {
    renderId: presetId = null,
    imageBase64,
    mimeType,
    model,
    prompt,
    composedPrompt,
    params,
    adherence,
    mode = "render",
    layers = null,
  },
) => {
  const ext = EXT_BY_MIME[mimeType] ?? "png";
  // The route may pre-mint the id so it can respond before the save runs.
  const renderId = presetId ?? crypto.randomUUID();
  const imagePath = `${userId}/${renderId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(RENDERS_BUCKET)
    .upload(imagePath, Buffer.from(imageBase64, "base64"), {
      contentType: mimeType,
      upsert: false,
    });
  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase
    .from("visualizer_renders")
    .insert({
      id: renderId,
      created_by: userId,
      mode,
      model,
      prompt: prompt ?? null,
      composed_prompt: composedPrompt,
      params,
      image_path: imagePath,
      adherence: adherence ?? null,
      // Only sent when present so inserts keep working on databases where
      // the 20260716_render_layers migration hasn't been applied yet.
      ...(layers ? { layers } : {}),
    });
  if (insertError) {
    // Don't leave an orphaned object behind.
    await supabase.storage.from(RENDERS_BUCKET).remove([imagePath]);
    throw new Error(`History insert failed: ${insertError.message}`);
  }

  return { renderId, imagePath };
};

/**
 * Lists the user's renders (newest first) with short-lived signed URLs.
 */
export const listRenders = async (
  supabase,
  { limit = 24, mode = null } = {},
) => {
  const buildQuery = (columns) => {
    let query = supabase
      .from("visualizer_renders")
      .select(columns)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (mode) {
      query = query.eq("mode", mode);
    }
    return query;
  };

  let { data: rows, error } = await buildQuery(
    "id, created_at, model, prompt, params, image_path, layers",
  );
  // Databases that predate the 20260716_render_layers migration have no
  // layers column (42703) — history must keep working without it.
  if (error && /layers/.test(error.message)) {
    ({ data: rows, error } = await buildQuery(
      "id, created_at, model, prompt, params, image_path",
    ));
  }
  if (error) {
    throw new Error(`History query failed: ${error.message}`);
  }

  const renders = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(RENDERS_BUCKET)
        .createSignedUrl(row.image_path, SIGNED_URL_TTL_SECONDS);
      return {
        id: row.id,
        createdAt: row.created_at,
        model: row.model,
        prompt: row.prompt,
        params: row.params,
        layers: row.layers ?? null,
        imageUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  // Rows whose storage object went missing get filtered rather than shown broken.
  return renders.filter((r) => r.imageUrl);
};

/**
 * Deletes one render (row + storage object). RLS restricts to the owner.
 * @returns {Promise<boolean>} false when the row wasn't found / not owned.
 */
export const deleteRender = async (supabase, renderId) => {
  const { data: row, error } = await supabase
    .from("visualizer_renders")
    .delete()
    .eq("id", renderId)
    .select("image_path")
    .maybeSingle();
  if (error) {
    throw new Error(`History delete failed: ${error.message}`);
  }
  if (!row) return false;

  await supabase.storage.from(RENDERS_BUCKET).remove([row.image_path]);
  return true;
};
