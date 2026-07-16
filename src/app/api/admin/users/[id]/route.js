import { NextResponse } from "next/server";
import {
  adminContext,
  adminError,
  signPaths,
  writeAudit,
} from "@/utils/admin-api";

// GET /api/admin/users/[id] — full record: profile + AI events + designs + activity + products.
export async function GET(_request, { params }) {
  try {
    const { supabase } = await adminContext();
    const { id } = await params;

    const { data: authData, error } = await supabase.auth.admin.getUserById(id);
    if (error || !authData?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const u = authData.user;

    const [profile, gen, ana, designs, activity, products] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("visualizer_renders")
        .select("id, created_by, created_at, prompt, composed_prompt, model")
        .eq("created_by", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("ai_analysis_events")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("visualizer_renders")
        .select(
          "id, created_by, created_at, prompt, composed_prompt, image_path",
        )
        .eq("created_by", id)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("activity_events")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("scraped_product_list")
        .select("id, product_id, product_name, category_name, created_at")
        .eq("created_by", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const designRows = designs.data ?? [];
    const signed = await signPaths(
      supabase,
      "visualizer-renders",
      designRows.map((d) => d.image_path),
    );

    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed: !!u.email_confirmed_at,
        banned_until: u.banned_until ?? null,
        role: u.app_metadata?.user_type || profile.data?.role || "user",
        app_metadata: u.app_metadata ?? {},
      },
      profile: profile.data ?? null,
      generationEvents: (gen.data ?? []).map((r) => ({
        id: r.id,
        prompt: r.prompt || r.composed_prompt,
        model: r.model,
        status: "success",
        latency_ms: null,
        created_at: r.created_at,
      })),
      analysisEvents: ana.data ?? [],
      designs: designRows.map((d) => ({
        id: d.id,
        prompt: d.prompt || d.composed_prompt,
        created_at: d.created_at,
        url: signed[d.image_path] ?? null,
      })),
      activity: activity.data ?? [],
      products: products.data ?? [],
    });
  } catch (error) {
    return adminError(error);
  }
}

// DELETE /api/admin/users/[id] — remove a user (cascades to their data).
export async function DELETE(_request, { params }) {
  try {
    const { admin, supabase } = await adminContext();
    const { id } = await params;
    if (id === admin.id) {
      return NextResponse.json(
        { error: "You can't delete your own account." },
        { status: 400 },
      );
    }
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    await writeAudit(supabase, admin.id, "delete_user", {
      targetUserId: id,
      targetType: "user",
      targetId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminError(error);
  }
}
