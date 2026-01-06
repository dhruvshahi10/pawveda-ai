
import { GoogleGenAI, Type } from "@google/genai";
import { NutriLensResult, PetData, NewsInsight } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface PetCentre {
  name: string;
  type: string;
  address: string;
  rating: string;
  link: string;
}

/**
 * NUTRI LENS: Rename and add edge case handling for non-food items.
 */
export const analyzeNutriLens = async (
  base64Image: string,
  petData: PetData
): Promise<NutriLensResult> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          {
            text: `Analyze this image for a ${petData.breed} pet parent. 
            If the image is NOT a food plate or edible item, set toxicity_status to 'Not Food'.
            Otherwise, identify Indian home-cooked ingredients, toxic spices (onion/garlic/excess salt), and nutritional gaps.
            Respond in JSON.`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
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
    });

    const result = JSON.parse(response.text || '{}');
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
export const fetchCityInsights = async (city: string, breed: string): Promise<NewsInsight[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for recent pet-related news, weather warnings for dog owners, or community alerts in ${city}, India. 
      Also find one specific health tip for ${breed} heritage in this climate. 
      Format as a JSON array of objects with title, snippet, url, and source.`,
      config: {
        tools: [{ googleSearch: {} }],
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
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    return [];
  }
};

/**
 * FEED: Fetch genuine pet care centers in the city.
 */
export const fetchCityPetCentres = async (city: string): Promise<PetCentre[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find the top 5 genuine pet care centres (Vets, Groomers, or Boarding) in ${city}, India. 
      Include their name, type, a short address/area, rating (like 4.5/5), and a website link. 
      Format as a JSON array of objects.`,
      config: {
        tools: [{ googleSearch: {} }],
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
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    return [];
  }
};

/**
 * PLAY: Generate breed-specific games.
 */
export const generatePlayPlan = async (petData: PetData): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest a fun 15-minute game for a ${petData.breed} with ${petData.activityLevel} energy. 
      Focus on games suited for Indian apartments or local parks. 
      Mention if it's a cognitive or physical drill.`,
    });
    return response.text || "Hide and Seek with treats is a classic!";
  } catch (error) {
    return "Try a gentle game of fetch indoors.";
  }
};

export const suggestActivity = async (petData: PetData, type: string, weather: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Advice for ${type} with ${petData.breed} in ${weather}. 1 sentence.`,
  });
  return response.text || "Keep it safe and fun.";
};

export const generatePetArt = async (prompt: string, size: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return "";
};
