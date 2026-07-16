import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { createClient } from "@/utils/supabase/server";
import { deleteRender } from "@/utils/visualizer/persist";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request, { params }) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;
  if (!id || !UUID_PATTERN.test(id)) {
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
