import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { checkRateLimit } from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import {
  isUndefinedTable,
  isUuid,
  MAX_BOARD_NAME_LENGTH,
} from "@/utils/visualizer/boards";
import { ASPECT_RATIOS } from "@/utils/visualizer/params";
import {
  RENDERS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/utils/visualizer/persist";

const RATE_LIMIT = { windowMs: 60_000, max: 60 };
const ASPECTS = ASPECT_RATIOS.map((a) => a.value);

const NOT_PROVISIONED = {
  boards: [],
  notice: "Boards storage is not provisioned yet.",
};

export async function GET(request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional folio filter: ?project=<uuid> lists one folio's boards.
  const projectParam = request.nextUrl.searchParams.get("project");
  if (projectParam && !isUuid(projectParam)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const limit = checkRateLimit(`boards:${user.id}`, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    let query = supabase
      .from("visualizer_boards")
      .select("id, name, aspect, palette, project_id, updated_at, cover_path")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (projectParam) {
      query = query.eq("project_id", projectParam);
    }
    const { data: rows, error } = await query;
    if (error) {
      if (isUndefinedTable(error)) return NextResponse.json(NOT_PROVISIONED);
      throw new Error(error.message);
    }

    // Item counts in one query rather than N.
    const ids = (rows ?? []).map((r) => r.id);
    const counts = new Map();
    if (ids.length > 0) {
      const { data: itemRows } = await supabase
        .from("visualizer_board_items")
        .select("board_id")
        .in("board_id", ids);
      for (const item of itemRows ?? []) {
        counts.set(item.board_id, (counts.get(item.board_id) ?? 0) + 1);
      }
    }

    const boards = await Promise.all(
      (rows ?? []).map(async (row) => {
        let coverUrl = null;
        if (row.cover_path) {
          const { data: signed } = await supabase.storage
            .from(RENDERS_BUCKET)
            .createSignedUrl(row.cover_path, SIGNED_URL_TTL_SECONDS);
          coverUrl = signed?.signedUrl ?? null;
        }
        return {
          id: row.id,
          name: row.name,
          aspect: row.aspect,
          palette: row.palette ?? null,
          projectId: row.project_id ?? null,
          updatedAt: row.updated_at,
          coverUrl,
          itemCount: counts.get(row.id) ?? 0,
        };
      }),
    );

    return NextResponse.json({ boards });
  } catch (error) {
    console.error("Boards list failed:", error.message);
    return NextResponse.json(NOT_PROVISIONED);
  }
}

export async function POST(request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(`boards:${user.id}`, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, MAX_BOARD_NAME_LENGTH)
      : "Untitled board";
  const aspect = ASPECTS.includes(body.aspect) ? body.aspect : "4:3";
  if (
    body.projectId !== undefined &&
    body.projectId !== null &&
    !isUuid(body.projectId)
  ) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { data: row, error } = await supabase
      .from("visualizer_boards")
      .insert({
        created_by: user.id,
        name,
        aspect,
        project_id: body.projectId ?? null,
      })
      .select("id, name, aspect, palette, project_id, updated_at")
      .single();
    if (error) {
      if (isUndefinedTable(error)) {
        return NextResponse.json(
          { error: "Boards storage is not provisioned yet." },
          { status: 503 },
        );
      }
      throw new Error(error.message);
    }
    return NextResponse.json(
      {
        board: {
          id: row.id,
          name: row.name,
          aspect: row.aspect,
          palette: row.palette ?? null,
          projectId: row.project_id ?? null,
          updatedAt: row.updated_at,
          coverUrl: null,
          itemCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Board create failed:", error.message);
    return NextResponse.json(
      { error: "Failed to create board." },
      { status: 500 },
    );
  }
}
