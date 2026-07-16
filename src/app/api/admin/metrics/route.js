import { NextResponse } from "next/server";
import { adminContext, adminError } from "@/utils/admin-api";

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const DAY = 86400000;

// GET /api/admin/metrics — overview KPIs for the dashboard.
export async function GET() {
  try {
    const { supabase } = await adminContext();
    const count = (table, apply) => {
      let q = supabase.from(table).select("id", { count: "exact", head: true });
      if (apply) q = apply(q);
      return q;
    };

    const [
      totalUsers,
      vendors,
      admins,
      banned,
      gensTotal,
      gens7d,
      genErrors,
      analysesTotal,
      designsTotal,
      activity24h,
    ] = await Promise.all([
      count("profiles"),
      count("profiles", (q) => q.eq("role", "vendor")),
      count("profiles", (q) => q.eq("role", "admin")),
      count("profiles", (q) => q.eq("banned", true)),
      count("visualizer_renders"),
      count("visualizer_renders", (q) => q.gte("created_at", iso(7 * DAY))),
      // visualizer_renders only stores successful renders (errors aren't saved).
      count("ai_generation_events", (q) => q.neq("status", "success")),
      count("ai_analysis_events"),
      count("visualizer_renders"),
      count("activity_events", (q) => q.gte("created_at", iso(DAY))),
    ]);

    const n = (r) => r.count ?? 0;
    return NextResponse.json({
      users: {
        total: n(totalUsers),
        vendors: n(vendors),
        admins: n(admins),
        clients: Math.max(0, n(totalUsers) - n(vendors) - n(admins)),
        banned: n(banned),
      },
      ai: {
        generationsTotal: n(gensTotal),
        generationsLast7d: n(gens7d),
        generationErrors: n(genErrors),
        analysesTotal: n(analysesTotal),
        designsTotal: n(designsTotal),
      },
      activityLast24h: n(activity24h),
    });
  } catch (error) {
    return adminError(error);
  }
}
