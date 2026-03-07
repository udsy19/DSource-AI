import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from "next/headers";
import { requireVendor } from "../../../../utils/api-auth";

const sanitizeString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const parseArrayField = (value) => {
  const raw = sanitizeString(value);
  if (!raw) return null;
  const entries = raw
    .split(/[,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length ? entries : null;
};

async function getSupabaseAndUser() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { supabase: null, user: null, error: "Unauthorized" };
  }
  return { supabase, user, error: null };
}

export async function GET(request, { params }) {
  try {
    // Handle params (might be async in some Next.js versions)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;
    
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const numericId = isNaN(Number(id)) ? null : Number(id);
    
    let query = supabase
      .from("scraped_product_list")
      .select("*")
      .eq("created_by", user.id);
    
    if (numericId !== null) {
      query = query.or(`id.eq.${numericId},product_id.eq.${id}`);
    } else {
      query = query.eq("product_id", id);
    }
    
    query = query.limit(1);

    const { data: products, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch product from database", details: error.message },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const product = products[0];

    let relatedProducts = [];
    if (product.series_name) {
      const { data: related, error: relatedError } = await supabase
        .from("scraped_product_list")
        .select("id, color, color_code, image_url, product_name, product_id")
        .eq("created_by", user.id)
        .eq("series_name", product.series_name)
        .neq("id", product.id)
        .limit(20);
      
      if (!relatedError && related) {
        relatedProducts = related;
      }
    }

    return NextResponse.json(
      { 
        product,
        relatedProducts: relatedProducts || []
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to get product", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireVendor();
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden") || error.message.includes("Vendor")) {
      return NextResponse.json(
        { error: "Forbidden: Vendor access required" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    );
  }

  const { supabase, user, error: authError } = await getSupabaseAndUser();
  if (authError || !supabase || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const updates = {};
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (body.product_name !== undefined) updates.product_name = sanitizeString(body.product_name);
  if (body.product_id !== undefined) {
    const pid = Number(body.product_id);
    if (Number.isFinite(pid)) updates.product_id = pid;
  }
  if (body.product_material_depot_variant_handle !== undefined) updates.product_material_depot_variant_handle = sanitizeString(body.product_material_depot_variant_handle);
  if (body.brand_name !== undefined) updates.brand_name = sanitizeString(body.brand_name);
  if (body.category_name !== undefined) updates.category_name = sanitizeString(body.category_name);
  if (body.color !== undefined) updates.color = sanitizeString(body.color);
  if (body.color_code !== undefined) updates.color_code = sanitizeString(body.color_code);
  if (body.color_family !== undefined) updates.color_family = sanitizeString(body.color_family);
  if (body.sub_category !== undefined) updates.sub_category = Array.isArray(body.sub_category) ? body.sub_category : parseArrayField(body.sub_category);
  if (body.series_name !== undefined) updates.series_name = sanitizeString(body.series_name);
  if (body.description !== undefined) updates.description = sanitizeString(body.description);
  if (body.application !== undefined) updates.application = Array.isArray(body.application) ? body.application : parseArrayField(body.application);
  if (body.thickness !== undefined) updates.thickness = sanitizeString(body.thickness);
  if (body.size !== undefined) updates.size = sanitizeString(body.size);
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : parseArrayField(body.tags);
  if (body.image_url !== undefined) updates.image_url = sanitizeString(body.image_url);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("scraped_product_list")
    .update(updates)
    .eq("id", numericId)
    .eq("created_by", user.id)
    .select()
    .single();

  if (error) {
    console.error("Supabase update error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to update product" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data, { status: 200 });
}

export async function DELETE(request, { params }) {
  try {
    await requireVendor();
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden") || error.message.includes("Vendor")) {
      return NextResponse.json(
        { error: "Forbidden: Vendor access required" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    );
  }

  const { supabase, user, error: authError } = await getSupabaseAndUser();
  if (authError || !supabase || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("scraped_product_list")
    .delete()
    .eq("id", numericId)
    .eq("created_by", user.id)
    .select("id")
    .single();

  if (error) {
    console.error("Supabase delete error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to delete product" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    );
  }

  return new NextResponse(null, { status: 204 });
}

