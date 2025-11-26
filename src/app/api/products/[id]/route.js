import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request, { params }) {
  try {
    // Handle params (might be async in some Next.js versions)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;
    
    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Fetch product by ID (try both numeric ID and product_id)
    const numericId = isNaN(Number(id)) ? null : Number(id);
    
    let query = supabase
      .from("scraped_product_list")
      .select("*");
    
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

    // Fetch related products (same series for color variants and patterns)
    let relatedProducts = [];
    if (product.series_name) {
      const { data: related, error: relatedError } = await supabase
        .from("scraped_product_list")
        .select("id, color, color_code, image_url, product_name, product_id")
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

