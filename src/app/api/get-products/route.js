import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { cookies } from "next/headers";

// Category mapping from UI categories to database categories
// This maps the AI-detected categories to database category names
const categoryMapping = {
  "Wall Painting": ["Laminates", "Paint", "Wall Covering"],
  "Pillow": ["Pillow", "Cushion", "Throw Pillow"],
  "Sofa": ["Sofa", "Couch", "Sectional"],
  "Coffee Table": ["Coffee Table", "Table", "Side Table"],
  "Floor": ["Laminates", "Flooring", "Floor"],
  "Carpet": ["Carpet", "Rug", "Mat"],
  "Lamps": ["Lamp", "Lighting", "Pendant Light"],
};

// Helper function to normalize category names for matching
function normalizeCategoryName(name) {
  return name.toLowerCase().trim();
}

// Helper function to find matching database categories
function getMatchingDatabaseCategories(uiCategory) {
  const normalized = normalizeCategoryName(uiCategory);
  
  // Direct match
  if (categoryMapping[uiCategory]) {
    return categoryMapping[uiCategory];
  }
  
  // Try to find partial matches
  for (const [key, values] of Object.entries(categoryMapping)) {
    if (normalizeCategoryName(key) === normalized) {
      return values;
    }
  }
  
  // If no mapping found, try the category name as-is
  return [uiCategory];
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get("categories");
    
    // Parse categories from query parameter (comma-separated)
    const selectedCategories = categoriesParam
      ? categoriesParam.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // If no categories selected, return empty array
    if (selectedCategories.length === 0) {
      return NextResponse.json({ categories: [] }, { status: 200 });
    }

    // Build query to fetch products for all selected categories
    let query = supabase
      .from("scraped_product_list")
      .select(
        "id, product_name, brand_name, category_name, color, image_url, product_id"
      );

    // If we have specific categories, filter by them
    if (selectedCategories.length > 0) {
      // Get all possible database category names for the selected UI categories
      const dbCategories = selectedCategories.flatMap((cat) =>
        getMatchingDatabaseCategories(cat)
      );
      
      // Remove duplicates
      const uniqueDbCategories = [...new Set(dbCategories)];
      
      // Filter by category_name using case-insensitive matching
      // Build OR conditions for Supabase using PostgREST syntax
      if (uniqueDbCategories.length > 0) {
        // Supabase .or() format: 'column.operator.value,column.operator.value'
        // For ilike with wildcards, use: category_name.ilike.*value*
        const orConditions = uniqueDbCategories
          .map((cat) => `category_name.ilike.*${cat}*`)
          .join(",");
        query = query.or(orConditions);
      }
    }

    // Execute query
    const { data: products, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch products from database" },
        { status: 500 }
      );
    }

    // Group products by UI category
    const categoriesMap = new Map();

    selectedCategories.forEach((uiCategory, index) => {
      const dbCategories = getMatchingDatabaseCategories(uiCategory);
      
      // Find products that match this UI category
      const categoryProducts = (products || []).filter((product) => {
        const productCategory = normalizeCategoryName(
          product.category_name || ""
        );
        return dbCategories.some((dbCat) =>
          productCategory.includes(normalizeCategoryName(dbCat))
        );
      });

      // Only add category if it has products
      if (categoryProducts.length > 0) {
        categoriesMap.set(uiCategory, {
          id: index + 1,
          label: uiCategory,
          products: categoryProducts.map((product) => ({
            title: product.product_name || "Untitled Product",
            brand: product.brand_name || "Unknown Brand",
            color: product.color || "N/A",
            image: product.image_url || "/api/images/placeholder.png",
            link: `/marketplace?product=${product.product_id || product.id}`,
          })),
        });
      }
    });

    // Convert map to array
    const categories = Array.from(categoriesMap.values());

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to get products" },
      { status: 500 }
    );
  }
}
