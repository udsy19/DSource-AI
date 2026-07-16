/**
 * Persistence for visualizer renders and folios: Supabase Storage (image
 * bytes) + `visualizer_renders` / `visualizer_projects` tables (metadata).
 * See supabase/migrations/20260714_visualizer_renders.sql and
 * 20260717_projects.sql for the schemas.
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

const BASE_RENDER_COLUMNS = "id, created_at, model, prompt, params, image_path";
// Filing metadata added by the 20260717_projects migration.
const FOLIO_RENDER_COLUMNS = "project_id, room_id, is_favorite, archived_at";

/** True when the query failed because a column doesn't exist yet (42703). */
const isMissingColumnError = (error) =>
  error?.code === "42703" ||
  /column .* does not exist/i.test(error?.message ?? "");

/**
 * True when the query failed because a table doesn't exist yet — Postgres
 * reports 42P01; PostgREST reports its schema cache miss as PGRST205.
 */
export const isMissingTableError = (error) =>
  error?.code === "42P01" ||
  error?.code === "PGRST205" ||
  /relation .* does not exist|could not find the table/i.test(
    error?.message ?? "",
  );

/**
 * Lists the user's renders (newest first) with short-lived signed URLs.
 *
 * Folio filters: `projectId` is a project uuid or the literal "none"
 * (unfiled only); `favorites` keeps starred renders; archived renders are
 * excluded unless `includeArchived` is set.
 */
export const listRenders = async (
  supabase,
  {
    limit = 24,
    mode = null,
    projectId = null,
    favorites = false,
    includeArchived = false,
  } = {},
) => {
  const buildQuery = (columns, withFolioFilters) => {
    let query = supabase
      .from("visualizer_renders")
      .select(columns)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (mode) {
      query = query.eq("mode", mode);
    }
    if (withFolioFilters) {
      if (projectId === "none") {
        query = query.is("project_id", null);
      } else if (projectId) {
        query = query.eq("project_id", projectId);
      }
      if (favorites) {
        query = query.eq("is_favorite", true);
      }
      if (!includeArchived) {
        query = query.is("archived_at", null);
      }
    }
    return query;
  };

  let hasFolioColumns = true;
  let { data: rows, error } = await buildQuery(
    `${BASE_RENDER_COLUMNS}, layers, ${FOLIO_RENDER_COLUMNS}`,
    true,
  );
  // Databases that predate the 20260717_projects migration have no filing
  // columns — history must keep working without them. A pre-migration DB
  // cannot have filed or favorited renders, so those filters return empty.
  if (error && isMissingColumnError(error)) {
    hasFolioColumns = false;
    if (favorites || (projectId && projectId !== "none")) return [];
    ({ data: rows, error } = await buildQuery(
      `${BASE_RENDER_COLUMNS}, layers`,
      false,
    ));
    // Same again for DBs that predate 20260716_render_layers.
    if (error && isMissingColumnError(error)) {
      ({ data: rows, error } = await buildQuery(BASE_RENDER_COLUMNS, false));
    }
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
        // Folio fields stay absent pre-migration so the UI can hide filing
        // actions instead of showing controls that would fail.
        ...(hasFolioColumns
          ? {
              projectId: row.project_id ?? null,
              roomId: row.room_id ?? null,
              isFavorite: Boolean(row.is_favorite),
              archived: Boolean(row.archived_at),
            }
          : {}),
      };
    }),
  );

  // Rows whose storage object went missing get filtered rather than shown broken.
  return renders.filter((r) => r.imageUrl);
};

/**
 * Lists the caller's active folios (projects), newest activity first, with
 * their room lists, non-archived render counts, and a signed cover URL.
 * Throws with the underlying Supabase error `code` preserved so routes can
 * detect a missing table (pre-migration) and degrade gracefully.
 */
export const listProjects = async (supabase) => {
  const { data: rows, error } = await supabase
    .from("visualizer_projects")
    .select(
      `id, name, client_name, address, cover_render_id, status, created_at,
       updated_at, visualizer_project_rooms ( id, name, sort_order )`,
    )
    .eq("status", "active")
    .order("updated_at", { ascending: false });
  if (error) {
    const wrapped = new Error(`Folio query failed: ${error.message}`);
    wrapped.code = error.code;
    throw wrapped;
  }

  const projects = rows ?? [];
  const ids = projects.map((p) => p.id);

  // Non-archived render tallies per folio (grouped client-side — the row
  // volume per user is small and this avoids PostgREST aggregate config).
  const countByProject = new Map();
  if (ids.length > 0) {
    const { data: renderRows } = await supabase
      .from("visualizer_renders")
      .select("project_id")
      .in("project_id", ids)
      .is("archived_at", null);
    for (const row of renderRows ?? []) {
      countByProject.set(
        row.project_id,
        (countByProject.get(row.project_id) ?? 0) + 1,
      );
    }
  }

  // Signed cover URLs (RLS scopes the path lookup to the owner's renders).
  const coverIds = projects.map((p) => p.cover_render_id).filter(Boolean);
  const coverUrlByRenderId = new Map();
  if (coverIds.length > 0) {
    const { data: coverRows } = await supabase
      .from("visualizer_renders")
      .select("id, image_path")
      .in("id", coverIds);
    await Promise.all(
      (coverRows ?? []).map(async (row) => {
        const { data: signed } = await supabase.storage
          .from(RENDERS_BUCKET)
          .createSignedUrl(row.image_path, SIGNED_URL_TTL_SECONDS);
        if (signed?.signedUrl) {
          coverUrlByRenderId.set(row.id, signed.signedUrl);
        }
      }),
    );
  }

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    clientName: p.client_name,
    address: p.address,
    status: p.status,
    coverRenderId: p.cover_render_id,
    coverUrl: coverUrlByRenderId.get(p.cover_render_id) ?? null,
    renderCount: countByProject.get(p.id) ?? 0,
    rooms: (p.visualizer_project_rooms ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order })),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
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
