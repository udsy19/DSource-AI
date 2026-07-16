import { NextResponse } from "next/server";
import { adminContext, adminError, writeAudit } from "@/utils/admin-api";

// DELETE /api/admin/designs/[id] — remove a render (moderation): deletes the
// visualizer_renders row and its Storage object.
export async function DELETE(_request, { params }) {
  try {
    const { admin, supabase } = await adminContext();
    const { id } = await params;
    const { data, error } = await supabase
      .from("visualizer_renders")
      .delete()
      .eq("id", id)
      .select("id, created_by, image_path")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }
    if (data.image_path) {
      await supabase.storage
        .from("visualizer-renders")
        .remove([data.image_path]);
    }
    await writeAudit(supabase, admin.id, "delete_design", {
      targetUserId: data.created_by,
      targetType: "design",
      targetId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminError(error);
  }
}
