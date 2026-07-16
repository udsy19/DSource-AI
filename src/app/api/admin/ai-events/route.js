import { NextResponse } from "next/server";
import { adminContext, adminError, emailsForIds } from "@/utils/admin-api";

const PER_PAGE = 50;

// GET /api/admin/ai-events?type=generation|analysis&status=&userId=&page=
export async function GET(request) {
  try {
    const { supabase } = await adminContext();
    const { searchParams } = new URL(request.url);
    const isAnalysis = searchParams.get("type") === "analysis";
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );
    const from = (page - 1) * PER_PAGE;
    const to = page * PER_PAGE - 1;

    let events = [];
    if (isAnalysis) {
      let query = supabase
        .from("ai_analysis_events")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (status) query = query.eq("status", status);
      if (userId) query = query.eq("user_id", userId);
      const { data, error } = await query;
      if (error) throw error;
      const emailById = await emailsForIds(
        supabase,
        (data ?? []).map((e) => e.user_id),
      );
      events = (data ?? []).map((e) => ({
        ...e,
        email: emailById[e.user_id] ?? null,
      }));
    } else if (status && status !== "success") {
      // visualizer_renders only stores successful renders.
      events = [];
    } else {
      let query = supabase
        .from("visualizer_renders")
        .select("id, created_by, created_at, prompt, composed_prompt, model")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (userId) query = query.eq("created_by", userId);
      const { data, error } = await query;
      if (error) throw error;
      const emailById = await emailsForIds(
        supabase,
        (data ?? []).map((e) => e.created_by),
      );
      events = (data ?? []).map((e) => ({
        id: e.id,
        user_id: e.created_by,
        created_at: e.created_at,
        prompt: e.prompt || e.composed_prompt,
        model: e.model,
        status: "success",
        latency_ms: null,
        email: emailById[e.created_by] ?? null,
      }));
    }

    return NextResponse.json({
      type: isAnalysis ? "analysis" : "generation",
      events,
      page,
    });
  } catch (error) {
    return adminError(error);
  }
}
