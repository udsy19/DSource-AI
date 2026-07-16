import { NextResponse } from "next/server";
import {
  adminContext,
  adminError,
  emailsForIds,
  signPaths,
} from "@/utils/admin-api";

const PER_PAGE = 40;

// GET /api/admin/designs?userId=&page= — every generated design with a signed URL.
export async function GET(request) {
  try {
    const { supabase } = await adminContext();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );

    // Canonical render store is visualizer_renders (written by the generate-image
    // route via saveRender). Admin reads it with the service-role client.
    let query = supabase
      .from("visualizer_renders")
      .select(
        "id, created_by, created_at, prompt, composed_prompt, image_path, model",
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (userId) query = query.eq("created_by", userId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const [emailById, signed] = await Promise.all([
      emailsForIds(
        supabase,
        rows.map((d) => d.created_by),
      ),
      signPaths(
        supabase,
        "visualizer-renders",
        rows.map((d) => d.image_path),
      ),
    ]);

    const designs = rows.map((d) => ({
      id: d.id,
      user_id: d.created_by,
      created_at: d.created_at,
      prompt: d.prompt || d.composed_prompt,
      model: d.model,
      email: emailById[d.created_by] ?? null,
      url: signed[d.image_path] ?? null,
    }));

    return NextResponse.json({ designs, page });
  } catch (error) {
    return adminError(error);
  }
}
