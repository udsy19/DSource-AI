import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { createClient } from "@/utils/supabase/server";
import {
  MIGRATION_NOTICE,
  optionalText,
  UUID_PATTERN,
  withCode,
} from "@/utils/visualizer/folios";
import { isMissingTableError } from "@/utils/visualizer/persist";

const STATUSES = ["active", "archived"];

const resolveId = async (params) => {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;
  return id && UUID_PATTERN.test(id) ? id : null;
};

/** PATCH /api/projects/[id] — edit name/meta, status, or the cover render. */
export async function PATCH(request, { params }) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await resolveId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid folio id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update = {};
  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 80) {
      return NextResponse.json(
        { error: "A folio needs a name (80 characters max)." },
        { status: 400 },
      );
    }
    update.name = name;
  }
  if ("clientName" in body) {
    const clientName = optionalText(body.clientName, 120);
    if (!clientName.ok) {
      return NextResponse.json(
        { error: "Client must be short text." },
        { status: 400 },
      );
    }
    update.client_name = clientName.value;
  }
  if ("address" in body) {
    const address = optionalText(body.address, 160);
    if (!address.ok) {
      return NextResponse.json(
        { error: "Address must be short text." },
        { status: 400 },
      );
    }
    update.address = address.value;
  }
  if ("status" in body) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if ("coverRenderId" in body) {
    if (body.coverRenderId !== null && !UUID_PATTERN.test(body.coverRenderId)) {
      return NextResponse.json(
        { error: "Invalid cover render id" },
        { status: 400 },
      );
    }
    update.cover_render_id = body.coverRenderId;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // The FK alone doesn't stop filing a foreign render as cover — confirm
    // the render is visible to this user (RLS = owned) before assigning.
    if (update.cover_render_id) {
      const { data: render, error } = await supabase
        .from("visualizer_renders")
        .select("id")
        .eq("id", update.cover_render_id)
        .maybeSingle();
      if (error) throw withCode(error);
      if (!render) {
        return NextResponse.json(
          { error: "Cover render not found" },
          { status: 404 },
        );
      }
    }

    const { data: row, error } = await supabase
      .from("visualizer_projects")
      .update(update)
      .eq("id", id)
      .select(
        "id, name, client_name, address, status, cover_render_id, updated_at",
      )
      .maybeSingle();
    if (error) throw withCode(error);
    if (!row) {
      return NextResponse.json({ error: "Folio not found" }, { status: 404 });
    }

    return NextResponse.json({
      project: {
        id: row.id,
        name: row.name,
        clientName: row.client_name,
        address: row.address,
        status: row.status,
        coverRenderId: row.cover_render_id,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error("Folio update failed:", error.message);
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: MIGRATION_NOTICE }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Failed to update the folio." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[id] — removes the folio and its rooms; renders
 * return to the studio floor via the FK's on delete set null.
 */
export async function DELETE(_request, { params }) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await resolveId(params);
  if (!id) {
    return NextResponse.json({ error: "Invalid folio id" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { data: row, error } = await supabase
      .from("visualizer_projects")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw withCode(error);
    if (!row) {
      return NextResponse.json({ error: "Folio not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Folio delete failed:", error.message);
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: MIGRATION_NOTICE }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Failed to delete the folio." },
      { status: 500 },
    );
  }
}
