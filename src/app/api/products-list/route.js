import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request) {
  try {
    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Fetch all products from the database
    const { data: products, error } = await supabase
      .from("scraped_product_list")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch products from database", details: error.message },
        { status: 500 }
      );
    }

    // Return products
    return NextResponse.json(
      { 
        products: products || [],
        count: products?.length || 0
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to get products", details: error.message },
      { status: 500 }
    );
  }
}

