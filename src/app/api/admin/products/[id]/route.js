import { NextResponse } from "next/server";
import { adminContext, adminError, writeAudit } from "@/utils/admin-api";

// PATCH /api/admin/products/[id]  { is_active } — moderate (deactivate/reactivate).
export async function PATCH(request, { params }) {
  try {
    const { admin, supabase } = await adminContext();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json(
        { error: "is_active (boolean) required" },
        { status: 400 },
      );
    }
    const { data, error } = await supabase
      .from("scraped_product_list")
      .update({ is_active: body.is_active })
      .eq("id", id)
      .select("id, created_by")
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    await writeAudit(supabase, admin.id, "moderate_product", {
      targetUserId: data.created_by,
      targetType: "product",
      targetId: id,
      after: { is_active: body.is_active },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminError(error);
  }
}

// DELETE /api/admin/products/[id] — remove a product (moderation).
export async function DELETE(_request, { params }) {
  try {
    const { admin, supabase } = await adminContext();
    const { id } = await params;
    const { data, error } = await supabase
      .from("scraped_product_list")
      .delete()
      .eq("id", id)
      .select("id, created_by")
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    await writeAudit(supabase, admin.id, "delete_product", {
      targetUserId: data.created_by,
      targetType: "product",
      targetId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminError(error);
  }
}
