
export interface PetData {
  name: string;
  breed: string;
  age: string;
  ageMonths?: string;
  weight: string;
  dietType: 'Home Cooked' | 'Kibble' | 'Mixed';
  gender: 'Male' | 'Female';
  activityLevel: 'Low' | 'Moderate' | 'High';
  city: string;
  photoUrl?: string;
  allergies: string[];
  interests: string[];
  spayNeuterStatus?: 'Yes' | 'No' | 'Unknown';
  vaccinationStatus?: 'Up to date' | 'Partial' | 'Not sure';
  lastVaccineDate?: string;
  activityBaseline?: '15-30 min' | '30-60 min' | '60+ min';
  housingType?: 'Apartment' | 'Independent House' | 'Farm / Villa';
  walkSurface?: 'Asphalt' | 'Grass' | 'Mixed';
  parkAccess?: 'Yes' | 'No';
  feedingSchedule?: 'Once' | 'Twice' | 'Thrice';
  foodBrand?: string;
  goals?: string[];
  vetAccess?: 'Regular Vet' | 'Occasional' | 'None';
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

export interface MicroTip {
  id: string;
  title: string;
  detail: string;
  tags: string[];
}

export interface PetEvent {
  id: string;
  title: string;
  venue: string;
  dateLabel: string;
  url?: string;
  source: string;
  city: string;
}

export interface DailyBriefItem {
  id: string;
  title: string;
  value: string;
  detail: string;
  badge: string;
  icon: string;
}

export interface DailyBrief {
  city: string;
  updatedAt: string;
  items: DailyBriefItem[];
}

export interface SafetyRadar {
  city: string;
  pm25: number | null;
  airQualityLabel: string;
  status: string;
  advisory: string;
  safeWindow: string;
  updatedAt: string;
  temperature?: number | null;
  humidity?: number | null;
  feelsLike?: number | null;
}

export interface NearbyService {
  id: string;
  name: string;
  type: string;
  address: string;
  locality?: string;
  link: string;
  googleMapsLink?: string;
  lat?: number;
  lon?: number;
  source?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistHistoryPoint {
  date: string;
  completion: number;
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  repeat: 'None' | 'Weekly' | 'Monthly' | 'Quarterly';
  notes?: string;
  completed?: boolean;
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
