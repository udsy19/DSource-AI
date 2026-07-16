import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { checkRateLimit } from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import {
  isUndefinedTable,
  isUuid,
  itemRowToClient,
  MAX_BOARD_NAME_LENGTH,
  sanitizePalette,
} from "@/utils/visualizer/boards";
import { ASPECT_RATIOS } from "@/utils/visualizer/params";
import {
  RENDERS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/utils/visualizer/persist";

const RATE_LIMIT = { windowMs: 60_000, max: 120 };
const ASPECTS = ASPECT_RATIOS.map((a) => a.value);

/** Shared prologue: auth, rate limit, id validation, supabase client. */
const openRequest = async (params) => {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const limit = checkRateLimit(`boards:${user.id}`, RATE_LIMIT);
  if (!limit.allowed) {
    return {
      response: NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 },
      ),
    };
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;
  if (!isUuid(id)) {
    return {
      response: NextResponse.json(
        { error: "Invalid board id" },
        { status: 400 },
      ),
    };
  }

  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  return { user, id, supabase };
};

export async function GET(_request, { params }) {
  const ctx = await openRequest(params);
  if (ctx.response) return ctx.response;
  const { id, supabase } = ctx;

  try {
    const { data: row, error } = await supabase
      .from("visualizer_boards")
      .select("id, name, aspect, palette, project_id, cover_path, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (isUndefinedTable(error)) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 });
      }
      throw new Error(error.message);
    }
    if (!row) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const { data: itemRows, error: itemsError } = await supabase
      .from("visualizer_board_items")
      .select(
        "id, kind, product_id, image_url, x, y, w, h, rotation, z, caption, props",
      )
      .eq("board_id", id)
      .order("z", { ascending: true });
    if (itemsError) throw new Error(itemsError.message);

    let coverUrl = null;
    if (row.cover_path) {
      const { data: signed } = await supabase.storage
        .from(RENDERS_BUCKET)
        .createSignedUrl(row.cover_path, SIGNED_URL_TTL_SECONDS);
      coverUrl = signed?.signedUrl ?? null;
    }

    return NextResponse.json({
      board: {
        id: row.id,
        name: row.name,
        aspect: row.aspect,
        palette: row.palette ?? null,
        projectId: row.project_id,
        coverUrl,
        updatedAt: row.updated_at,
      },
      items: (itemRows ?? []).map(itemRowToClient),
    });
  } catch (error) {
    console.error("Board fetch failed:", error.message);
    return NextResponse.json(
      { error: "Failed to load board." },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  const ctx = await openRequest(params);
  if (ctx.response) return ctx.response;
  const { user, id, supabase } = ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Invalid board name." },
        { status: 400 },
      );
    }
    patch.name = body.name.trim().slice(0, MAX_BOARD_NAME_LENGTH);
  }
  if (body.aspect !== undefined) {
    if (!ASPECTS.includes(body.aspect)) {
      return NextResponse.json({ error: "Invalid aspect." }, { status: 400 });
    }
    patch.aspect = body.aspect;
  }
  if (body.palette !== undefined) {
    if (body.palette === null) {
      patch.palette = null;
    } else {
      const palette = sanitizePalette(body.palette);
      if (!palette) {
        return NextResponse.json(
          { error: "Invalid palette." },
          { status: 400 },
        );
      }
      patch.palette = palette;
    }
  }
  if (body.projectId !== undefined) {
    if (body.projectId !== null && !isUuid(body.projectId)) {
      return NextResponse.json(
        { error: "Invalid project id." },
        { status: 400 },
      );
    }
    patch.project_id = body.projectId;
  }
  // Cover comes from a persisted render: the client sends the render id and
  // the server resolves the storage path itself (never a client-supplied
  // path). RLS scopes the lookup to the caller's own renders.
  if (body.coverRenderId !== undefined) {
    if (!isUuid(body.coverRenderId)) {
      return NextResponse.json(
        { error: "Invalid cover render id." },
        { status: 400 },
      );
    }
    const { data: render } = await supabase
      .from("visualizer_renders")
      .select("image_path")
      .eq("id", body.coverRenderId)
      .eq("created_by", user.id)
      .maybeSingle();
    if (!render) {
      return NextResponse.json(
        { error: "That render is not available as a cover yet." },
        { status: 404 },
      );
    }
    patch.cover_path = render.image_path;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  try {
    const { data: row, error } = await supabase
      .from("visualizer_boards")
      .update(patch)
      .eq("id", id)
      .select("id, name, aspect, palette, project_id, updated_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    return NextResponse.json({
      board: {
        id: row.id,
        name: row.name,
        aspect: row.aspect,
        palette: row.palette ?? null,
        projectId: row.project_id,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error("Board update failed:", error.message);
    return NextResponse.json(
      { error: "Failed to update board." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  const ctx = await openRequest(params);
  if (ctx.response) return ctx.response;
  const { id, supabase } = ctx;

  try {
    const { data: row, error } = await supabase
      .from("visualizer_boards")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Board delete failed:", error.message);
    return NextResponse.json(
      { error: "Failed to delete board." },
      { status: 500 },
    );
  }
}
