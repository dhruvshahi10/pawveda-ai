
export interface PetData {
  name: string;
  breed: string;
  age: string;
  weight: string;
  dietType: 'Home Cooked' | 'Kibble' | 'Mixed';
  gender: 'Male' | 'Female';
  activityLevel: 'Low' | 'Moderate' | 'High';
  city: string;
  photoUrl?: string;
  allergies: string[];
  interests: string[];
}

export interface NutriLensResult {
  item_identified: string;
  toxicity_status: 'Safe' | 'Caution' | 'Toxic' | 'Not Food';
  nutritional_gap: string;
  correction_advice: string;
  confidence_score: number;
  sources?: Array<{web: {uri: string, title: string}}>;
}

export interface NewsInsight {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export interface ActivityLog {
  id: string;
  type: 'Walk' | 'Play' | 'Training';
  duration: number;
  timestamp: Date;
  advice: string;
  notes?: string;
}

export interface UserCredits {
  nutri: number;
  activity: number;
  studio: number;
}

export interface UserState {
  isLoggedIn: boolean;
  isPremium: boolean;
  credits: UserCredits;
  pet?: PetData;
  activities: ActivityLog[];
  memories: any[];
}
