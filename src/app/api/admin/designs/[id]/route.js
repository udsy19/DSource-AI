import { NextResponse } from "next/server";
import { adminContext, adminError, writeAudit } from "@/utils/admin-api";

// DELETE /api/admin/designs/[id] — soft-delete a generated design (moderation).
export async function DELETE(_request, { params }) {
  try {
    const { admin, supabase } = await adminContext();
    const { id } = await params;
    const { data, error } = await supabase
      .from("generated_designs")
      .update({ is_deleted: true })
      .eq("id", id)
      .select("id, user_id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }
    await writeAudit(supabase, admin.id, "delete_design", {
      targetUserId: data.user_id,
      targetType: "design",
      targetId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminError(error);
  }
}
