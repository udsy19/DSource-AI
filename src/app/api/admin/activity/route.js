import { NextResponse } from "next/server";
import { adminContext, adminError, emailsForIds } from "@/utils/admin-api";

const PER_PAGE = 100;

// GET /api/admin/activity?userId=&eventType=&page= — global activity stream.
export async function GET(request) {
  try {
    const { supabase } = await adminContext();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const eventType = searchParams.get("eventType");
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );

    let query = supabase
      .from("activity_events")
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (userId) query = query.eq("user_id", userId);
    if (eventType) query = query.eq("event_type", eventType);

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

    return NextResponse.json({ events, page });
  } catch (error) {
    return adminError(error);
  }
}
