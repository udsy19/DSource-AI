import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/api-auth";
import {
  AiResponseError,
  assertNotBlocked,
  generateContentWithResilience,
  getResponseText,
  parseModelJsonObject,
} from "@/utils/gemini";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB, matches client limit
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const clamp = (value, min, max) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.min(Math.max(value, min), max);
};

export async function POST(request) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Get MIME type
    const mimeType = imageFile.type;

    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use PNG, JPEG, or WEBP." },
        { status: 415 },
      );
    }

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Maximum size is 10 MB." },
        { status: 413 },
      );
    }

    const base64Image = Buffer.from(arrayBuffer).toString("base64");

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

    const validationResponse = await generateContentWithResilience(ai, {
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

    assertNotBlocked(
      validationResponse,
      "This image couldn't be processed. Please try another photo.",
    );

    // Extract JSON from validation response text
    const validationResult = parseModelJsonObject(
      await getResponseText(validationResponse),
      "We couldn't interpret the image. Please try another photo.",
    );

    if (!validationResult.isInterior) {
      return NextResponse.json(
        {
          success: false,
          error: "Image does not appear to be an interior space",
        },
        { status: 400 },
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

    const categoryAnalysisResponse = await generateContentWithResilience(ai, {
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

    assertNotBlocked(
      categoryAnalysisResponse,
      "This image couldn't be processed. Please try another photo.",
    );

    const categoryAnalysisResult = parseModelJsonObject(
      await getResponseText(categoryAnalysisResponse),
      "We couldn't interpret the image. Please try another photo.",
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
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof AiResponseError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 },
    );
  }
}
