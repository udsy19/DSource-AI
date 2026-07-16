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

    let query = supabase
      .from("generated_designs")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const [emailById, signed] = await Promise.all([
      emailsForIds(
        supabase,
        rows.map((d) => d.user_id),
      ),
      signPaths(
        supabase,
        "generated-designs",
        rows.map((d) => d.storage_path),
      ),
    ]);

    const designs = rows.map((d) => ({
      ...d,
      email: emailById[d.user_id] ?? null,
      url: signed[d.storage_path] ?? null,
    }));

    return NextResponse.json({ designs, page });
  } catch (error) {
    return adminError(error);
  }
}
