import { apiClient } from "./apiClient";
import { NewsInsight, NutriLensResult, PetData } from "../types";

export interface PetCentre {
  name: string;
  type: string;
  address: string;
  rating: string;
  link: string;
}

export const analyzeNutriLens = async (
  base64Image: string,
  petData: PetData
): Promise<NutriLensResult> => {
  return apiClient.post<NutriLensResult>("/api/ai/nutri-lens", {
    base64Image,
    petData
  });
};

export const fetchCityInsights = async (city: string, breed: string): Promise<NewsInsight[]> => {
  try {
    const data = await apiClient.get<{ insights?: NewsInsight[] }>(
      `/api/ai/city-insights?city=${encodeURIComponent(city)}&breed=${encodeURIComponent(breed)}`
    );
    return Array.isArray(data?.insights) ? data.insights : [];
  } catch {
    return [];
  }
};

export const fetchCityPetCentres = async (city: string): Promise<PetCentre[]> => {
  try {
    const data = await apiClient.get<{ centres?: PetCentre[] }>(
      `/api/ai/pet-centres?city=${encodeURIComponent(city)}`
    );
    return Array.isArray(data?.centres) ? data.centres : [];
  } catch {
    return [];
  }
};

export const generatePlayPlan = async (petData: PetData): Promise<string> => {
  try {
    const data = await apiClient.post<{ text?: string }>("/api/ai/play-plan", { petData });
    return data?.text || "Hide and Seek with treats is a classic!";
  } catch {
    return "Try a gentle game of fetch indoors.";
  }
};

export const suggestActivity = async (petData: PetData, type: string, weather: string) => {
  try {
    const data = await apiClient.post<{ text?: string }>("/api/ai/activity-tip", {
      petData,
      type,
      weather
    });
    return data?.text || "Keep it safe and fun.";
  } catch {
    return "Keep it safe and fun.";
  }
};

export const generatePetArt = async (prompt: string, size: string) => {
  try {
    const data = await apiClient.post<{ imageData?: string }>("/api/ai/generate-art", {
      prompt,
      size
    });
    return data?.imageData || "";
  } catch {
    return "";
  }
};
