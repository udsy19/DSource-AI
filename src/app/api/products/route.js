import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../../utils/supabase/server";
import { requireVendor } from "../../../utils/api-auth";

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

export async function POST(request) {
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

  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const productName = sanitizeString(body.product_name);
  const productId = body.product_id != null ? Number(body.product_id) : null;

  if (!productName) {
    return NextResponse.json(
      { error: "product_name is required" },
      { status: 400 }
    );
  }
  if (productId == null || !Number.isFinite(productId)) {
    return NextResponse.json(
      { error: "product_id is required and must be a number" },
      { status: 400 }
    );
  }

  const product = {
    product_id: productId,
    product_material_depot_variant_handle: sanitizeString(
      body.product_material_depot_variant_handle
    ),
    product_name: productName,
    brand_name: sanitizeString(body.brand_name),
    category_name: sanitizeString(body.category_name),
    color: sanitizeString(body.color),
    color_code: sanitizeString(body.color_code),
    color_family: sanitizeString(body.color_family),
    sub_category: Array.isArray(body.sub_category)
      ? body.sub_category
      : parseArrayField(body.sub_category),
    series_name: sanitizeString(body.series_name),
    description: sanitizeString(body.description),
    application: Array.isArray(body.application)
      ? body.application
      : parseArrayField(body.application),
    thickness: sanitizeString(body.thickness),
    size: sanitizeString(body.size),
    tags: Array.isArray(body.tags) ? body.tags : parseArrayField(body.tags),
    image_url: sanitizeString(body.image_url),
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("scraped_product_list")
    .insert(product)
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A product with this product_id already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message ?? "Failed to create product" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
