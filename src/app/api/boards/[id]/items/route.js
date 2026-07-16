import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { checkRateLimit } from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import {
  isUuid,
  itemRowToClient,
  MAX_BOARD_ITEMS,
  sanitizeBoardItem,
} from "@/utils/visualizer/boards";

// Autosave fires on a debounce, so this endpoint sees steady traffic.
const RATE_LIMIT = { windowMs: 60_000, max: 120 };

/**
 * PUT /api/boards/[id]/items — bulk item sync for autosave.
 * Body: { items: [...], deletedIds: [...] }. Upserts every sent item,
 * deletes the listed ids, and bumps the board's updated_at, all in one call.
 */
export async function PUT(request, { params }) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(`board-items:${user.id}`, RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const { id: boardId } = resolvedParams;
  if (!isUuid(boardId)) {
    return NextResponse.json({ error: "Invalid board id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const deletedIds = Array.isArray(body.deletedIds) ? body.deletedIds : [];
  if (items.length > MAX_BOARD_ITEMS) {
    return NextResponse.json(
      { error: `A board holds at most ${MAX_BOARD_ITEMS} items.` },
      { status: 400 },
    );
  }
  if (!deletedIds.every(isUuid)) {
    return NextResponse.json(
      { error: "Invalid deleted ids." },
      { status: 400 },
    );
  }

  const rows = [];
  for (let i = 0; i < items.length; i += 1) {
    const { row, error } = sanitizeBoardItem(items[i], i);
    if (error) return NextResponse.json({ error }, { status: 400 });
    rows.push({ ...row, board_id: boardId });
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Ownership check (RLS also enforces it, but this gives a clean 404
    // instead of a silent no-op) and the updated_at bump in one statement.
    const { data: board, error: boardError } = await supabase
      .from("visualizer_boards")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", boardId)
      .select("id")
      .maybeSingle();
    if (boardError) throw new Error(boardError.message);
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (deletedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("visualizer_board_items")
        .delete()
        .eq("board_id", boardId)
        .in("id", deletedIds);
      if (deleteError) throw new Error(deleteError.message);
    }

    let saved = [];
    if (rows.length > 0) {
      const { data: upserted, error: upsertError } = await supabase
        .from("visualizer_board_items")
        .upsert(rows, { onConflict: "id" })
        .select(
          "id, kind, product_id, image_url, x, y, w, h, rotation, z, caption, props",
        );
      if (upsertError) throw new Error(upsertError.message);
      saved = (upserted ?? []).sort((a, b) => a.z - b.z).map(itemRowToClient);
    }

    return NextResponse.json({ items: saved });
  } catch (error) {
    console.error("Board items sync failed:", error.message);
    return NextResponse.json(
      { error: "Failed to save board items." },
      { status: 500 },
    );
  }
}
