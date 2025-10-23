import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "../../../../utils/supabase/server";
import { cookies } from "next/headers";

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

    // Extract JSON from validation response text
    const validationJson = validationResponse.text.match(
      /```json\n([\s\S]*?)\n```/
    )?.[1];
    if (!validationJson) {
      throw new Error("Failed to parse validation result");
    }
    const validationResult = JSON.parse(validationJson);

    console.log(validationResult);

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

    // Step 2: Search Supabase for matching products
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const matchingProducts = [];

    // Get unique categories and subcategories from scraped_product_list
    const { data: uniqueCategories, error: categoryError } = await supabase
      .from("scraped_product_list")
      .select("category_name, sub_category, color")
      .not("category_name", "is", null);

    if (categoryError) {
      throw new Error("Failed to fetch categories from database");
    }

    // Create a Set to store unique combinations
    const uniqueCombinations = new Set();

    uniqueCategories.forEach((item) => {
      if (item.category_name && item.sub_category && item.color) {
        // Create a unique key by combining all three values
        const combinationKey = `${item.category_name}|${item.sub_category[0]}|${item.color}`;
        uniqueCombinations.add(combinationKey);
      }
    });

    // Convert combinations back to objects
    const uniqueCombinationsList = Array.from(uniqueCombinations).map(
      (combo) => {
        const [category, subCategory, color] = combo.split("|");
        return {
          category_name: category,
          sub_category: subCategory,
          color: color,
        };
      }
    );

    console.log("Unique combinations:", uniqueCombinationsList);

    // Step 2: Get AI product recommendations based on unique combinations
    const productRecommendationPrompt = `
    Analyze this interior image and recommend the top 3 most suitable products from the available options below.
    
    Available Product Combinations:
    ${uniqueCombinationsList
      .map(
        (item) =>
          `- ${item.category_name} > ${item.sub_category} (${item.color})`
      )
      .join("\n")}
    
    For each recommended product, provide:
    1. Which specific area/part of the interior it would be suitable for
    2. Why it matches the design style and color scheme
    3. Confidence score (0-1) for the recommendation
    
    Respond with a JSON array of objects:
    [
      {
        "product": {
          "category_name": "string",
          "sub_category": "string", 
          "color": "string"
        },
        "interior_location": "string (specific area like 'kitchen countertop', 'living room floor', etc.)",
        "reasoning": "string (why this product fits)",
        "confidence": number (0-1),
        "position": {
          "x": number (0-100, percentage from left),
          "y": number (0-100, percentage from top)
        }
      }
    ]
    
    Only return the top 3 most confident recommendations in descending order.
    `;

    const productResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        { text: productRecommendationPrompt },
      ],
    });

    const productJson = productResponse.text.match(
      /```json\n([\s\S]*?)\n```/
    )?.[1];
    if (!productJson) {
      throw new Error("Failed to parse product recommendation result");
    }
    const productRecommendations = JSON.parse(productJson);

    // Step 3: Fetch detailed product data from Supabase based on recommendations
    const detailedProducts = [];

    for (const recommendation of productRecommendations) {
      try {
        const { data: productData, error: productError } = await supabase
          .from("scraped_product_list")
          .select("*")
          .eq("category_name", recommendation.product.category_name)
          .eq("color", recommendation.product.color)
          .limit(1);

        if (productError) {
          console.error("Error fetching product data:", productError);
          continue;
        }

        if (productData && productData.length > 0) {
          detailedProducts.push({
            ...recommendation,
            productDetails: productData[0],
          });
        } else {
          // If exact match not found, try to find similar products
          const { data: similarProducts, error: similarError } = await supabase
            .from("scraped_product_list")
            .select("*")
            .eq("category_name", recommendation.product.category_name)
            .limit(1);

          if (!similarError && similarProducts && similarProducts.length > 0) {
            detailedProducts.push({
              ...recommendation,
              productDetails: similarProducts[0],
            });
          } else {
            // Add recommendation without detailed product data
            detailedProducts.push({
              ...recommendation,
              productDetails: null,
            });
          }
        }
      } catch (error) {
        console.error("Error processing product recommendation:", error);
        detailedProducts.push({
          ...recommendation,
          productDetails: null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      validation: validationResult,
      categories: uniqueCombinationsList.map((item) => item.category_name),
      subCategories: uniqueCombinationsList.map((item) => item.sub_category),
      productRecommendations: detailedProducts,
      matchingProducts: matchingProducts,
      materials: [],
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image", details: error.message },
      { status: 500 }
    );
  }
}
