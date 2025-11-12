import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "../../../../utils/supabase/server";
import { cookies } from "next/headers";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const clamp = (value, min, max) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.min(Math.max(value, min), max);
};

const extractJsonResponse = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Model response was empty or not a string");
  }

  const trimmed = rawText.trim();

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch) {
      return JSON.parse(fencedMatch[1]);
    }
    throw new Error("Failed to parse JSON from model response");
  }
};

const getResponseText = async (response) => {
  if (!response) {
    return "";
  }

  if (typeof response.text === "function") {
    return await response.text();
  }

  if (typeof response.text === "string") {
    return response.text;
  }

  if (response.response) {
    const nested = response.response;
    if (typeof nested.text === "function") {
      return await nested.text();
    }
    if (typeof nested.text === "string") {
      return nested.text;
    }
  }

  return "";
};

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
    const validationResult = extractJsonResponse(
      await getResponseText(validationResponse)
    );

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

    // Step 2: Analyze image for possible categories with approximate positions
    const categoryAnalysisPrompt = `
    You are analyzing an interior design photograph. Identify only sofa, lamps, pillow, carpet, floor and wall painting that are clearly visible.

    Respond with a JSON object that matches this TypeScript type exactly:
    {
      "categories": Array<{
        "label": string;                // concise category name (only one -> should be unique and shouldn't repeat for different items in the image) (e.g. "Sofa", "Pendant Light")
        "confidence": number;           // 0-1
        "position": {
          "x": number;                  // horizontal center as a decimal between 0 and 1 (0 = far left, 1 = far right)
          "y": number;                  // vertical center as a decimal between 0 and 1 (0 = top, 1 = bottom)
        } | null;
        "reasoning": string;            // one-sentence justification referencing visual cues
      }>;
      "overallConfidence": number;      // 0-1 summary confidence for the full categorization
      "summary": string;                // short natural-language overview of what is in the scene
    }

    Rules:
    - Only include categories you are at least 0.4 confident about.
    - If you cannot estimate a position reliably, set "position" to null.
    - The response must be pure JSON. Do not include backticks, Markdown fencing, or additional commentary.
    `;

    const categoryAnalysisResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        { text: categoryAnalysisPrompt },
      ],
    });

    const categoryAnalysisResult = extractJsonResponse(
      await getResponseText(categoryAnalysisResponse)
    );

    const categories =
      categoryAnalysisResult?.categories?.map((item) => {
        const x = clamp(item?.position?.x, 0, 1);
        const y = clamp(item?.position?.y, 0, 1);

        return {
          label: item?.label ?? "Unknown",
          confidence:
            typeof item?.confidence === "number" &&
            !Number.isNaN(item.confidence)
              ? clamp(item.confidence, 0, 1)
              : null,
          position:
            x !== null && y !== null
              ? {
                  x,
                  y,
                }
              : null,
          reasoning: item?.reasoning ?? "",
          selected: false,
          hovered: false,
        };
      }) ?? [];

    return NextResponse.json({
      success: true,
      categories,
      overallConfidence: clamp(categoryAnalysisResult?.overallConfidence, 0, 1),
      summary: categoryAnalysisResult?.summary ?? "",
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image", details: error.message },
      { status: 500 }
    );
  }
}
