
export interface PetData {
  id?: string;
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

export type AdoptionStatus = 'submitted' | 'review' | 'interview' | 'home-visit' | 'approved' | 'adopted' | 'rejected';

export interface AdoptionOrg {
  id: string;
  name: string;
  verified: boolean;
  city: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp?: string;
  website?: string;
}

export interface AdoptionPet {
  id: string;
  name: string;
  species: 'Dog' | 'Cat' | 'Other';
  breed: string;
  ageMonths: number;
  gender: 'Male' | 'Female';
  size: 'Small' | 'Medium' | 'Large';
  city: string;
  vaccinated: boolean;
  sterilized: boolean;
  temperamentTags: string[];
  description: string;
  photoUrl: string;
  orgId: string;
}

export interface AdoptionApplication {
  id: string;
  petId: string;
  applicantName: string;
  email: string;
  phone: string;
  city: string;
  housingType: 'Apartment' | 'Independent House' | 'Farm / Villa';
  petExperience: 'First-time' | 'Experienced';
  timeAvailability: 'Limited' | 'Moderate' | 'Flexible';
  reason: string;
  status: AdoptionStatus;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  type: 'Walk' | 'Play' | 'Training';
  duration: number;
  timestamp: Date;
  advice: string;
  notes?: string;
}

export interface ActivityLogRecord {
  id: string;
  petId: string;
  activityType: string;
  durationMinutes: number;
  intensity?: string | null;
  notes?: string | null;
  occurredAt: string;
  createdAt?: string;
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
  role?: 'pet-parent' | 'ngo';
  pet?: PetData;
  orgProfile?: {
    name: string;
    phone: string;
    city: string;
    orgName?: string;
  };
  activities: ActivityLog[];
  memories: any[];
}

export interface PetUpdateRecord {
  id: string;
  petId: string;
  updateDate: string;
  weightValue?: number | null;
  weightUnit?: string | null;
  dietType?: string | null;
  activityLevel?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface DietLogRecord {
  id: string;
  petId: string;
  logDate: string;
  mealType?: string | null;
  dietType?: string | null;
  actualFood?: string | null;
  deviation?: boolean | null;
  createdAt?: string;
}

export interface MedicalEventRecord {
  id: string;
  petId: string;
  eventType: string;
  dateAdministered?: string | null;
  nextDue?: string | null;
  verifiedBy?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface SymptomLogRecord {
  id: string;
  petId: string;
  symptomType: string;
  occurredAt: string;
  severity?: number | null;
  notes?: string | null;
  createdAt?: string;
}

export interface ParentFeedbackRecord {
  id: string;
  petId: string;
  rating?: number | null;
  category?: string | null;
  sentiment?: string | null;
  message?: string | null;
  tags?: string[] | null;
  source?: string | null;
  status?: string | null;
  createdAt?: string;
}

export interface CareRequestRecord {
  id: string;
  petId: string;
  requestType: string;
  concern?: string | null;
  notes?: string | null;
  preferredTime?: string | null;
  phone?: string | null;
  location?: string | null;
  urgency?: string | null;
  reportType?: string | null;
  status?: string | null;
  createdAt?: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  note: string;
  detail: string;
  status: 'good' | 'ok' | 'alert' | 'unknown';
}

export interface DashboardSummary {
  petId: string;
  range: string;
  updatedAt: string;
  healthScore?: number | null;
  confidence?: string | null;
  flags?: string[];
  weightTrend: DashboardMetric;
  activityTrend: DashboardMetric;
  dietAdherence: DashboardMetric;
  medicalCompliance: DashboardMetric;
  environmentRisk: DashboardMetric;
  symptomSignal: DashboardMetric;
}

export interface DashboardSeriesPoint {
  date: string;
  value: number | null;
}

export interface DashboardVitals {
  petId: string;
  range: string;
  updatedAt: string;
  weight: DashboardSeriesPoint[];
  activity: DashboardSeriesPoint[];
  diet: DashboardSeriesPoint[];
  symptoms: DashboardSeriesPoint[];
  environment: DashboardSeriesPoint[];
}
