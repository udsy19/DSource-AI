import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import { createClient } from "@/utils/supabase/server";
import { listRenders } from "@/utils/visualizer/persist";

const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true";

export async function GET() {
  if (DEV_BYPASS) {
    return NextResponse.json({
      renders: [],
      notice: "History is not saved in dev bypass mode.",
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
    const renders = await listRenders(supabase);
    return NextResponse.json({ renders });
  } catch (error) {
    // Degrade gracefully (e.g. migration not applied yet) — history is
    // optional, generation is not.
    console.error("Render history unavailable:", error.message);
    return NextResponse.json({
      renders: [],
      notice: "Render history is unavailable right now.",
    });
  }
}
