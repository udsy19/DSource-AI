import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { createClient } from "@/utils/supabase/server";
import {
  MIGRATION_NOTICE,
  UUID_PATTERN,
  withCode,
} from "@/utils/visualizer/folios";
import { deleteRender, isMissingTableError } from "@/utils/visualizer/persist";

const isMissingFolioSchema = (error) =>
  isMissingTableError(error) ||
  error?.code === "42703" ||
  /column .* does not exist/i.test(error?.message ?? "");

const resolveId = async (params) => {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;
  return id && UUID_PATTERN.test(id) ? id : null;
};

/**
 * PATCH /api/renders/[id] — folio filing and flags:
 * { projectId?: uuid|null, roomId?: uuid|null, isFavorite?: bool, archived?: bool }.
 * Runs under the caller's client so RLS scopes every read/write to the owner.
 */
export async function PATCH(request, { params }) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await resolveId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid render id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update = {};
  if ("isFavorite" in body) {
    if (typeof body.isFavorite !== "boolean") {
      return NextResponse.json(
        { error: "Invalid isFavorite" },
        { status: 400 },
      );
    }
    update.is_favorite = body.isFavorite;
  }
  if ("archived" in body) {
    if (typeof body.archived !== "boolean") {
      return NextResponse.json({ error: "Invalid archived" }, { status: 400 });
    }
    update.archived_at = body.archived ? new Date().toISOString() : null;
  }
  const hasProjectId = "projectId" in body;
  const hasRoomId = "roomId" in body;
  if (
    hasProjectId &&
    body.projectId !== null &&
    !UUID_PATTERN.test(body.projectId)
  ) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }
  if (hasRoomId && body.roomId !== null && !UUID_PATTERN.test(body.roomId)) {
    return NextResponse.json({ error: "Invalid roomId" }, { status: 400 });
  }
  if (Object.keys(update).length === 0 && !hasProjectId && !hasRoomId) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    if (hasProjectId) {
      if (body.projectId === null) {
        // Back to the studio floor — a render can't keep a room without a folio.
        update.project_id = null;
        update.room_id = null;
      } else {
        // RLS hides folios the caller doesn't own — a miss here is a 404.
        const { data: project, error } = await supabase
          .from("visualizer_projects")
          .select("id")
          .eq("id", body.projectId)
          .maybeSingle();
        if (error) throw withCode(error);
        if (!project) {
          return NextResponse.json(
            { error: "Folio not found" },
            { status: 404 },
          );
        }
        update.project_id = body.projectId;
        // Filing into a different folio invalidates any previous room unless
        // the same request sets one.
        if (!hasRoomId) update.room_id = null;
      }
    }
    if (hasRoomId) {
      if (body.roomId === null) {
        update.room_id = null;
      } else if (update.project_id !== null) {
        const { data: room, error } = await supabase
          .from("visualizer_project_rooms")
          .select("id, project_id")
          .eq("id", body.roomId)
          .maybeSingle();
        if (error) throw withCode(error);
        if (!room) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 },
          );
        }
        if (update.project_id && room.project_id !== update.project_id) {
          return NextResponse.json(
            { error: "Room belongs to a different folio" },
            { status: 400 },
          );
        }
        // Filing into a room implies filing into its folio.
        update.room_id = room.id;
        update.project_id = room.project_id;
      }
    }

    const { data: row, error } = await supabase
      .from("visualizer_renders")
      .update(update)
      .eq("id", id)
      .select("id, project_id, room_id, is_favorite, archived_at")
      .maybeSingle();
    if (error) throw withCode(error);
    if (!row) {
      return NextResponse.json({ error: "Render not found" }, { status: 404 });
    }

    return NextResponse.json({
      render: {
        id: row.id,
        projectId: row.project_id,
        roomId: row.room_id,
        isFavorite: Boolean(row.is_favorite),
        archived: Boolean(row.archived_at),
      },
    });
  } catch (error) {
    console.error("Render update failed:", error.message);
    if (isMissingFolioSchema(error)) {
      return NextResponse.json({ error: MIGRATION_NOTICE }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Failed to update render" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await resolveId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid render id" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const deleted = await deleteRender(supabase, id);
    if (!deleted) {
      return NextResponse.json({ error: "Render not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Render delete failed:", error.message);
    return NextResponse.json(
      { error: "Failed to delete render" },
      { status: 500 },
    );
  }
}
