import { parse } from "csv-parse/sync";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { requireVendor } from "../../../../utils/api-auth";

const REQUIRED_COLUMNS = [
  "product_id",
  "product_material_depot_variant_handle",
  "product_name",
  "brand_name",
  "category_name",
  "color",
  "color_code",
  "color_family",
  "sub_category",
  "series_name",
  "description",
  "application",
  "thickness",
  "size",
  "tags",
  "image_url",
];

const MULTI_VALUE_COLUMNS = ["sub_category", "application", "tags"];

const sanitizeString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const parseMultiValue = (value) => {
  const raw = sanitizeString(value);
  if (!raw) return null;
  const entries = raw
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length ? entries : null;
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const transformRow = (row) => {
  const multiValueFields = Object.fromEntries(
    MULTI_VALUE_COLUMNS.map((column) => [column, parseMultiValue(row[column])])
  );

  return {
    product_id: toNumber(row.product_id),
    product_material_depot_variant_handle: sanitizeString(
      row.product_material_depot_variant_handle
    ),
    product_name: sanitizeString(row.product_name),
    brand_name: sanitizeString(row.brand_name),
    category_name: sanitizeString(row.category_name),
    color: sanitizeString(row.color),
    color_code: sanitizeString(row.color_code),
    color_family: sanitizeString(row.color_family),
    sub_category: multiValueFields.sub_category,
    series_name: sanitizeString(row.series_name),
    description: sanitizeString(row.description),
    application: multiValueFields.application,
    thickness: sanitizeString(row.thickness),
    size: sanitizeString(row.size),
    tags: multiValueFields.tags,
    image_url: sanitizeString(row.image_url),
  };
};

export async function POST(request) {
  try {
    // Require vendor role
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

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing CSV file." }, { status: 400 });
  }

  const csvText = await file.text();
  if (!csvText.trim()) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }

  let rows = [];
  try {
    rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "CSV parse error. Ensure the file uses commas and UTF-8." },
      { status: 400 }
    );
  }

  if (!rows.length) {
    return NextResponse.json(
      { error: "No data rows detected after the header." },
      { status: 400 }
    );
  }

  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !(column in rows[0])
  );
  if (missingColumns.length) {
    return NextResponse.json(
      {
        error: `Missing columns: ${missingColumns.join(
          ", "
        )}. Please re-download the template.`,
      },
      { status: 422 }
    );
  }

  const transformedRows = rows
    .map((row) => transformRow(row))
    .filter((row) => row.product_id && row.product_name)
    .map((row) => ({ ...row, created_by: user.id }));

  if (!transformedRows.length) {
    return NextResponse.json(
      { error: "Could not find any valid rows to import." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("scraped_product_list")
    .upsert(transformedRows, { onConflict: "product_id" })
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Failed to import CSV." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Import complete",
    inserted: data?.length ?? 0,
    totalRows: transformedRows.length,
  });
}
