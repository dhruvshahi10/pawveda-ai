
import { GoogleGenAI, Type } from "@google/genai";
import { NutriLensResult, PetData, NewsInsight } from "../types";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key missing. Set VITE_GEMINI_API_KEY or VITE_API_KEY in .env.local and restart the dev server.");
  }
  return new GoogleGenAI({ apiKey });
};

const TEXT_MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

const IMAGE_MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-pro"
];

export interface PetCentre {
  name: string;
  type: string;
  address: string;
  rating: string;
  link: string;
}

const isNotFoundModelError = (error: any) => {
  const message = error?.message || "";
  return message.includes("models/") && message.includes("not found");
};

const isInvalidArgumentModelError = (error: any) => {
  const message = error?.message || "";
  return message.includes("not supported for generateContent");
};

const generateWithModelFallback = async (
  ai: GoogleGenAI,
  request: any,
  models: string[]
) => {
  let lastError: any = null;
  for (const model of models) {
    try {
      return await ai.models.generateContent({ ...request, model });
    } catch (error) {
      lastError = error;
      if (isNotFoundModelError(error) || isInvalidArgumentModelError(error)) {
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const generateWithSearchFallback = async (
  ai: GoogleGenAI,
  request: any,
  models: string[] = TEXT_MODEL_CANDIDATES
) => {
  try {
    return await generateWithModelFallback(ai, request, models);
  } catch (error) {
    const tools = request?.config?.tools;
    if (!tools || tools.length === 0) {
      throw error;
    }
    const { tools: _tools, ...config } = request.config || {};
    return await generateWithModelFallback(ai, { ...request, config }, models);
  }
};

const getResponseText = async (response: any): Promise<string> => {
  if (!response) return "";
  if (typeof response.text === "function") {
    try {
      return await response.text();
    } catch {
      return "";
    }
  }
  return response.text || "";
};

const validateUrls = async (urls: string[], category: string): Promise<Set<string>> => {
  if (!urls.length) return new Set();
  try {
    const response = await fetch("/api/validate-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, category })
    });
    if (!response.ok) return new Set(urls);
    const data = await response.json();
    const validUrls = Array.isArray(data?.validUrls) ? data.validUrls : urls;
    return new Set(validUrls);
  } catch {
    return new Set(urls);
  }
};

const filterValidated = async <T>(
  items: T[],
  urlKey: keyof T,
  category: string
): Promise<T[]> => {
  const urls = items
    .map(item => (item?.[urlKey] as string) || "")
    .filter(url => url);
  if (!urls.length) return [];
  const validUrlSet = await validateUrls(urls, category);
  return items.filter(item => validUrlSet.has((item?.[urlKey] as string) || ""));
};

/**
 * NUTRI LENS: Rename and add edge case handling for non-food items.
 */
export const analyzeNutriLens = async (
  base64Image: string,
  petData: PetData
): Promise<NutriLensResult> => {
  const ai = getAI();
  try {
    const response = await generateWithSearchFallback(ai, {
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          {
            text: `Analyze this image for a ${petData.breed} pet parent in India.
If the image is NOT food or edible, set toxicity_status to "Not Food" and keep other fields concise.
If it is food: identify Indian home-cooked ingredients, flag toxic items (onion/garlic/grapes/chocolate/xylitol), highlight nutritional gaps, and give safe corrections in detail to improvise the diet and 1-2 dishes that can be prepared next.
Return ONLY valid JSON matching the schema. No markdown, no extra keys, no prose.`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a senior veterinarian with 15+ years of experience. Be precise, cautious, and avoid speculative claims.",
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            item_identified: { type: Type.STRING },
            toxicity_status: { type: Type.STRING, enum: ['Safe', 'Caution', 'Toxic', 'Not Food'] },
            nutritional_gap: { type: Type.STRING },
            correction_advice: { type: Type.STRING },
            confidence_score: { type: Type.NUMBER }
          },
          required: ["item_identified", "toxicity_status", "nutritional_gap", "correction_advice", "confidence_score"]
        }
      }
    }, TEXT_MODEL_CANDIDATES);

    const responseText = await getResponseText(response);
    const result = JSON.parse(responseText || '{}');
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => ({
      web: { uri: chunk.web?.uri || '', title: chunk.web?.title || 'Vet Reference' }
    })).filter((s: any) => s.web.uri);

    return { ...result, sources } as NutriLensResult;
  } catch (error) {
    console.error("Nutri Lens Error:", error);
    throw error;
  }
};

/**
 * FEED: Fetch city-specific pet insights and safety news.
 */
const parseJsonArray = <T>(text?: string): T[] => {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const fallbackParsed = JSON.parse(match[0]);
        return Array.isArray(fallbackParsed) ? fallbackParsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
};

