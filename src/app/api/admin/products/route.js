import { NextResponse } from "next/server";
import { adminContext, adminError, emailsForIds } from "@/utils/admin-api";

const PER_PAGE = 50;

// GET /api/admin/products?vendorId=&q=&page= — all vendor products across the platform.
export async function GET(request) {
  try {
    const { supabase } = await adminContext();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );

    let query = supabase
      .from("scraped_product_list")
      .select(
        "id, product_id, product_name, brand_name, category_name, image_url, is_active, created_by, created_at",
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (vendorId) query = query.eq("created_by", vendorId);
    if (q) query = query.ilike("product_name", `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    const emailById = await emailsForIds(
      supabase,
      (data ?? []).map((p) => p.created_by),
    );
    const products = (data ?? []).map((p) => ({
      ...p,
      vendor_email: emailById[p.created_by] ?? null,
    }));

    return NextResponse.json({ products, page });
  } catch (error) {
    return adminError(error);
  }
}
