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
const MAX_PROMPT_LENGTH = 2000;

// Helper function to convert base64 data URL to base64 string and extract mime type
const parseImageData = (imageData) => {
  if (!imageData) return null;

  // If it's already a base64 string without data URL prefix
  if (!imageData.includes(",")) {
    return { data: imageData, mimeType: "image/png" };
  }

  // Extract mime type and base64 data from data URL
  const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    return {
      data: matches[2],
      mimeType: matches[1] || "image/png",
    };
  }

  // If it's just base64 data
  return { data: imageData, mimeType: "image/png" };
};

export async function POST(request) {
  try {
    await requireAuth();

    const body = await request.json();
    const { prompt, spaceType, style, lighting, colorPalette, image } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }

    // Step 1: Validate if prompt is related to interior design/architecture
    const validationPrompt = `
    Analyze this text prompt and determine if it is related to interior redesign, architecture, home improvement, construction, floor layouts, room remodeling, furniture arrangement, lighting redesign, or similar architectural contexts.
    
    Prompt: "${prompt}"
    
    Respond with a JSON object containing:
    {
      "isValid": boolean,
      "confidence": number (0-1),
      "category": string (if valid, what category it falls into),
      "reasoning": string
    }
    `;

    const validationResponse = await generateContentWithResilience(ai, {
      model: "gemini-2.5-flash",
      contents: [{ text: validationPrompt }],
    });

    assertNotBlocked(
      validationResponse,
      "Your request couldn't be processed. Please rephrase and try again.",
    );

    const validationResult = parseModelJsonObject(
      await getResponseText(validationResponse),
      "We couldn't interpret your request. Please rephrase and try again.",
    );

    if (!validationResult.isValid || validationResult.confidence < 0.5) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your request must be about interior redesign, architecture, or home improvement. Please provide a prompt related to these topics.",
        },
        { status: 400 },
      );
    }

    // Step 2: Build enhanced prompt with context
    let enhancedPrompt = prompt;

    if (spaceType) {
      enhancedPrompt = `${spaceType} space: ${enhancedPrompt}`;
    }

    if (style) {
      enhancedPrompt = `${enhancedPrompt}, ${style} style`;
    }

    if (lighting) {
      enhancedPrompt = `${enhancedPrompt}, with ${lighting} lighting`;
    }

    if (colorPalette) {
      enhancedPrompt = `${enhancedPrompt}, using ${colorPalette} color palette`;
    }

    // Add quality modifiers for better results
    enhancedPrompt = `High-quality architectural visualization: ${enhancedPrompt}. Professional interior design rendering, photorealistic, detailed, 4K quality.`;

    // Step 3: Prepare contents for image generation
    const contents = [];

    // If image is provided, add it first for image editing
    if (image) {
      const imageData = parseImageData(image);
      if (imageData) {
        if (Buffer.from(imageData.data, "base64").length > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: "Image is too large. Maximum size is 10 MB." },
            { status: 413 },
          );
        }
        contents.push({
          inlineData: {
            data: imageData.data,
            mimeType: imageData.mimeType,
          },
        });
        // Adjust prompt for image editing
        enhancedPrompt = `Edit this image: ${enhancedPrompt}`;
      }
    }

    // Add the text prompt
    contents.push({ text: enhancedPrompt });

    // Step 4: Generate image using Gemini 2.5 Flash Image model
    const imageResponse = await generateContentWithResilience(ai, {
      model: "gemini-2.5-flash-image",
      contents: contents,
    });

    assertNotBlocked(
      imageResponse,
      "This content couldn't be processed. Please adjust your request and try again.",
    );

    // Step 5: Extract generated image from response
    const images = [];
    let responseText = null;

    // Handle different response structures
    if (imageResponse.candidates && imageResponse.candidates.length > 0) {
      const candidate = imageResponse.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            responseText = part.text;
          } else if (part.inlineData) {
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || "image/png";
            images.push({
              image: imageData,
              mimeType: mimeType,
            });
          }
        }
      }
    } else if (imageResponse.parts) {
      // Alternative response structure
      for (const part of imageResponse.parts) {
        if (part.text) {
          responseText = part.text;
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || "image/png";
          images.push({
            image: imageData,
            mimeType: mimeType,
          });
        }
      }
    }

    if (images.length === 0) {
      console.error("No images generated in generate-image response");
      return NextResponse.json(
        {
          success: false,
          error:
            "No image was generated. Please try again with a different prompt.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        images: images,
        text: responseText,
        enhancedPrompt,
      },
      { status: 200 },
    );
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
    console.error("Error in generate-image endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process image generation request",
      },
      { status: 500 },
    );
  }
}
