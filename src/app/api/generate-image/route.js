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

export async function POST(request) {
    try {
        const body = await request.json();
        const { prompt, spaceType, style, lighting, colorPalette } = body;

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

        // Step 3: Image generation note
        // The @google/genai SDK does not currently support image generation via generateImages
        // This would require Google Cloud Vertex AI with Imagen API
        // For now, return a helpful message

        return NextResponse.json(
            {
                success: false,
                error: "Image generation is not available with the current API configuration.",
                details: "The @google/genai SDK requires Google Cloud Vertex AI setup for Imagen models to generate images.",
                suggestion: "To enable real image generation, you need to: 1) Set up Google Cloud Vertex AI with Imagen API, 2) Use the Vertex AI Node.js client library, or 3) Integrate with an alternative image generation service like DALL-E, Stable Diffusion, or Midjourney.",
                validationDetails: validationResult,
                enhancedPrompt,
            },
            { status: 501 }
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
