import { NextResponse } from "next/server";
import { adminContext, adminError, emailsForIds } from "@/utils/admin-api";

const PER_PAGE = 100;

// GET /api/admin/ai-calls?route=&status=&userId=&page= — the complete log of
// EVERY model invocation (Gemini + Replicate), across all routes.
export async function GET(request) {
  try {
    const { supabase } = await adminContext();
    const { searchParams } = new URL(request.url);
    const route = searchParams.get("route");
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );

    let query = supabase
      .from("ai_calls")
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (route) query = query.eq("route", route);
    if (status) query = query.eq("status", status);
    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query;
    if (error) throw error;

    const emailById = await emailsForIds(
      supabase,
      (data ?? []).map((c) => c.user_id),
    );
    const calls = (data ?? []).map((c) => ({
      ...c,
      email: emailById[c.user_id] ?? null,
    }));

    return NextResponse.json({ calls, page });
  } catch (error) {
    return adminError(error);
  }
}
