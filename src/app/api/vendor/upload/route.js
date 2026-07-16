import { parse } from "csv-parse/sync";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireVendor } from "@/utils/api-auth";
import {
  parseMultiValue,
  sanitizeString,
  toNumber,
} from "@/utils/product-normalize";
import { createClient } from "@/utils/supabase/server";

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5000;
const UPSERT_CHUNK_SIZE = 500;

const transformRow = (row) => {
  const multiValueFields = Object.fromEntries(
    MULTI_VALUE_COLUMNS.map((column) => [column, parseMultiValue(row[column])]),
  );

  return {
    product_id: toNumber(row.product_id),
    product_material_depot_variant_handle: sanitizeString(
      row.product_material_depot_variant_handle,
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
    if (
      error.message.includes("Forbidden") ||
      error.message.includes("Vendor")
    ) {
      return NextResponse.json(
        { error: "Forbidden: Vendor access required" },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let csvText;
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing CSV file." }, { status: 400 });
    }

    // Validate MIME type / extension is CSV
    const isCsv =
      file.type === "text/csv" || file.name?.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a .csv file." },
        { status: 400 },
      );
    }

    // Reject oversized files before reading them into memory
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 413 },
      );
    }

    csvText = await file.text();
  } catch (_error) {
    return NextResponse.json(
      { error: "Could not read the uploaded file." },
      { status: 400 },
    );
  }

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
      { status: 400 },
    );
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows. Maximum is ${MAX_ROWS} rows per upload.` },
      { status: 400 },
    );
  }

  if (!rows.length) {
    return NextResponse.json(
      { error: "No data rows detected after the header." },
      { status: 400 },
    );
  }

  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !(column in rows[0]),
  );
  if (missingColumns.length) {
    return NextResponse.json(
      {
        error: `Missing columns: ${missingColumns.join(
          ", ",
        )}. Please re-download the template.`,
      },
      { status: 422 },
    );
  }

  const transformedRows = rows
    .map((row) => transformRow(row))
    .filter((row) => row.product_id && row.product_name)
    .map((row) => ({ ...row, created_by: user.id }));

  if (!transformedRows.length) {
    return NextResponse.json(
      { error: "Could not find any valid rows to import." },
      { status: 400 },
    );
  }

  // Upsert in chunks to avoid a single oversized statement
  let inserted = 0;
  for (let i = 0; i < transformedRows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = transformedRows.slice(i, i + UPSERT_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("scraped_product_list")
      .upsert(chunk, { onConflict: "product_id" })
      .select("id");

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "Failed to import CSV." },
        { status: 500 },
      );
    }

    inserted += data?.length ?? 0;
  }

  return NextResponse.json({
    message: "Import complete",
    inserted,
    totalRows: transformedRows.length,
  });
}
