import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: products, error } = await supabase
      .from("scraped_product_list")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("products-list: fetch failed", error);
      return NextResponse.json(
        { error: "Failed to fetch products from database" },
        { status: 500 },
      );
    }

    // Return products
    return NextResponse.json(
      {
        products: products || [],
        count: products?.length || 0,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("products-list: request failed", error);
    return NextResponse.json(
      { error: "Failed to get products" },
      { status: 500 },
    );
  }
}
