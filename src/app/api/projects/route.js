import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { checkRateLimit } from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import {
  MIGRATION_NOTICE,
  optionalText,
  withCode,
} from "@/utils/visualizer/folios";
import { isMissingTableError, listProjects } from "@/utils/visualizer/persist";

const RATE_LIMIT = { windowMs: 60_000, max: 20 };

const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

export async function GET() {
  if (DEV_BYPASS) {
    return NextResponse.json({
      projects: [],
      notice: "Folios are not saved in dev bypass mode.",
    });
  }

  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const projects = await listProjects(supabase);
    return NextResponse.json({ projects });
  } catch (error) {
    // Degrade gracefully — a missing table (pre-migration) or transient
    // failure must never 500 the folio index.
    console.error("Folio list unavailable:", error.message);
    return NextResponse.json({
      projects: [],
      notice: isMissingTableError(error)
        ? MIGRATION_NOTICE
        : "Folios are unavailable right now.",
    });
  }
}

export async function POST(request) {
  if (DEV_BYPASS) {
    return NextResponse.json(
      { error: "Folios are not saved in dev bypass mode." },
      { status: 503 },
    );
  }

  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(`projects:${user.id}`, RATE_LIMIT);
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json(
      { error: "A folio needs a name (80 characters max)." },
      { status: 400 },
    );
  }
  const clientName = optionalText(body.clientName, 120);
  const address = optionalText(body.address, 160);
  if (!clientName.ok || !address.ok) {
    return NextResponse.json(
      { error: "Client and address must be short text." },
      { status: 400 },
    );
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { data: row, error } = await supabase
      .from("visualizer_projects")
      .insert({
        created_by: user.id,
        name,
        client_name: clientName.value,
        address: address.value,
      })
      .select("id, name, client_name, address, status, created_at, updated_at")
      .single();
    if (error) throw withCode(error);

    return NextResponse.json(
      {
        project: {
          id: row.id,
          name: row.name,
          clientName: row.client_name,
          address: row.address,
          status: row.status,
          coverRenderId: null,
          coverUrl: null,
          renderCount: 0,
          rooms: [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Folio create failed:", error.message);
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: MIGRATION_NOTICE }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Failed to create the folio." },
      { status: 500 },
    );
  }
}