export const fetchCityInsights = async (city: string, breed: string): Promise<NewsInsight[]> => {
  const ai = getAI();
  try {
    const response = await generateWithSearchFallback(ai, {
      contents: `Search for recent pet-related news, weather warnings for dog owners, or community alerts in ${city}, India. 
      Include up to 8 items, each with a credible URL. Prefer the last 30 days. 
      Include 1-2 items from reputable discussion forums (e.g., Reddit, Quora, Pet forums) if recent and relevant. 
      Use direct canonical URLs (no search/redirect links). 
      Add one specific health tip for ${breed} in this climate inside the snippet when relevant. 
      If you cannot find reliable sources, return an empty JSON array. 
      Return ONLY valid JSON array, no markdown.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a local pet safety analyst. Only include verifiable sources and real URLs.",
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              snippet: { type: Type.STRING },
              url: { type: Type.STRING },
              source: { type: Type.STRING }
            },
            required: ["title", "snippet", "url", "source"]
          }
        }
      }
    }, TEXT_MODEL_CANDIDATES);
    const responseText = await getResponseText(response);
    const primary = parseJsonArray<NewsInsight>(responseText);
    if (primary.length) return await filterValidated(primary, "url", "news");

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks?.length) {
      const grounded = groundingChunks
        .map((chunk: any) => ({
          title: chunk.web?.title || "Local update",
          snippet: chunk.web?.title || "See the linked source for details.",
          url: chunk.web?.uri || "",
          source: "Google Search"
        }))
        .filter(item => item.url);
      return await filterValidated(grounded, "url", "news");
    }
    return [];
  } catch (error) {
    console.error("City Insights Error:", error);
    throw error;
  }
};

/**
 * FEED: Fetch genuine pet care centers in the city.
 */
export const fetchCityPetCentres = async (city: string): Promise<PetCentre[]> => {
  const ai = getAI();
  try {
    const response = await generateWithSearchFallback(ai, {
      contents: `Find the top (upto 50) genuine pet care centres (Vets, Groomers, or Boarding) in ${city}, India. 
      Return up to 10 entries. Include name, type, short area/address, rating (e.g., 4.0-4.5/5), and a working website link (official site preferred; Google Maps or Facebook acceptable). 
      If you cannot find reliable sources, return an empty JSON array.
      Return ONLY valid JSON array, no markdown.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a vet admin compiling a verified directory. Do not invent listings or URLs.",
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              address: { type: Type.STRING },
              rating: { type: Type.STRING },
              link: { type: Type.STRING }
            },
            required: ["name", "type", "address", "rating", "link"]
          }
        }
      }
    }, TEXT_MODEL_CANDIDATES);
    const responseText = await getResponseText(response);
    const primary = parseJsonArray<PetCentre>(responseText);
    if (primary.length) return await filterValidated(primary, "link", "centres");

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks?.length) {
      const grounded = groundingChunks
        .map((chunk: any) => ({
          name: chunk.web?.title || "Pet Care Centre",
          type: "Vet / Groomer",
          address: city,
          rating: "4.5/5",
          link: chunk.web?.uri || ""
        }))
        .filter(item => item.link);
      return await filterValidated(grounded, "link", "centres");
    }
    return [];
  } catch (error) {
    console.error("City Pet Centres Error:", error);
    throw error;
  }
};

/**
 * PLAY: Generate breed-specific games.
 */
export const generatePlayPlan = async (petData: PetData): Promise<string> => {
  const ai = getAI();
  try {
    const response = await generateWithModelFallback(ai, {
      contents: `Suggest a fun 15-minute game for a ${petData.breed} with ${petData.activityLevel} energy. 
      Focus on Indian apartments or local parks. Mention if it's cognitive or physical. 
      Reply in 2-3 sentences, no bullets.`,
    }, TEXT_MODEL_CANDIDATES);
    const responseText = await getResponseText(response);
    return responseText || "Hide and Seek with treats is a classic!";
  } catch (error) {
    return "Try a gentle game of fetch indoors.";
  }
};

export const suggestActivity = async (petData: PetData, type: string, weather: string) => {
  const ai = getAI();
  const response = await generateWithModelFallback(ai, {
    contents: `Give a single-sentence safety-first tip for ${type} with ${petData.breed} in ${weather}.`,
  }, TEXT_MODEL_CANDIDATES);
  const responseText = await getResponseText(response);
  return responseText || "Keep it safe and fun.";
};

export const generatePetArt = async (prompt: string, size: string) => {
  const ai = getAI();
  const response = await generateWithModelFallback(ai, {
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  }, IMAGE_MODEL_CANDIDATES);
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return "";
};
