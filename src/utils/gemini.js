export const extractJsonResponse = (rawText) => {
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

export const getResponseText = async (response) => {
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
