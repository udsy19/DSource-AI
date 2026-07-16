import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { checkRateLimit } from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import {
  MIGRATION_NOTICE,
  UUID_PATTERN,
  withCode,
} from "@/utils/visualizer/folios";
import { isMissingTableError } from "@/utils/visualizer/persist";

const RATE_LIMIT = { windowMs: 60_000, max: 30 };

const resolveProjectId = async (params) => {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;
  return id && UUID_PATTERN.test(id) ? id : null;
};

const validRoomName = (value) => {
  const name = typeof value === "string" ? value.trim() : "";
  return name && name.length <= 60 ? name : null;
};

const failure = (error, action) => {
  console.error(`Room ${action} failed:`, error.message);
  if (isMissingTableError(error)) {
    return NextResponse.json({ error: MIGRATION_NOTICE }, { status: 503 });
  }
  return NextResponse.json(
    { error: `Failed to ${action} the room.` },
    { status: 500 },
  );
};

/** POST /api/projects/[id]/rooms — add a room to the folio. */
export async function POST(request, { params }) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(`project-rooms:${user.id}`, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }

  const projectId = await resolveProjectId(params);
  if (!projectId) {
    return NextResponse.json({ error: "Invalid folio id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = validRoomName(body.name);
  if (!name) {
    return NextResponse.json(
      { error: "A room needs a name (60 characters max)." },
      { status: 400 },
    );
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // RLS hides folios the caller doesn't own — a miss here is a 404.
    const { data: project, error: projectError } = await supabase
      .from("visualizer_projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (projectError) throw withCode(projectError);
    if (!project) {
      return NextResponse.json({ error: "Folio not found" }, { status: 404 });
    }

    const { data: last, error: sortError } = await supabase
      .from("visualizer_project_rooms")
      .select("sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sortError) throw withCode(sortError);

    const { data: row, error } = await supabase
      .from("visualizer_project_rooms")
      .insert({
        project_id: projectId,
        name,
        sort_order: (last?.sort_order ?? -1) + 1,
      })
      .select("id, name, sort_order")
      .single();
    if (error) throw withCode(error);

    return NextResponse.json(
      { room: { id: row.id, name: row.name, sortOrder: row.sort_order } },
      { status: 201 },
    );
  } catch (error) {
    return failure(error, "add");
  }
}

/** PATCH /api/projects/[id]/rooms — rename a room ({ roomId, name }). */
export async function PATCH(request, { params }) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = await resolveProjectId(params);
  if (!projectId) {
    return NextResponse.json({ error: "Invalid folio id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.roomId || !UUID_PATTERN.test(body.roomId)) {
    return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
  }
  const name = validRoomName(body.name);
  if (!name) {
    return NextResponse.json(
      { error: "A room needs a name (60 characters max)." },
      { status: 400 },
    );
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { data: row, error } = await supabase
      .from("visualizer_project_rooms")
      .update({ name })
      .eq("id", body.roomId)
      .eq("project_id", projectId)
      .select("id, name, sort_order")
      .maybeSingle();
    if (error) throw withCode(error);
    if (!row) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({
      room: { id: row.id, name: row.name, sortOrder: row.sort_order },
    });
  } catch (error) {
    return failure(error, "rename");
  }
}

/**
 * DELETE /api/projects/[id]/rooms — remove a room ({ roomId }); its renders
 * stay in the folio, unfiled, via the FK's on delete set null.
 */
export async function DELETE(request, { params }) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = await resolveProjectId(params);
  if (!projectId) {
    return NextResponse.json({ error: "Invalid folio id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.roomId || !UUID_PATTERN.test(body.roomId)) {
    return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { data: row, error } = await supabase
      .from("visualizer_project_rooms")
      .delete()
      .eq("id", body.roomId)
      .eq("project_id", projectId)
      .select("id")
      .maybeSingle();
    if (error) throw withCode(error);
    if (!row) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failure(error, "remove");
  }
}
