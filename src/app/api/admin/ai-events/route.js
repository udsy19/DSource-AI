import { NextResponse } from "next/server";
import { adminContext, adminError, emailsForIds } from "@/utils/admin-api";

const PER_PAGE = 50;

// GET /api/admin/ai-events?type=generation|analysis&status=&userId=&page=
export async function GET(request) {
  try {
    const { supabase } = await adminContext();
    const { searchParams } = new URL(request.url);
    const table =
      searchParams.get("type") === "analysis"
        ? "ai_analysis_events"
        : "ai_generation_events";
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );

    let query = supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (status) query = query.eq("status", status);
    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query;
    if (error) throw error;

    const emailById = await emailsForIds(
      supabase,
      (data ?? []).map((e) => e.user_id),
    );
    const events = (data ?? []).map((e) => ({
      ...e,
      email: emailById[e.user_id] ?? null,
    }));

    return NextResponse.json({ type: table, events, page });
  } catch (error) {
    return adminError(error);
  }
}
