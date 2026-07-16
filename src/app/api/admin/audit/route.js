import { NextResponse } from "next/server";
import { adminContext, adminError, emailsForIds } from "@/utils/admin-api";

const PER_PAGE = 100;

// GET /api/admin/audit?page= — the admin action audit trail.
export async function GET(request) {
  try {
    const { supabase } = await adminContext();
    const { searchParams } = new URL(request.url);
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );

    const { data, error } = await supabase
      .from("admin_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (error) throw error;

    const rows = data ?? [];
    const emailById = await emailsForIds(supabase, [
      ...rows.map((r) => r.admin_id),
      ...rows.map((r) => r.target_user_id),
    ]);
    const entries = rows.map((r) => ({
      ...r,
      admin_email: emailById[r.admin_id] ?? null,
      target_email: emailById[r.target_user_id] ?? null,
    }));

    return NextResponse.json({ entries, page });
  } catch (error) {
    return adminError(error);
  }
}
