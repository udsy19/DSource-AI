import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "../../../../utils/supabase/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // Get MIME type
    const mimeType = imageFile.type;

    // Step 1: Validate if image is interior-related
    const interiorValidationPrompt = `
    Analyze this image and determine if it shows an interior space (like a room, kitchen, bathroom, living room, etc.).
    Respond with a JSON object containing:
    {
      "isInterior": boolean,
      "confidence": number (0-1),
      "spaceType": string (if interior, what type of space),
      "reasoning": string
    }
    `;

    const validationResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        { text: interiorValidationPrompt },
      ],
    });

    const validationResult = JSON.parse(validationResponse.text);

    if (!validationResult.isInterior) {
      return NextResponse.json(
        {
          success: false,
          error: "Image does not appear to be an interior space",
          details: validationResult,
        },
        { status: 400 }
      );
    }

    // Step 2: Extract materials from the interior image
    const materialExtractionPrompt = `
    Analyze this interior image and identify all visible materials and finishes.
    Look for materials like:
    - Flooring (wood, tile, carpet, marble, etc.)
    - Wall finishes (paint, wallpaper, wood paneling, stone, etc.)
    - Countertops (granite, quartz, wood, etc.)
    - Cabinetry materials (wood species, finishes, etc.)
    - Hardware (metal types, finishes, etc.)
    - Lighting fixtures materials
    - Furniture materials
    - Window treatments
    - Any other visible materials
    
    Respond with a JSON array of objects:
    [
      {
        "material": "string (specific material name)",
        "category": "string (flooring, wall, countertop, etc.)",
        "subCategory": "string (wood, tile, metal, etc.)",
        "location": "string (where in the image)",
        "confidence": number (0-1)
      }
    ]
    `;

    const materialResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        { text: materialExtractionPrompt },
      ],
    });

    const materials = JSON.parse(materialResponse.text);

    // Step 3: Search Supabase for matching products
    const supabase = createClient();
    const matchingProducts = [];

    for (const material of materials) {
      try {
        // Search by category and sub-category
        const { data: products, error } = await supabase
          .from("scraped_product_list")
          .select("*")
          .or(
            `category.ilike.%${material.category}%,sub_category.ilike.%${material.subCategory}%,category.ilike.%${material.material}%,sub_category.ilike.%${material.material}%`
          )
          .limit(10);

        if (!error && products) {
          matchingProducts.push({
            material: material,
            products: products,
          });
        }
      } catch (error) {
        console.error(
          `Error searching for material ${material.material}:`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      validation: validationResult,
      materials: materials,
      matchingProducts: matchingProducts,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image", details: error.message },
      { status: 500 }
    );
  }
}
