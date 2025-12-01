import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

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
    const body = await request.json();
    const { prompt, spaceType, style, lighting, colorPalette, image } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
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

    const validationResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: validationPrompt }],
    });

    const validationResult = extractJsonResponse(
      await getResponseText(validationResponse)
    );

    console.log("Validation result:", validationResult);

    if (!validationResult.isValid || validationResult.confidence < 0.5) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your request must be about interior redesign, architecture, or home improvement. Please provide a prompt related to these topics.",
          details: validationResult,
        },
        { status: 400 }
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

    console.log("Enhanced prompt:", enhancedPrompt);

    // Step 3: Prepare contents for image generation
    const contents = [];

    // If image is provided, add it first for image editing
    if (image) {
      const imageData = parseImageData(image);
      if (imageData) {
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
    console.log("Generating image with model: gemini-2.5-flash-image");
    const imageResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: contents,
    });

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
      console.error("No images generated in response:", imageResponse);
      return NextResponse.json(
        {
          success: false,
          error:
            "No image was generated. Please try again with a different prompt.",
          details: responseText || "Unknown error",
        },
        { status: 500 }
      );
    }

    console.log(`Successfully generated ${images.length} image(s)`);

    return NextResponse.json(
      {
        success: true,
        images: images,
        text: responseText,
        validationDetails: validationResult,
        enhancedPrompt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in generate-image endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process image generation request",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
