
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ActivityLog, ActivityLogRecord, CareRequestRecord, ChecklistHistoryPoint, ChecklistItem, ChecklistSection, DashboardSummary, DietLogRecord, MicroTip, NearbyService, NutriLensResult, PetData, PetEvent, PetUpdateRecord, Reminder, SafetyRadar, UserCredits, UserState } from '../types';
import { 
  analyzeNutriLens, 
  suggestActivity, 
  generatePlayPlan
} from '../services/geminiService';
import { fetchNearbyServices, fetchPetEvents, fetchSafetyRadar, getChecklist, getMicroTips, seedChecklistHistory } from '../services/feedService';
import { apiClient } from '../services/apiClient';
import { createActivityLog, createDietLog, createMedicalEvent, createParentFeedback, createPetUpdate, createSymptomLog, fetchActivityLogs, fetchDashboardSummary, fetchDietLogs, fetchPetUpdates } from '../services/dashboardService';
import { createTriageSession, fetchTriageSessions } from '../services/triageService';
import Adoption from './Adoption';
import { getAuthSession, setAuthSession } from '../lib/auth';
import { getAllBlogs } from '../lib/content';
import { buildBreedInsights, buildEvidenceBrief } from '../lib/checkupInsights';
import { trackEvent } from '../lib/usageAnalytics';

interface Props {
  user: UserState;
  setUser: (user: UserState) => void;
  onUpgrade: () => void;
  onLogout: () => void;
}

const FORUM_MOCK = [
  { id: 1, user: "Arjun_M", text: "Pro-tip: Adding pumpkin puree to your Indie's rice helps with Mumbai-humidity tummy issues.", votes: 24, breed: "Indie / Pariah" },
  { id: 2, user: "Sarah_V", text: "Anyone else seeing more ticks in Cubbon Park recently? Use neem oil spray.", votes: 52, breed: "Any" },
  { id: 3, user: "Desi_Parent", text: "Indies are so smart, hide-and-seek is better than fetch for them!", votes: 110, breed: "Indie / Pariah" },
  { id: 4, user: "Vikram_K", text: "For Golden Retrievers in high-rises, focus on stair climbing for joint strength.", votes: 88, breed: "Golden Retriever" },
  { id: 5, user: "Priya_S", text: "Coconut water is the best summer cooler for Indies to prevent dehydration.", votes: 45, breed: "Indie / Pariah" },
  { id: 6, user: "Rohan_D", text: "Teaching 'Leave it' saved my dog from eating a chocolate bar on the street today.", votes: 67, breed: "Any" },
  { id: 7, user: "Amit_B", text: "Consistency is key. 5 mins of training every day is better than 1 hour once a week.", votes: 132, breed: "Any" },
  { id: 8, user: "Neha_L", text: "Socializing doesn't mean meeting every dog; it means being calm around them.", votes: 91, breed: "Any" },
  { id: 9, user: "Sanjay_R", text: "Indie pups need early handling of paws to make nail clipping easier later.", votes: 34, breed: "Indie / Pariah" },
  { id: 10, user: "Meera_T", text: "A snuffle mat is a lifesaver for rainy days when we can't go for long walks.", votes: 78, breed: "Any" }
];

const TRAINING_TECHNIQUES = [
  { title: "Loose Leash Walking", desc: "Stop walking the second the leash goes taut. Only move when your pet looks back or the leash slackens." },
  { title: "The 'Leave It' Command", desc: "Start with a low-value treat in a closed fist. Only reward with a different high-value treat once they stop sniffing your fist." },
  { title: "Reliable Recall", desc: "Never call your dog for something they dislike (e.g., a bath). Always make 'Come' lead to the best rewards." },
  { title: "Targeting (Touch)", desc: "Hold your hand out; click/treat the moment their nose touches your palm. Use this to move them without pulling." }
];

const GEEKY_CARDS = [
  {
    title: 'Daily Exercise Range',
    summary: 'Dogs typically need 30 minutes to 2 hours of exercise per day, depending on age, breed, and health.',
    source: 'https://www.preventivevet.com/dogs/how-much-exercise-dogs-need'
  },
  {
    title: 'Vaccination Guidance',
    summary: 'WSAVA outlines core vs non-core vaccines so parents can follow an evidence-based schedule.',
    source: 'https://wsava.org/global-guidelines/vaccination-guidelines/'
  },
  {
    title: 'Nutrition Standards',
    summary: 'WSAVA nutrition guidelines stress diet history and body condition tracking for better outcomes.',
    source: 'https://wsava.org/global-guidelines/global-nutrition-guidelines/'
  },
  {
    title: 'Heat Safety Signals',
    summary: 'Know signs of overheating (panting, drooling, rapid heart rate) and adjust walks accordingly.',
    source: 'https://www.aspca.org/pet-care/general-pet-care/hot-weather-safety-tips'
  }
];

const BREED_OPTIONS = ['Indie / Pariah', 'Golden Retriever', 'Labrador', 'German Shepherd', 'Beagle', 'Shih Tzu', 'Persian Cat', 'Indie Cat'];
const DIET_TYPES = ['Home Cooked', 'Kibble', 'Mixed'] as const;
const GENDER_OPTIONS = ['Male', 'Female'] as const;
const ACTIVITY_LEVELS = ['Low', 'Moderate', 'High'] as const;
const SPAY_STATUSES = ['Yes', 'No', 'Unknown'] as const;
const VACCINATION_STATUSES = ['Up to date', 'Partial', 'Not sure'] as const;
const ACTIVITY_BASELINES = ['15-30 min', '30-60 min', '60+ min'] as const;
const HOUSING_TYPES = ['Apartment', 'Independent House', 'Farm / Villa'] as const;
const WALK_SURFACES = ['Asphalt', 'Grass', 'Mixed'] as const;
const PARK_ACCESS = ['Yes', 'No'] as const;
const FEEDING_SCHEDULES = ['Once', 'Twice', 'Thrice'] as const;
const VET_ACCESS = ['Regular Vet', 'Occasional', 'None'] as const;
type QuickUpdateMode = 'weekly' | 'diet' | 'medical' | 'symptom';

type CustomChecklistItem = {
  id: string;
  label: string;
  frequency: 'daily' | 'weekly';
  remindTime?: string;
  notifyEnabled?: boolean;
};
type ChecklistOverride = {
  label?: string;
  remindTime?: string;
  notifyEnabled?: boolean;
  hidden?: boolean;
};
type SymptomLogEntry = {
  id: string;
  symptomType: string;
  severity: number;
  occurredAt: string;
  notes?: string | null;
};
type MedicalEventEntry = {
  id: string;
  eventType: string;
  dateAdministered?: string | null;
  nextDue?: string | null;
  verifiedBy?: string | null;
  notes?: string | null;
};
type DietLogEntry = {
  id: string;
  logDate: string;
  mealType?: string | null;
  dietType?: string | null;
  actualFood?: string | null;
  synced?: boolean;
};
type TriageGuidance = {
  badge: string;
  headline: string;
  summary: string;
  steps: string[];
  redFlags: string[];
  tone: 'urgent' | 'soon' | 'monitor';
};
type TriageTopic = {
  key: string;
  label: string;
  keywords: string[];
  steps: string[];
  redFlags: string[];
};
const QUICK_UPDATE_MODES: { value: QuickUpdateMode; label: string; helper: string }[] = [
  { value: 'weekly', label: 'Weekly check-in', helper: 'Weight, activity, diet summary.' },
  { value: 'diet', label: 'Diet log', helper: 'Diet type + food served.' },
  { value: 'medical', label: 'Medical event', helper: 'Vaccines, deworming, vet visits.' },
  { value: 'symptom', label: 'Symptom signal', helper: 'Track anything unusual.' }
];
const VET_BRIEF_RANGE_OPTIONS = [7, 30, 60, 90] as const;
type VetBriefRange = typeof VET_BRIEF_RANGE_OPTIONS[number];

const listToCsv = (list?: string[]) => (list && list.length ? list.join(', ') : '');
const csvToList = (value: string) =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
const formatBriefDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const safeValue = (value?: string | null) => (value && value.trim() ? value : '-');
const toNumber = (value?: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const getTriageOutcomeLabel = (request?: CareRequestRecord | null) => {
  if (!request) return '-';
  if (request.outcome) return request.outcome;
  const urgency = request.urgency?.toLowerCase() ?? '';
  const requestType = request.requestType?.toLowerCase() ?? '';
  if (requestType.includes('emergency') || urgency.includes('emergency') || urgency === 'high') return 'Emergency';
  if (urgency.includes('visit') || urgency === 'medium') return 'Visit soon';
  if (urgency.includes('monitor') || urgency === 'low') return 'Monitor';
  return 'Review needed';
};
const TRIAGE_TOPICS: TriageTopic[] = [
  {
    key: 'gi',
    label: 'GI distress',
    keywords: ['vomit', 'vomiting', 'diarrhea', 'stool', 'poop', 'bloated', 'bloat', 'constipation', 'appetite', 'not eating', 'nausea'],
    steps: ['Offer small sips of water.', 'Avoid new foods or treats.', 'Note last meal and any recent diet changes.'],
    redFlags: ['Blood in vomit or stool', 'Repeated vomiting', 'Hard bloated abdomen', 'Severe lethargy']
  },
  {
    key: 'resp',
    label: 'Breathing issue',
    keywords: ['breath', 'breathing', 'cough', 'pant', 'wheez', 'respiratory'],
    steps: ['Keep your pet calm and cool.', 'Limit activity and heat exposure.', 'Note breathing rate and posture.'],
    redFlags: ['Open-mouth breathing at rest', 'Blue or pale gums', 'Collapse', 'Rapid worsening']
  },
  {
    key: 'injury',
    label: 'Injury / limping',
    keywords: ['limp', 'limping', 'paw', 'leg', 'injury', 'wound', 'bleeding', 'cut', 'sprain', 'fracture'],
    steps: ['Limit movement and jumping.', 'Check paws and joints for swelling or debris.', 'Avoid human pain medication.'],
    redFlags: ['Cannot bear weight', 'Open wound or bone visible', 'Bleeding that will not stop', 'Severe swelling']
  },
  {
    key: 'skin',
    label: 'Skin / itch',
    keywords: ['itch', 'itchy', 'rash', 'skin', 'hot spot', 'ear', 'redness', 'allergy', 'hives'],
    steps: ['Prevent licking or scratching.', 'Check for fleas or new products.', 'Take photos of affected areas.'],
    redFlags: ['Facial swelling', 'Hives spreading quickly', 'Open sores', 'Ear discharge with pain']
  },
  {
    key: 'urinary',
    label: 'Urinary issue',
    keywords: ['urine', 'urinating', 'pee', 'straining', 'litter', 'blood in urine'],
    steps: ['Track urination frequency.', 'Ensure fresh water access.', 'Collect a urine sample if possible.'],
    redFlags: ['Unable to urinate', 'Crying while urinating', 'Blood in urine', 'Vomiting with lethargy']
  },
  {
    key: 'neuro',
    label: 'Neuro / toxin',
    keywords: ['seizure', 'collapse', 'faint', 'tremor', 'poison', 'toxin', 'chocolate', 'xylitol', 'grapes', 'ingested'],
    steps: ['Seek vet guidance immediately.', 'Bring packaging or list of exposures.', 'Do not induce vomiting unless directed.'],
    redFlags: ['Repeated seizures', 'Loss of consciousness', 'Unsteady walking', 'Vomiting after exposure']
  }
];
const DEFAULT_TRIAGE_TOPIC: TriageTopic = {
  key: 'general',
  label: 'General concern',
  keywords: [],
  steps: ['Track appetite, energy, and bathroom habits.', 'Note any new foods, meds, or activities.', 'Capture photos or short videos of symptoms.'],
  redFlags: ['Symptoms worsen quickly', 'Refuses food or water', 'Severe lethargy', 'Any breathing difficulty']
};
const detectTriageTopic = (concern?: string | null, notes?: string | null) => {
  const text = `${concern ?? ''} ${notes ?? ''}`.toLowerCase();
  if (!text.trim()) return DEFAULT_TRIAGE_TOPIC;
  const matched = TRIAGE_TOPICS.find(topic => topic.keywords.some(keyword => text.includes(keyword)));
  return matched || DEFAULT_TRIAGE_TOPIC;
};
const dedupeList = (items: string[]) => Array.from(new Set(items));
const buildTriageGuidance = (urgency: string | null | undefined, topic: TriageTopic): TriageGuidance => {
  const value = urgency?.toLowerCase() ?? '';
  if (value.includes('emergency') || value === 'high') {
    return {
      badge: 'Emergency',
      headline: 'Go to emergency care now',
      summary: `Symptoms suggest an urgent ${topic.label.toLowerCase()} issue. Please seek immediate veterinary care.`,
      steps: dedupeList([
        'Go to the nearest 24/7 vet or emergency clinic.',
        'Avoid giving human medication.',
        'Bring this vet brief and any recent diet/meds info.',
        ...topic.steps
      ]).slice(0, 5),
      redFlags: dedupeList([...topic.redFlags, 'Trouble breathing', 'Collapse or seizures']).slice(0, 5),
      tone: 'urgent'
    };
  }
  if (value.includes('visit') || value === 'medium') {
    return {
      badge: 'Visit Soon',
      headline: 'Book a vet visit in 24-48 hours',
      summary: `This looks concerning for ${topic.label.toLowerCase()}. A vet visit is recommended soon.`,
      steps: dedupeList([
        'Schedule a vet visit within the next 1-2 days.',
        'Track appetite, energy, and bathroom habits.',
        ...topic.steps
      ]).slice(0, 5),
      redFlags: dedupeList([...topic.redFlags, 'Symptoms worsen quickly']).slice(0, 5),
      tone: 'soon'
    };
  }
  return {
    badge: 'Monitor',
    headline: 'Monitor at home for 24-48 hours',
    summary: `Symptoms seem mild for ${topic.label.toLowerCase()}. Monitor closely and log changes.`,
    steps: dedupeList([
      'Observe appetite, energy, and stool quality.',
      ...topic.steps
    ]).slice(0, 5),
    redFlags: dedupeList([...topic.redFlags, 'Symptoms persist beyond 48 hours']).slice(0, 5),
    tone: 'monitor'
  };
};
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const motionDelay = (index: number) =>
  ({ '--delay': `${index * 70}ms` } as React.CSSProperties);
const isWithinRange = (value: string | null | undefined, rangeDays: number) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= rangeDays;
};

const getChecklistOverrideKey = (pet?: PetData) =>
  `pawveda_checklist_overrides_${pet?.id || pet?.name || 'guest'}_${pet?.city || 'city'}`;
const getSymptomLogStorageKey = (pet?: PetData) =>
  `pawveda_symptoms_${pet?.id || pet?.name || 'guest'}_${pet?.city || 'city'}`;
const getLegacySymptomLogStorageKey = (pet?: PetData) =>
  `pawveda_symptoms_${pet?.name || 'guest'}_${pet?.city || 'city'}`;
const getMedicalEventStorageKey = (pet?: PetData) =>
  `pawveda_medical_events_${pet?.id || pet?.name || 'guest'}_${pet?.city || 'city'}`;
const getLegacyMedicalEventStorageKey = (pet?: PetData) =>
  `pawveda_medical_events_${pet?.name || 'guest'}_${pet?.city || 'city'}`;

const buildPetDraft = (pet?: PetData) => ({
  name: pet?.name ?? '',
  breed: pet?.breed ?? 'Indie / Pariah',
  age: pet?.age ?? 'Adult',
  ageMonths: pet?.ageMonths ?? '',
  weight: pet?.weight ?? '15',
  dietType: pet?.dietType ?? 'Home Cooked',
  gender: pet?.gender ?? 'Male',
  activityLevel: pet?.activityLevel ?? 'Moderate',
  city: pet?.city ?? '',
  spayNeuterStatus: pet?.spayNeuterStatus ?? 'Unknown',
  vaccinationStatus: pet?.vaccinationStatus ?? 'Not sure',
  lastVaccineDate: pet?.lastVaccineDate ?? '',
  lastVetVisitDate: pet?.lastVetVisitDate ?? '',
  activityBaseline: pet?.activityBaseline ?? '30-60 min',
  housingType: pet?.housingType ?? 'Apartment',
  walkSurface: pet?.walkSurface ?? 'Mixed',
  parkAccess: pet?.parkAccess ?? 'Yes',
  feedingSchedule: pet?.feedingSchedule ?? 'Twice',
  foodBrand: pet?.foodBrand ?? '',
  vetAccess: pet?.vetAccess ?? 'Regular Vet',
  conditions: listToCsv(pet?.conditions),
  medications: listToCsv(pet?.medications),
  primaryVetName: pet?.primaryVetName ?? '',
  primaryVetPhone: pet?.primaryVetPhone ?? '',
  emergencyContactName: pet?.emergencyContactName ?? '',
  emergencyContactPhone: pet?.emergencyContactPhone ?? '',
  allergies: listToCsv(pet?.allergies),
  interests: listToCsv(pet?.interests),
  goals: listToCsv(pet?.goals)
});

const buildQuickUpdateDraft = (pet?: PetData, date?: string) => ({
  date: date || new Date().toISOString().slice(0, 10),
  weight: pet?.weight ?? '15',
  dietType: pet?.dietType ?? 'Home Cooked',
  activityLevel: pet?.activityLevel ?? 'Moderate',
  notes: ''
});

type PetUpdateEntry = {
  id?: string;
  date: string;
  weight?: string;
  dietType?: string;
  activityLevel?: string;
  notes?: string;
};

const mapPetUpdateRecord = (record: PetUpdateRecord): PetUpdateEntry => ({
  id: record.id,
  date: record.updateDate,
  weight: record.weightValue !== null && record.weightValue !== undefined ? String(record.weightValue) : undefined,
  dietType: record.dietType ?? undefined,
  activityLevel: record.activityLevel ?? undefined,
  notes: record.notes ?? undefined
});

const mapDietLogRecord = (record: DietLogRecord): DietLogEntry => ({
  id: record.id,
  logDate: record.logDate,
  mealType: record.mealType ?? null,
  dietType: record.dietType ?? null,
  actualFood: record.actualFood ?? null,
  synced: true
});

const buildDietLogKey = (entry: DietLogEntry) =>
  `${entry.logDate}|${entry.mealType ?? ''}|${entry.dietType ?? ''}|${entry.actualFood ?? ''}`;
const dedupeDietLogEntries = (entries: DietLogEntry[]) => {
  const seen = new Set<string>();
  return entries.filter(entry => {
    const key = buildDietLogKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const buildCareRequestKey = (entry: CareRequestRecord) =>
  `${entry.requestType}|${entry.concern ?? ''}|${entry.preferredTime ?? ''}|${entry.urgency ?? ''}|${entry.createdAt ?? ''}`;

const mapActivityLogRecord = (record: ActivityLogRecord, advice?: string): ActivityLog => {
  const type = ['Walk', 'Play', 'Training'].includes(record.activityType) ? record.activityType as ActivityLog['type'] : 'Walk';
  return {
    id: record.id,
    type,
    duration: record.durationMinutes,
    timestamp: new Date(record.occurredAt),
    advice: advice || (record.intensity ? `Intensity: ${record.intensity}` : 'Logged activity.'),
    notes: record.notes ?? undefined
  };
};

const Dashboard: React.FC<Props> = ({ user, setUser, onUpgrade, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'nutri' | 'play' | 'triage' | 'parent' | 'adoption'>('home');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [microTips, setMicroTips] = useState<MicroTip[]>([]);
  const [petEvents, setPetEvents] = useState<PetEvent[]>([]);
  const [briefIndex, setBriefIndex] = useState(0);
  const [safetyRadar, setSafetyRadar] = useState<SafetyRadar | null>(null);
  const [nearbyServices, setNearbyServices] = useState<NearbyService[]>([]);
  const [checklistSections, setChecklistSections] = useState<ChecklistSection[]>([]);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [checklistStreak, setChecklistStreak] = useState(0);
  const [lastChecklistDate, setLastChecklistDate] = useState('');
  const [checklistHistory, setChecklistHistory] = useState<ChecklistHistoryPoint[]>([]);
  const [customChecklist, setCustomChecklist] = useState<CustomChecklistItem[]>([]);
  const [customChecklistDraft, setCustomChecklistDraft] = useState({
    label: '',
    frequency: 'daily' as CustomChecklistItem['frequency'],
    remindTime: '',
    notifyEnabled: false
  });
  const [checklistOverrides, setChecklistOverrides] = useState<Record<string, ChecklistOverride>>({});
  const [checklistEditor, setChecklistEditor] = useState<{
    id: string;
    label: string;
    frequency: 'daily' | 'weekly';
    remindTime: string;
    notifyEnabled: boolean;
  } | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [showServices, setShowServices] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showPetProfileEditor, setShowPetProfileEditor] = useState(false);
  const [showPetQuickUpdate, setShowPetQuickUpdate] = useState(false);
  const [showTreats, setShowTreats] = useState(false);
  const [quickUpdateMode, setQuickUpdateMode] = useState<QuickUpdateMode>('weekly');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileView, setProfileView] = useState<'pet' | 'parent'>('pet');
  const [trendRange, setTrendRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedCheckinId, setSelectedCheckinId] = useState<string>('latest');
  const [petDraft, setPetDraft] = useState(() => buildPetDraft(user.pet));
  const [quickUpdateDraft, setQuickUpdateDraft] = useState(() => buildQuickUpdateDraft(user.pet));
  const [petSaveState, setPetSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [petSaveError, setPetSaveError] = useState('');
  const [parentDraft, setParentDraft] = useState({ email: '', fullName: '', phone: '' });
  const [parentSaveState, setParentSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [parentSaveError, setParentSaveError] = useState('');
  const [petUpdates, setPetUpdates] = useState<PetUpdateEntry[]>([]);
  const [dietLogs, setDietLogs] = useState<DietLogEntry[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [dietLogDraft, setDietLogDraft] = useState({
    logDate: new Date().toISOString().slice(0, 10),
    mealType: 'Breakfast',
    dietType: 'Home Cooked',
    actualFood: ''
  });
  const [medicalEventDraft, setMedicalEventDraft] = useState({
    eventType: 'Vaccine',
    dateAdministered: new Date().toISOString().slice(0, 10),
    nextDue: '',
    verifiedBy: '',
    notes: ''
  });
  const [symptomLogDraft, setSymptomLogDraft] = useState({
    occurredAt: new Date().toISOString().slice(0, 16),
    symptomType: '',
    severity: 2,
    notes: ''
  });
  const [feedbackDraft, setFeedbackDraft] = useState({
    rating: 9,
    category: 'Parent Dashboard',
    sentiment: 'Positive',
    message: '',
    tags: 'trend,insights'
  });
  const [toast, setToast] = useState<{ message: string; tone: 'error' | 'success' } | null>(null);
  const toastTimeout = useRef<number | null>(null);
  const dietSyncingRef = useRef(false);
  const careSyncingRef = useRef(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [treatsLedger, setTreatsLedger] = useState({ activities: 0, updates: 0 });
  const [showSymptomDetails, setShowSymptomDetails] = useState(false);
  const [showCareRequest, setShowCareRequest] = useState(false);
  const [showVetBrief, setShowVetBrief] = useState(false);
  const [vetBriefRangeDays, setVetBriefRangeDays] = useState<VetBriefRange>(30);
  const [selectedTriage, setSelectedTriage] = useState<CareRequestRecord | null>(null);
  const [careRequestDraft, setCareRequestDraft] = useState({
    type: 'Triage',
    concern: '',
    notes: '',
    preferredTime: '',
    phone: '',
    location: '',
    urgency: 'Monitor',
    reportType: ''
  });
  const [symptomLogs, setSymptomLogs] = useState<SymptomLogEntry[]>([]);
  const [medicalEvents, setMedicalEvents] = useState<MedicalEventEntry[]>([]);
  const [showMedicalSchedule, setShowMedicalSchedule] = useState(false);
  const [careRequests, setCareRequests] = useState<CareRequestRecord[]>([]);
  const [reminderDraft, setReminderDraft] = useState<Reminder>({
    id: '',
    title: '',
    date: '',
    repeat: 'None',
    notes: ''
  });
  const [expandedTraining, setExpandedTraining] = useState<number | null>(null);
  const [expandedChecklist, setExpandedChecklist] = useState<number | null>(null);
  const [dailyGame, setDailyGame] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [insightMetric, setInsightMetric] = useState<'weight' | 'activity' | 'diet'>('weight');
  const [showChecklist, setShowChecklist] = useState(false);
  const [claimedTreats, setClaimedTreats] = useState(0);
  
  // Nutri Lens State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lensResult, setLensResult] = useState<NutriLensResult | null>(null);
  
  // Activity State
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState<'Walk' | 'Play' | 'Training'>('Walk');
  const [logDuration, setLogDuration] = useState('20');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logNotes, setLogNotes] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Walk' | 'Play' | 'Training'>('All');
  const [filterDate, setFilterDate] = useState<'All' | 'Today' | 'Week'>('All');

  const resolvedTier = (user.tier ?? (user.isPremium ? 'pro' : 'free')).toLowerCase();
  const tierRank = (tier: string) => {
    switch (tier) {
      case 'plus':
        return 1;
      case 'pro':
        return 2;
      case 'elite':
        return 3;
      default:
        return 0;
    }
  };
  const hasTier = (minTier: 'plus' | 'pro' | 'elite') => tierRank(resolvedTier) >= tierRank(minTier);
  const renderLocked = (title: string, message: string, cta: string) => (
    <div className="bg-white border border-brand-100 rounded-[3.5rem] p-12 text-center shadow-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">{title}</p>
      <h3 className="text-3xl font-display font-black text-brand-900 mt-4">Unlock expert care</h3>
      <p className="text-sm text-brand-800/60 mt-3 max-w-md mx-auto">{message}</p>
      <button
        onClick={() => setShowPayment(true)}
        className="mt-8 px-8 py-4 rounded-full bg-brand-900 text-white text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all"
      >
        {cta}
      </button>
    </div>
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  const showToast = (message: string, tone: 'error' | 'success' = 'error') => {
    setToast({ message, tone });
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => {
      setToast(null);
    }, 3500);
  };
  const handleCopyVetBrief = async () => {
    try {
      await navigator.clipboard.writeText(vetBriefText);
      showToast('Vet brief copied.', 'success');
    } catch {
      showToast('Unable to copy vet brief.', 'error');
    }
  };
  const handlePrintVetBrief = () => {
    const petName = user.pet?.name || 'Pet';
    const printWindow = window.open('', 'pawveda-vet-brief', 'width=920,height=720');
    if (!printWindow) {
      showToast('Popup blocked. Allow popups to export.', 'error');
      return;
    }
    const safeName = escapeHtml(petName);
    printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Vet Brief - ${safeName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #2F1B0C; }
    h1 { margin: 0; font-size: 26px; }
    h2 { font-size: 16px; margin: 20px 0 8px; }
    .report-header { border: 1px solid #F2C7A5; border-radius: 18px; padding: 18px 20px; background: linear-gradient(135deg, #FFF5EA 0%, #FFE3C9 100%); }
    .brand-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .brand-title { font-size: 22px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #7A3D12; }
    .brand-chip { font-size: 10px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; background: #F59F5B; color: #fff; padding: 6px 10px; border-radius: 999px; }
    .report-footer { margin-top: 18px; border-top: 1px solid #F2C7A5; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: #9A6B44; }
    .brand-bar { height: 8px; border-radius: 999px; background: linear-gradient(90deg, #F59F5B 0%, #F0743E 50%, #F9C38E 100%); margin: 18px 0; }
    .hero { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
    .card { border: 1px solid #E6D9CF; border-radius: 16px; padding: 14px; background: #FFF9F3; }
    .eyebrow { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #B28A6B; margin: 0 0 6px; }
    .muted { color: #7B5E48; font-size: 12px; margin: 6px 0 0; }
    .chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .chip { border: 1px solid #E6D9CF; border-radius: 999px; padding: 4px 10px; font-size: 11px; background: #FFF; }
    .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid transparent; margin-bottom: 6px; }
    .pill-urgent { background: #FDE8E8; color: #B42318; border-color: #F9BDBD; }
    .pill-soon { background: #FFF4E5; color: #B45309; border-color: #FBD38D; }
    .pill-monitor { background: #ECFDF3; color: #027A48; border-color: #A6F4C5; }
    .meta { font-size: 12px; color: #7B5E48; margin: 8px 0 0; }
    .content { font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #E6D9CF; padding: 6px 8px; font-size: 12px; vertical-align: top; }
    th { background: #FFE3C9; color: #7A3D12; text-align: left; letter-spacing: 0.08em; text-transform: uppercase; font-size: 10px; }
    tbody tr:nth-child(odd) td { background: #FFF9F3; }
    .sparkline { border: 1px solid #E6D9CF; border-radius: 12px; padding: 10px; background: #FFF; }
    .sparkline svg { width: 100%; height: 60px; display: block; }
    .spark-labels { display: flex; justify-content: space-between; font-size: 10px; color: #B28A6B; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.08em; }
    .spark-empty { font-size: 11px; color: #7B5E48; }
    .note { font-size: 11px; color: #7B5E48; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="brand-row">
      <div>
        <div class="brand-title">Pawveda Vet Brief</div>
        <div class="meta">Generated for ${safeName} | Data range: ${escapeHtml(vetBriefRangeLabel)}</div>
      </div>
      <div class="brand-chip">Pawveda Care</div>
    </div>
  </div>
  <div class="brand-bar"></div>
  <div class="content">${vetBriefHtml}</div>
  <div class="brand-bar"></div>
  <div class="report-footer">
    <span>Not a diagnosis. Share with your veterinarian.</span>
    <span>${new Date().toLocaleDateString('en-IN')}</span>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const dateKey = (value: Date) => value.toISOString().slice(0, 10);

  const getChecklistStorageKey = (pet?: PetData) =>
    `pawveda_checklist_${pet?.name || 'guest'}_${pet?.city || 'city'}`;

  const getCustomChecklistStorageKey = (pet?: PetData) =>
    `pawveda_custom_checklist_${pet?.id || pet?.name || 'guest'}_${pet?.city || 'city'}`;

  const persistChecklistOverrides = (pet: PetData | undefined, overrides: Record<string, ChecklistOverride>) => {
    if (!pet) return;
    try {
      localStorage.setItem(getChecklistOverrideKey(pet), JSON.stringify(overrides));
    } catch {
      // ignore
    }
  };

  const getReminderStorageKey = (pet?: PetData) =>
    `pawveda_reminders_${pet?.name || 'guest'}_${pet?.city || 'city'}`;

  const getPetUpdateStorageKey = (pet?: PetData) =>
    `pawveda_pet_updates_${pet?.id || pet?.name || 'guest'}_${pet?.city || 'city'}`;

  const getDietLogStorageKey = (pet?: PetData) =>
    `pawveda_diet_logs_${pet?.id || pet?.name || 'guest'}_${pet?.city || 'city'}`;
  const getLegacyDietLogStorageKey = (pet?: PetData) =>
    `pawveda_diet_logs_${pet?.name || 'guest'}_${pet?.city || 'city'}`;

  const getTreatsStorageKey = (pet?: PetData) =>
    `pawveda_treats_claimed_${pet?.id || pet?.name || 'guest'}_${pet?.city || 'city'}`;

  const getChecklistIds = (sections: ChecklistSection[]) =>
    sections.flatMap(section => section.items.map(item => item.id));

  const persistChecklist = (
    pet: PetData | undefined,
    completed: Record<string, boolean>,
    streak: number,
    lastCompletedDate: string,
    history: ChecklistHistoryPoint[]
  ) => {
    if (!pet) return;
    try {
      const payload = {
        date: dateKey(new Date()),
        streak,
        lastCompletedDate,
        completed,
        history
      };
      localStorage.setItem(getChecklistStorageKey(pet), JSON.stringify(payload));
    } catch {
      // ignore
    }
  };

  const persistCustomChecklist = (pet: PetData | undefined, items: CustomChecklistItem[]) => {
    if (!pet) return;
    try {
      localStorage.setItem(getCustomChecklistStorageKey(pet), JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const mergeHistory = (
    existing: ChecklistHistoryPoint[],
    date: string,
    completion: number
  ) => {
    const updated = [...existing];
    const index = updated.findIndex(point => point.date === date);
    if (index >= 0) {
      updated[index] = { date, completion };
    } else {
      updated.push({ date, completion });
    }
    return updated.slice(-7);
  };

  const persistReminders = (pet: PetData | undefined, items: Reminder[]) => {
    if (!pet) return;
    try {
      localStorage.setItem(getReminderStorageKey(pet), JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const persistPetUpdates = (pet: PetData | undefined, updates: PetUpdateEntry[]) => {
    if (!pet) return;
    try {
      localStorage.setItem(getPetUpdateStorageKey(pet), JSON.stringify(updates));
    } catch {
      // ignore
    }
  };

  const persistDietLogs = (pet: PetData | undefined, logs: DietLogEntry[]) => {
    if (!pet) return;
    try {
      localStorage.setItem(getDietLogStorageKey(pet), JSON.stringify(logs));
    } catch {
      // ignore
    }
  };

  const logPetUpdate = (pet: PetData | undefined, entry: PetUpdateEntry) => {
    if (!pet) return;
    const next = [...petUpdates];
    const existingIndex = entry.id
      ? next.findIndex(item => item.id === entry.id)
      : -1;
    if (existingIndex >= 0) {
      next[existingIndex] = { ...next[existingIndex], ...entry };
    } else {
      next.unshift(entry);
    }
    const trimmed = next.slice(0, 12);
    setPetUpdates(trimmed);
    persistPetUpdates(pet, trimmed);
  };

  const logDietLog = (pet: PetData | undefined, entry: DietLogEntry) => {
    if (!pet) return;
    setDietLogs(prev => {
      const next = [entry, ...prev].slice(0, 30);
      persistDietLogs(pet, next);
      return next;
    });
  };

  const replaceDietLog = (pet: PetData | undefined, localId: string, entry: DietLogEntry) => {
    if (!pet) return;
    setDietLogs(prev => {
      const replaced = prev.map(item => (item.id === localId ? entry : item));
      const exists = replaced.some(item => item.id === entry.id);
      const next = exists ? replaced : [entry, ...replaced];
      const trimmed = next.slice(0, 30);
      persistDietLogs(pet, trimmed);
      return trimmed;
    });
  };

  const mergeDietLogs = (remote: DietLogEntry[], local: DietLogEntry[]) => {
    const seen = new Set(remote.map(buildDietLogKey));
    const pending = local.filter(entry => entry.synced === false && !seen.has(buildDietLogKey(entry)));
    const combined = dedupeDietLogEntries([...pending, ...remote]);
    return combined
      .sort((a, b) => b.logDate.localeCompare(a.logDate))
      .slice(0, 30);
  };

  const mergeCareRequests = (remote: CareRequestRecord[], local: CareRequestRecord[]) => {
    const seen = new Set(remote.map(buildCareRequestKey));
    const pending = local.filter(entry => entry.id.startsWith('local-') && !seen.has(buildCareRequestKey(entry)));
    const combined = [...pending, ...remote];
    return combined
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 20);
  };

  const openParentProfile = () => {
    const sessionUser = (getAuthSession()?.user as { email?: string; fullName?: string; phoneE164?: string } | undefined) || {};
    setParentDraft({
      email: sessionUser.email || '',
      fullName: sessionUser.fullName || '',
      phone: sessionUser.phoneE164 || ''
    });
    setParentSaveState('idle');
    setParentSaveError('');
    setProfileView('parent');
  };

  useEffect(() => {
    if (!parentDraft.email && user.isLoggedIn) {
      const sessionUser = (getAuthSession()?.user as { email?: string; fullName?: string; phoneE164?: string } | undefined) || {};
      if (sessionUser.email) {
        setParentDraft({
          email: sessionUser.email || '',
          fullName: sessionUser.fullName || '',
          phone: sessionUser.phoneE164 || ''
        });
      }
    }
  }, [parentDraft.email, user.isLoggedIn]);

  const openPetProfileEditor = () => {
    setPetDraft(buildPetDraft(user.pet));
    setPetSaveState('idle');
    setPetSaveError('');
    setShowPetProfileEditor(true);
  };

  const openPetQuickUpdate = (date?: string, mode: QuickUpdateMode = 'weekly') => {
    setQuickUpdateMode(mode);
    setQuickUpdateDraft(buildQuickUpdateDraft(user.pet, date));
    setPetSaveState('idle');
    setPetSaveError('');
    setShowPetQuickUpdate(true);
  };

  const openTriageModal = () => {
    setCareRequestDraft({
      type: 'Triage',
      concern: '',
      notes: '',
      preferredTime: '',
      phone: '',
      location: '',
      urgency: 'Monitor',
      reportType: ''
    });
    setShowCareRequest(true);
  };

  const ensurePetId = async () => {
    if (user.pet?.id) {
      return user.pet.id;
    }
    try {
      const profiles = await apiClient.get<any[]>('/api/pets', { auth: true });
      const profile = Array.isArray(profiles) && profiles.length ? profiles[0] : null;
      if (profile?.id && user.pet) {
        setUser({ ...user, pet: { ...user.pet, id: profile.id } });
      }
      return profile?.id ?? null;
    } catch {
      return null;
    }
  };

  const handleSavePetProfile = async () => {
    if (!user.pet) {
      const message = 'Pet profile not found.';
      setPetSaveState('error');
      setPetSaveError(message);
      showToast(message, 'error');
      return;
    }
    setPetSaveState('saving');
    setPetSaveError('');
    try {
      const petId = await ensurePetId();
      if (!petId) {
        throw new Error('Unable to locate pet profile.');
      }
      await apiClient.patch(
        `/api/pets/${petId}`,
        {
          name: petDraft.name,
          breed: petDraft.breed,
          age: petDraft.age,
          ageMonths: petDraft.ageMonths || null,
          weight: petDraft.weight,
          dietType: petDraft.dietType,
          gender: petDraft.gender,
          activityLevel: petDraft.activityLevel,
          city: petDraft.city,
          spayNeuterStatus: petDraft.spayNeuterStatus,
          vaccinationStatus: petDraft.vaccinationStatus,
          lastVaccineDate: petDraft.lastVaccineDate || null,
          lastVetVisitDate: petDraft.lastVetVisitDate || null,
          activityBaseline: petDraft.activityBaseline,
          housingType: petDraft.housingType,
          walkSurface: petDraft.walkSurface,
          parkAccess: petDraft.parkAccess,
          feedingSchedule: petDraft.feedingSchedule,
          foodBrand: petDraft.foodBrand,
          vetAccess: petDraft.vetAccess,
          conditions: csvToList(petDraft.conditions),
          medications: csvToList(petDraft.medications),
          primaryVetName: petDraft.primaryVetName || null,
          primaryVetPhone: petDraft.primaryVetPhone || null,
          emergencyContactName: petDraft.emergencyContactName || null,
          emergencyContactPhone: petDraft.emergencyContactPhone || null,
          allergies: csvToList(petDraft.allergies),
          interests: csvToList(petDraft.interests),
          goals: csvToList(petDraft.goals)
        },
        { auth: true }
      );
      logPetUpdate(user.pet, {
        date: dateKey(new Date()),
        weight: petDraft.weight,
        dietType: petDraft.dietType,
        activityLevel: petDraft.activityLevel
      });
      const updatedPet: PetData = {
        ...user.pet,
        ...petDraft,
        id: user.pet.id
      };
      updatedPet.conditions = csvToList(petDraft.conditions);
      updatedPet.medications = csvToList(petDraft.medications);
      updatedPet.allergies = csvToList(petDraft.allergies);
      updatedPet.interests = csvToList(petDraft.interests);
      updatedPet.goals = csvToList(petDraft.goals);
      setUser({ ...user, pet: updatedPet });
      setPetSaveState('success');
      showToast('Pet profile updated.', 'success');
      setShowPetProfileEditor(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update pet profile.';
      setPetSaveState('error');
      setPetSaveError(message);
      showToast(message, 'error');
    }
  };

  const handleSavePetQuickUpdate = async (): Promise<boolean> => {
    if (!user.pet) {
      const message = 'Pet profile not found.';
      setPetSaveState('error');
      setPetSaveError(message);
      showToast(message, 'error');
      return false;
    }
    const parsedWeight = Number(quickUpdateDraft.weight);
    if (Number.isNaN(parsedWeight)) {
      showToast('Enter a valid weight to save the weekly update.', 'error');
      return false;
    }
    setPetSaveState('saving');
    setPetSaveError('');
    try {
      const petId = await ensurePetId();
      const localEntry: PetUpdateEntry = {
        id: `local-${Date.now()}`,
        date: quickUpdateDraft.date || dateKey(new Date()),
        weight: quickUpdateDraft.weight,
        dietType: quickUpdateDraft.dietType,
        activityLevel: quickUpdateDraft.activityLevel,
        notes: quickUpdateDraft.notes
      };
      logPetUpdate(user.pet, localEntry);
      setUser({
        ...user,
        pet: {
          ...user.pet,
          weight: quickUpdateDraft.weight,
          dietType: quickUpdateDraft.dietType,
          activityLevel: quickUpdateDraft.activityLevel
        }
      });
      setTreatsLedger(prev => ({ ...prev, updates: prev.updates + 1 }));
      if (!petId) {
        setPetSaveState('success');
        showToast('Saved locally. Sync pending.', 'success');
        return true;
      }
      await apiClient.patch(
        `/api/pets/${petId}`,
        {
          weight: quickUpdateDraft.weight,
          dietType: quickUpdateDraft.dietType,
          activityLevel: quickUpdateDraft.activityLevel
        },
        { auth: true }
      );
      await createPetUpdate({
        petId,
        updateDate: quickUpdateDraft.date || dateKey(new Date()),
        weightValue: Number.isNaN(parsedWeight) ? null : parsedWeight,
        weightUnit: 'kg',
        dietType: quickUpdateDraft.dietType,
        activityLevel: quickUpdateDraft.activityLevel,
        notes: quickUpdateDraft.notes
      });
      setPetSaveState('success');
      showToast('Update logged.', 'success');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sync update.';
      setPetSaveState('success');
      setPetSaveError('');
      showToast(`Saved locally. ${message}`, 'success');
      return true;
    }
  };

  const handleSaveParentProfile = async () => {
    setParentSaveState('saving');
    setParentSaveError('');
    try {
      const data = await apiClient.patch<{
        id: string;
        email: string;
        fullName?: string | null;
        role?: string | null;
        tier?: string | null;
      }>(
        '/api/me',
        {
          fullName: parentDraft.fullName || null,
          phoneE164: parentDraft.phone || null
        },
        { auth: true }
      );
      const session = getAuthSession();
      if (session?.accessToken) {
        setAuthSession({
          ...session,
          user: { ...(session.user as object), ...data }
        });
      }
      setParentSaveState('success');
      showToast('Parent profile updated.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update parent profile.';
      setParentSaveState('error');
      setParentSaveError(message);
      showToast(message, 'error');
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    const loadData = async () => {
      if (user.pet) {
        const sections = getChecklist(user.pet);
        setChecklistSections(sections);
        setMicroTips(getMicroTips(user.pet));
        const storedKey = getChecklistStorageKey(user.pet);
        const ids = getChecklistIds(sections);
        const blankState = ids.reduce((acc, id) => ({ ...acc, [id]: false }), {} as Record<string, boolean>);
        try {
          const stored = localStorage.getItem(storedKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            const today = dateKey(new Date());
            const completed =
              parsed?.date === today && parsed?.completed
                ? { ...blankState, ...parsed.completed }
                : blankState;
            setChecklistState(completed);
            setChecklistStreak(parsed?.streak || 0);
            setLastChecklistDate(parsed?.lastCompletedDate || "");
            setChecklistHistory(
              Array.isArray(parsed?.history) && parsed.history.length ? parsed.history : seedChecklistHistory()
            );
          } else {
            setChecklistState(blankState);
            setChecklistStreak(0);
            setLastChecklistDate("");
            setChecklistHistory(seedChecklistHistory());
          }
        } catch {
          setChecklistState(blankState);
          setChecklistStreak(0);
          setLastChecklistDate("");
          setChecklistHistory(seedChecklistHistory());
        }

        try {
          const customStored = localStorage.getItem(getCustomChecklistStorageKey(user.pet));
          if (customStored) {
            const parsed = JSON.parse(customStored);
            setCustomChecklist(Array.isArray(parsed) ? parsed : []);
          } else {
            setCustomChecklist([]);
          }
        } catch {
          setCustomChecklist([]);
        }

        try {
          const overridesStored = localStorage.getItem(getChecklistOverrideKey(user.pet));
          if (overridesStored) {
            const parsed = JSON.parse(overridesStored);
            setChecklistOverrides(parsed && typeof parsed === 'object' ? parsed : {});
          } else {
            setChecklistOverrides({});
          }
        } catch {
          setChecklistOverrides({});
        }

        try {
          const treatsStored = localStorage.getItem(getTreatsStorageKey(user.pet));
          if (treatsStored) {
            const parsed = JSON.parse(treatsStored);
            setClaimedTreats(typeof parsed === 'number' ? parsed : 0);
          } else {
            setClaimedTreats(0);
          }
        } catch {
          setClaimedTreats(0);
        }

        try {
          const reminderStored = localStorage.getItem(getReminderStorageKey(user.pet));
          if (reminderStored) {
            const parsed = JSON.parse(reminderStored);
            setReminders(Array.isArray(parsed) ? parsed : []);
          } else {
            setReminders([]);
          }
        } catch {
          setReminders([]);
        }

        try {
          const symptomStored = localStorage.getItem(getSymptomLogStorageKey(user.pet));
          if (symptomStored) {
            const parsed = JSON.parse(symptomStored);
            setSymptomLogs(Array.isArray(parsed) ? parsed : []);
          } else {
            const legacyKey = getLegacySymptomLogStorageKey(user.pet);
            const legacyStored = localStorage.getItem(legacyKey);
            if (legacyStored) {
              const parsed = JSON.parse(legacyStored);
              setSymptomLogs(Array.isArray(parsed) ? parsed : []);
            } else {
              setSymptomLogs([]);
            }
          }
        } catch {
          setSymptomLogs([]);
        }

        try {
          const medicalStored = localStorage.getItem(getMedicalEventStorageKey(user.pet));
          if (medicalStored) {
            const parsed = JSON.parse(medicalStored);
            setMedicalEvents(Array.isArray(parsed) ? parsed : []);
          } else {
            const legacyKey = getLegacyMedicalEventStorageKey(user.pet);
            const legacyStored = localStorage.getItem(legacyKey);
            if (legacyStored) {
              const parsed = JSON.parse(legacyStored);
              setMedicalEvents(Array.isArray(parsed) ? parsed : []);
            } else {
              setMedicalEvents([]);
            }
          }
        } catch {
          setMedicalEvents([]);
        }

        try {
          const updatesStored = localStorage.getItem(getPetUpdateStorageKey(user.pet));
          if (updatesStored) {
            const parsed = JSON.parse(updatesStored);
            setPetUpdates(Array.isArray(parsed) ? parsed : []);
          } else {
            setPetUpdates([]);
          }
        } catch {
          setPetUpdates([]);
        }

        try {
          const dietStored = localStorage.getItem(getDietLogStorageKey(user.pet));
          if (dietStored) {
            const parsed = JSON.parse(dietStored);
            setDietLogs(Array.isArray(parsed) ? parsed : []);
          } else {
            const legacyKey = getLegacyDietLogStorageKey(user.pet);
            const legacyStored = localStorage.getItem(legacyKey);
            if (legacyStored) {
              const parsed = JSON.parse(legacyStored);
              setDietLogs(Array.isArray(parsed) ? parsed : []);
            } else {
              setDietLogs([]);
            }
          }
        } catch {
          setDietLogs([]);
        }

        try {
          const triageStored = localStorage.getItem('pawveda_triage_sessions');
          if (triageStored) {
            const parsed = JSON.parse(triageStored);
            setCareRequests(Array.isArray(parsed) ? parsed : []);
          } else {
            setCareRequests([]);
          }
        } catch {
          setCareRequests([]);
        }

        const results = await Promise.allSettled([
          fetchPetEvents(user.pet.city),
          fetchSafetyRadar(user.pet.city),
          fetchNearbyServices(user.pet.city),
          generatePlayPlan(user.pet)
        ]);
        const [eventsResult, radarResult, servicesResult, gameResult] = results;
        if (eventsResult.status === 'fulfilled') {
          setPetEvents(eventsResult.value);
        } else {
          setPetEvents([]);
        }
        if (radarResult.status === 'fulfilled') {
          setSafetyRadar(radarResult.value);
        } else {
          setSafetyRadar(null);
        }
        if (servicesResult.status === 'fulfilled') {
          setNearbyServices(servicesResult.value);
        } else {
          setNearbyServices([]);
        }
        if (gameResult.status === 'fulfilled') {
          setDailyGame(gameResult.value);
        } else {
          setDailyGame('');
        }
      }
    };
    loadData();
  }, [user.pet]);

  useEffect(() => {
    const loadDashboardInsights = async () => {
      if (!user.pet || !user.isLoggedIn) return;
      const petId = user.pet.id || await ensurePetId();
      if (!petId) return;
      const rangeDays = trendRange === 'daily' ? 1 : trendRange === 'weekly' ? 7 : 30;
      const results = await Promise.allSettled([
        fetchDashboardSummary(petId, trendRange),
        fetchPetUpdates(petId, rangeDays),
        fetchActivityLogs(petId, rangeDays),
        fetchTriageSessions(petId),
        fetchDietLogs(petId, 365)
      ]);
      const [summaryResult, updatesResult, activityResult, careResult, dietResult] = results;
      if (summaryResult.status === 'fulfilled') {
        setDashboardSummary(summaryResult.value);
      }
      if (updatesResult.status === 'fulfilled') {
        setPetUpdates(updatesResult.value.map(mapPetUpdateRecord));
      }
      if (activityResult.status === 'fulfilled') {
        const mapped = activityResult.value.map(record => mapActivityLogRecord(record));
        setUser({ ...user, activities: mapped });
      }
      if (careResult.status === 'fulfilled') {
        setCareRequests(prev => {
          const merged = mergeCareRequests(careResult.value, prev);
          try {
            localStorage.setItem('pawveda_triage_sessions', JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
      }
      if (dietResult.status === 'fulfilled') {
        const mapped = dietResult.value.map(mapDietLogRecord);
        setDietLogs(prev => {
          const merged = mergeDietLogs(mapped, prev);
          persistDietLogs(user.pet, merged);
          return merged;
        });
      }
    };
    loadDashboardInsights();
  }, [user.pet, user.isLoggedIn, trendRange]);

  useEffect(() => {
    const syncDietLogs = async () => {
      if (!user.pet || !user.isLoggedIn) return;
      if (dietSyncingRef.current) return;
      const pending = dietLogs.filter(entry => entry.synced === false);
      if (!pending.length) return;
      const petId = user.pet.id || await ensurePetId();
      if (!petId) return;
      dietSyncingRef.current = true;
      const results = await Promise.allSettled(
        pending.map(entry =>
          createDietLog({
            petId,
            logDate: entry.logDate,
            mealType: entry.mealType,
            dietType: entry.dietType || null,
            actualFood: entry.actualFood || null
          })
        )
      );
      const synced = results
        .map((result, index) => ({ result, localId: pending[index].id }))
        .filter((item): item is { result: PromiseFulfilledResult<DietLogRecord>; localId: string } => item.result.status === 'fulfilled' && !!item.localId)
        .map(item => ({ localId: item.localId, entry: mapDietLogRecord(item.result.value) }));
      if (synced.length) {
        setDietLogs(prev => {
          let next = [...prev];
          synced.forEach(({ localId, entry }) => {
            const index = next.findIndex(item => item.id === localId);
            if (index >= 0) {
              next[index] = entry;
            } else {
              next = [entry, ...next];
            }
          });
          const trimmed = dedupeDietLogEntries(next).slice(0, 30);
          persistDietLogs(user.pet, trimmed);
          return trimmed;
        });
      }
      dietSyncingRef.current = false;
    };
    syncDietLogs();
  }, [dietLogs, user.pet, user.isLoggedIn]);

  useEffect(() => {
    const syncCareRequests = async () => {
      if (!user.pet || !user.isLoggedIn) return;
      if (careSyncingRef.current) return;
      const pending = careRequests.filter(entry => entry.id.startsWith('local-'));
      if (!pending.length) return;
      const petId = user.pet.id || await ensurePetId();
      if (!petId) return;
      careSyncingRef.current = true;
      const results = await Promise.allSettled(
        pending.map(entry =>
          createTriageSession({
            petId,
            requestType: entry.requestType,
            concern: entry.concern || null,
            notes: entry.notes || null,
            preferredTime: entry.preferredTime || null,
            phone: entry.phone || null,
            location: entry.location || null,
            urgency: entry.urgency || null,
            reportType: entry.reportType || null
          })
        )
      );
      const synced = results
        .map((result, index) => ({ result, localId: pending[index].id }))
        .filter((item): item is { result: PromiseFulfilledResult<CareRequestRecord>; localId: string } => item.result.status === 'fulfilled' && !!item.localId)
        .map(item => ({ localId: item.localId, entry: item.result.value }));
      if (synced.length) {
        setCareRequests(prev => {
          let next = [...prev];
          synced.forEach(({ localId, entry }) => {
            const index = next.findIndex(item => item.id === localId);
            if (index >= 0) {
              next[index] = entry;
            } else {
              next = [entry, ...next];
            }
          });
          const merged = mergeCareRequests(next, []);
          try {
            localStorage.setItem('pawveda_triage_sessions', JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
      }
      careSyncingRef.current = false;
    };
    syncCareRequests();
  }, [careRequests, user.pet, user.isLoggedIn]);

  useEffect(() => {
    const loadTreatsLedger = async () => {
      if (!user.pet || !user.isLoggedIn) return;
      const petId = user.pet.id || await ensurePetId();
      if (!petId) return;
      const results = await Promise.allSettled([
        fetchPetUpdates(petId, 3650),
        fetchActivityLogs(petId, 3650)
      ]);
      const [updatesResult, activityResult] = results;
      const updatesCount = updatesResult.status === 'fulfilled' ? updatesResult.value.length : treatsLedger.updates;
      const activityCount = activityResult.status === 'fulfilled' ? activityResult.value.length : treatsLedger.activities;
      setTreatsLedger({ updates: updatesCount, activities: activityCount });
    };
    loadTreatsLedger();
  }, [user.pet, user.isLoggedIn]);

  const deductCredit = (type: keyof UserCredits): boolean => {
    if (user.isPremium) return true;
    if (user.credits[type] > 0) {
      const newCredits = { ...user.credits, [type]: user.credits[type] - 1 };
      setUser({ ...user, credits: newCredits });
      return true;
    }
    alert(`Out of ${type} credits! Upgrade for unlimited.`);
    return false;
  };

  const handleNutriLensUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!deductCredit('nutri')) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setSelectedImage(reader.result as string);
      setIsProcessing(true);
      setLoadingMsg("Scanning Lens...");
      try {
        const res = await analyzeNutriLens(base64, user.pet!);
        setLensResult(res);
      } catch (err) {
        alert("Lens failed to capture.");
      } finally {
        setIsProcessing(false);
        setLoadingMsg("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductCredit('activity')) return;
    const durationMinutes = parseInt(logDuration) || 0;
    if (durationMinutes <= 0) {
      showToast('Add activity minutes to save the log.', 'error');
      return;
    }
    
    setIsProcessing(true);
    setLoadingMsg(`Syncing Log...`);
    
    try {
      const weather = `${user.pet?.city} current weather`;
      const advice = await suggestActivity(user.pet!, logType, weather);
      const petId = user.pet?.id || await ensurePetId();
      if (!petId) {
        throw new Error('Unable to locate pet profile.');
      }
      const created = await createActivityLog({
        petId,
        activityType: logType,
        durationMinutes,
        notes: logNotes,
        occurredAt: logDate ? new Date(`${logDate}T12:00:00`).toISOString() : new Date().toISOString()
      });
      const newAct = mapActivityLogRecord(created, advice);
      setUser({ ...user, activities: [newAct, ...user.activities] });
      setTreatsLedger(prev => ({ ...prev, activities: prev.activities + 1 }));
      setShowLogForm(false);
      setLogNotes('');
      setLogDuration('20');
      setLogDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save activity log.';
      showToast(message, 'error');
    } finally { 
      setIsProcessing(false); 
      setLoadingMsg(""); 
    }
  };

  const handleSaveDietLog = async (): Promise<boolean> => {
    if (!user.pet) return false;
    const petId = user.pet.id || await ensurePetId();
    if (!dietLogDraft.dietType && !dietLogDraft.actualFood) {
      showToast('Add a diet type or food served to save.', 'error');
      return false;
    }
    try {
      const localEntry: DietLogEntry = {
        id: `local-${Date.now()}`,
        logDate: dietLogDraft.logDate || dateKey(new Date()),
        mealType: dietLogDraft.mealType,
        dietType: dietLogDraft.dietType || null,
        actualFood: dietLogDraft.actualFood || null,
        synced: false
      };
      logDietLog(user.pet, localEntry);
      if (!petId) {
        setDietLogDraft({ ...dietLogDraft, actualFood: '' });
        showToast('Saved locally. Sync pending.', 'success');
        return true;
      }
      const created = await createDietLog({
        petId,
        logDate: dietLogDraft.logDate,
        mealType: dietLogDraft.mealType,
        dietType: dietLogDraft.dietType || null,
        actualFood: dietLogDraft.actualFood || null
      });
      replaceDietLog(user.pet, localEntry.id, mapDietLogRecord(created));
      setDietLogDraft({ ...dietLogDraft, actualFood: '' });
      showToast('Diet log saved.', 'success');
      return true;
    } catch {
      setDietLogDraft({ ...dietLogDraft, actualFood: '' });
      showToast('Saved locally. Sync pending.', 'success');
      return true;
    }
  };

  const handleSaveMedicalEvent = async (): Promise<boolean> => {
    if (!user.pet) return false;
    const petId = user.pet.id || await ensurePetId();
    if (!petId) return false;
    if (!medicalEventDraft.eventType) {
      showToast('Select a medical event type.', 'error');
      return false;
    }
    const nextEvent: MedicalEventEntry = {
      id: `${Date.now()}`,
      eventType: medicalEventDraft.eventType,
      dateAdministered: medicalEventDraft.dateAdministered || null,
      nextDue: medicalEventDraft.nextDue || null,
      verifiedBy: medicalEventDraft.verifiedBy || null,
      notes: medicalEventDraft.notes || null
    };
    const nextEvents = [nextEvent, ...medicalEvents].slice(0, 30);
    setMedicalEvents(nextEvents);
    try {
      localStorage.setItem(getMedicalEventStorageKey(user.pet), JSON.stringify(nextEvents));
      localStorage.setItem(getLegacyMedicalEventStorageKey(user.pet), JSON.stringify(nextEvents));
    } catch {
      // ignore
    }
    try {
      await createMedicalEvent({
        petId,
        eventType: medicalEventDraft.eventType,
        dateAdministered: medicalEventDraft.dateAdministered || null,
        nextDue: medicalEventDraft.nextDue || null,
        verifiedBy: medicalEventDraft.verifiedBy || null,
        notes: medicalEventDraft.notes || null
      });
      setMedicalEventDraft({ ...medicalEventDraft, notes: '' });
      showToast('Medical event saved.', 'success');
      return true;
    } catch {
      showToast('Saved locally. Sync failed—please retry when online.', 'error');
      return true;
    }
  };

  const handleSaveSymptomLog = async (): Promise<boolean> => {
    if (!user.pet) return false;
    const petId = user.pet.id || await ensurePetId();
    if (!petId) return false;
    if (!symptomLogDraft.symptomType) {
      showToast('Add a symptom to save.', 'error');
      return false;
    }
    const occurredAt = symptomLogDraft.occurredAt
      ? new Date(symptomLogDraft.occurredAt).toISOString()
      : new Date().toISOString();
    const nextSymptom: SymptomLogEntry = {
      id: `${Date.now()}`,
      symptomType: symptomLogDraft.symptomType || 'General',
      occurredAt,
      severity: symptomLogDraft.severity,
      notes: symptomLogDraft.notes || null
    };
    const nextLogs = [nextSymptom, ...symptomLogs].slice(0, 30);
    setSymptomLogs(nextLogs);
    try {
      localStorage.setItem(getSymptomLogStorageKey(user.pet), JSON.stringify(nextLogs));
      localStorage.setItem(getLegacySymptomLogStorageKey(user.pet), JSON.stringify(nextLogs));
    } catch {
      // ignore
    }
    setSymptomLogDraft({ ...symptomLogDraft, symptomType: '', notes: '' });
    try {
      await createSymptomLog({
        petId,
        symptomType: nextSymptom.symptomType,
        occurredAt,
        severity: nextSymptom.severity,
        notes: nextSymptom.notes || null
      });
      showToast('Symptom log saved.', 'success');
      return true;
    } catch {
      showToast('Saved locally. Sync failed—please retry when online.', 'error');
      return true;
    }
  };

  const handleSaveCareRequest = async () => {
    if (!user.pet) return;
    const petId = user.pet.id || await ensurePetId();
    if (!petId) return;
    if (!careRequestDraft.concern.trim()) {
      showToast('Add a primary concern to continue.', 'error');
      return;
    }
    const createdAt = new Date().toISOString();
    const localEntry: CareRequestRecord = {
      id: `local-${Date.now()}`,
      petId,
      requestType: careRequestDraft.type,
      concern: careRequestDraft.concern || null,
      notes: careRequestDraft.notes || null,
      preferredTime: careRequestDraft.preferredTime || null,
      phone: careRequestDraft.phone || null,
      location: careRequestDraft.location || null,
      urgency: careRequestDraft.urgency || null,
      reportType: careRequestDraft.reportType || null,
      status: 'logged',
      createdAt
    };
    const optimistic = [localEntry, ...careRequests];
    setCareRequests(optimistic);
    try {
      localStorage.setItem('pawveda_triage_sessions', JSON.stringify(optimistic));
    } catch {
      // ignore
    }
    setSelectedTriage(localEntry);
    setShowCareRequest(false);
    const payload = {
      petId,
      requestType: careRequestDraft.type,
      concern: careRequestDraft.concern || null,
      notes: careRequestDraft.notes || null,
      preferredTime: careRequestDraft.preferredTime || null,
      phone: careRequestDraft.phone || null,
      location: careRequestDraft.location || null,
      urgency: careRequestDraft.urgency || null,
      reportType: careRequestDraft.reportType || null
    };
    try {
      const created = await createTriageSession(payload);
      const next = [created, ...optimistic.filter(item => item.id !== localEntry.id)];
      setCareRequests(next);
      try {
        localStorage.setItem('pawveda_triage_sessions', JSON.stringify(next));
      } catch {
        // ignore
      }
      setSelectedTriage(created);
      showToast('Triage submitted. Your vet brief is ready.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sync triage.';
      showToast(`Saved locally. ${message}`, 'success');
    }
  };

  const handleQuickUpdateSubmit = async () => {
    let saved = false;
    if (quickUpdateMode === 'weekly') {
      saved = await handleSavePetQuickUpdate();
    } else if (quickUpdateMode === 'diet') {
      saved = await handleSaveDietLog();
    } else if (quickUpdateMode === 'medical') {
      saved = await handleSaveMedicalEvent();
    } else {
      saved = await handleSaveSymptomLog();
    }
    if (saved) {
      setShowPetQuickUpdate(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!user.pet) return;
    const petId = user.pet.id || await ensurePetId();
    if (!petId) return;
    try {
      const tags = feedbackDraft.tags
        ? feedbackDraft.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];
      await createParentFeedback({
        petId,
        rating: feedbackDraft.rating,
        category: feedbackDraft.category,
        sentiment: feedbackDraft.sentiment,
        message: feedbackDraft.message,
        tags
      });
      setFeedbackDraft({ ...feedbackDraft, message: '' });
      showToast('Feedback sent. Thanks!', 'success');
    } catch {
      showToast('Unable to send feedback.', 'error');
    }
  };

  const handleChecklistToggle = (itemId: string) => {
    const today = dateKey(new Date());
    const yesterday = dateKey(new Date(Date.now() - 86400000));
    const allIds = getChecklistIds(mergedChecklistSections);

    setChecklistState(prevState => {
      const nextState = { ...prevState, [itemId]: !prevState[itemId] };
      const completedCount = allIds.filter(id => nextState[id]).length;
      const completion = allIds.length ? Math.round((completedCount / allIds.length) * 100) : 0;
      const allComplete = allIds.every(id => nextState[id]);
      let nextStreak = checklistStreak;
      let nextLastDate = lastChecklistDate;
      let nextHistory = checklistHistory;

      if (allComplete) {
        if (lastChecklistDate === today) {
          nextStreak = checklistStreak;
        } else if (lastChecklistDate === yesterday) {
          nextStreak = checklistStreak + 1;
        } else {
          nextStreak = 1;
        }
        nextLastDate = today;
      }

      nextHistory = mergeHistory(checklistHistory, today, completion);
      setChecklistStreak(nextStreak);
      setLastChecklistDate(nextLastDate);
      setChecklistHistory(nextHistory);
      persistChecklist(user.pet, nextState, nextStreak, nextLastDate, nextHistory);
      return nextState;
    });
  };

  const handleAddCustomChecklist = () => {
    if (!customChecklistDraft.label.trim() || !user.pet) return;
    const nextItem: CustomChecklistItem = {
      id: `${Date.now()}`,
      label: customChecklistDraft.label.trim(),
      frequency: customChecklistDraft.frequency,
      remindTime: customChecklistDraft.remindTime || undefined,
      notifyEnabled: customChecklistDraft.notifyEnabled
    };
    const next = [nextItem, ...customChecklist];
    setCustomChecklist(next);
    persistCustomChecklist(user.pet, next);
    setCustomChecklistDraft({ label: '', frequency: 'daily', remindTime: '', notifyEnabled: false });
    showToast('Checklist item added.', 'success');
  };

  const openChecklistEditor = (item: ChecklistItem, frequency: 'daily' | 'weekly') => {
    const override = checklistOverrides[item.id];
    setChecklistEditor({
      id: item.id,
      label: override?.label || item.label,
      frequency,
      remindTime: override?.remindTime || '',
      notifyEnabled: override?.notifyEnabled || false
    });
  };

  const handleChecklistEditorSave = () => {
    if (!checklistEditor || !user.pet) return;
    const next = {
      ...checklistOverrides,
      [checklistEditor.id]: {
        ...checklistOverrides[checklistEditor.id],
        label: checklistEditor.label,
        remindTime: checklistEditor.remindTime,
        notifyEnabled: checklistEditor.notifyEnabled,
        hidden: false
      }
    };
    setChecklistOverrides(next);
    persistChecklistOverrides(user.pet, next);
    setChecklistEditor(null);
  };

  const handleChecklistEditorRemove = () => {
    if (!checklistEditor || !user.pet) return;
    if (checklistEditor.id.startsWith('custom-')) {
      const customId = checklistEditor.id.replace('custom-', '');
      const nextCustom = customChecklist.filter(item => item.id !== customId);
      setCustomChecklist(nextCustom);
      persistCustomChecklist(user.pet, nextCustom);
      const { [checklistEditor.id]: _, ...rest } = checklistOverrides;
      setChecklistOverrides(rest);
      persistChecklistOverrides(user.pet, rest);
    } else {
      const next = {
        ...checklistOverrides,
        [checklistEditor.id]: {
          ...checklistOverrides[checklistEditor.id],
          hidden: true
        }
      };
      setChecklistOverrides(next);
      persistChecklistOverrides(user.pet, next);
    }
    setChecklistEditor(null);
  };

  const filteredActivities = useMemo(() => {
    return user.activities.filter(a => {
      const matchesType = filterType === 'All' || a.type === filterType;
      const date = new Date(a.timestamp);
      const now = new Date();
      let matchesDate = true;
      if (filterDate === 'Today') {
        matchesDate = date.toDateString() === now.toDateString();
      } else if (filterDate === 'Week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        matchesDate = date >= oneWeekAgo;
      }
      return matchesType && matchesDate;
    });
  }, [user.activities, filterType, filterDate]);

  const evidenceBrief = useMemo(
    () => (user.pet ? buildEvidenceBrief(user.pet) : []),
    [user.pet]
  );
  const checkupInsights = useMemo(
    () => (user.pet ? buildBreedInsights(user.pet) : []),
    [user.pet]
  );

  useEffect(() => {
    if (!evidenceBrief.length) return;
    const interval = setInterval(() => {
      setBriefIndex(prev => (prev + 1) % evidenceBrief.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [evidenceBrief]);

  useEffect(() => {
    if (evidenceBrief.length) {
      setBriefIndex(0);
    }
  }, [evidenceBrief.length]);

  const mergedChecklistSections = useMemo(() => {
    if (!customChecklist.length) return checklistSections;
    const dailyItems = customChecklist
      .filter(item => item.frequency === 'daily')
      .map(item => ({ id: `custom-${item.id}`, label: item.label }));
    const weeklyItems = customChecklist
      .filter(item => item.frequency === 'weekly')
      .map(item => ({ id: `custom-${item.id}`, label: item.label }));
    const sections = [...checklistSections];
    if (dailyItems.length) {
      sections.push({ id: 'custom-daily', title: 'Custom Daily', items: dailyItems });
    }
    if (weeklyItems.length) {
      sections.push({ id: 'custom-weekly', title: 'Custom Weekly', items: weeklyItems });
    }
    return sections;
  }, [checklistSections, customChecklist]);

  const normalizedChecklistSections = useMemo(() => {
    return mergedChecklistSections.map(section => ({
      ...section,
      items: section.items
        .filter(item => !checklistOverrides[item.id]?.hidden)
        .map(item => ({
          ...item,
          label: checklistOverrides[item.id]?.label || item.label
        }))
    }));
  }, [mergedChecklistSections, checklistOverrides]);

  const customWeeklyIds = useMemo(() => {
    return new Set(customChecklist.filter(item => item.frequency === 'weekly').map(item => `custom-${item.id}`));
  }, [customChecklist]);

  const allChecklistItems = useMemo(() => {
    return normalizedChecklistSections.flatMap(section => section.items);
  }, [normalizedChecklistSections]);

  const dailyChecklistItems = useMemo(() => {
    return allChecklistItems.filter(item => !customWeeklyIds.has(item.id));
  }, [allChecklistItems, customWeeklyIds]);

  const weeklyChecklistItems = useMemo(() => {
    return allChecklistItems.filter(item => customWeeklyIds.has(item.id));
  }, [allChecklistItems, customWeeklyIds]);

  const checklistIds = useMemo(
    () => getChecklistIds(normalizedChecklistSections),
    [normalizedChecklistSections]
  );

  useEffect(() => {
    if (!checklistIds.length) return;
    setChecklistState(prevState => {
      const nextState = { ...prevState };
      checklistIds.forEach(id => {
        if (nextState[id] === undefined) {
          nextState[id] = false;
        }
      });
      return nextState;
    });
  }, [checklistIds]);
  const checklistCompletedCount = useMemo(
    () => checklistIds.filter(id => checklistState[id]).length,
    [checklistIds, checklistState]
  );
  const checklistProgress = checklistIds.length
    ? Math.round((checklistCompletedCount / checklistIds.length) * 100)
    : 0;
  const treatPoints = useMemo(() => {
    return (
      checklistCompletedCount * 2 +
      checklistStreak * 3 +
      treatsLedger.activities * 1 +
      treatsLedger.updates * 5
    );
  }, [checklistCompletedCount, checklistStreak, treatsLedger.activities, treatsLedger.updates]);

  const activeBriefItem = evidenceBrief.length
    ? evidenceBrief[briefIndex % evidenceBrief.length]
    : null;
  const briefIconMap: Record<string, string> = {
    Safety: '🌡️',
    Hydration: '💧',
    Nutrition: '🥘',
    Activity: '🏃',
    'Senior care': '🦴'
  };
  const activeBriefIcon = activeBriefItem ? (briefIconMap[activeBriefItem.badge] || '🧠') : '🧠';

  const liveFeedItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'tip' | 'event' | 'radar';
      title: string;
      detail: string;
      meta: string;
      url?: string;
      sources?: Array<{ label: string; url: string }>;
    }> = [];
    microTips.forEach(tip => {
      items.push({
        id: `tip-${tip.id}`,
        type: 'tip',
        title: tip.title,
        detail: tip.detail,
        meta: tip.tags.join(" • "),
        sources: tip.sources
      });
    });
    petEvents.forEach(event => {
      items.push({
        id: `event-${event.id}`,
        type: 'event',
        title: event.title,
        detail: `${event.dateLabel} · ${event.venue}`,
        meta: event.source,
        url: event.url
      });
    });
    if (safetyRadar) {
      items.push({
        id: 'radar-summary',
        type: 'radar',
        title: `${safetyRadar.city} Safety Radar`,
        detail: `${safetyRadar.airQualityLabel} air · ${safetyRadar.safeWindow} safe window`,
        meta: `PM2.5 ${safetyRadar.pm25 ?? '—'}`
      });
    }
    const hydrated = items.length ? items : [{
      id: 'feed-wait',
      type: 'tip' as const,
      title: 'No local updates yet',
      detail: 'Check back later for city-specific alerts and tips.',
      meta: 'Updates'
    }];
    return hydrated.length < 8 ? [...hydrated, ...hydrated] : hydrated;
  }, [microTips, petEvents, safetyRadar]);

  const upcomingReminders = useMemo(() => {
    const today = dateKey(new Date());
    return reminders
      .filter(item => item.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [reminders]);

  const notifications = useMemo(() => {
    const items = [
      ...upcomingReminders.map(reminder => ({
        id: `reminder-${reminder.id}`,
        title: reminder.title,
        detail: `Reminder · ${reminder.date}`,
        type: 'reminder'
      })),
      ...petEvents.slice(0, 3).map(event => ({
        id: `event-${event.id}`,
        title: event.title,
        detail: `${event.dateLabel} · ${event.venue}`,
        type: 'event'
      }))
    ];
    return items;
  }, [upcomingReminders, petEvents]);

  const rangeDays = trendRange === 'daily' ? 1 : trendRange === 'weekly' ? 7 : 30;
  const rangeLabel = trendRange === 'daily' ? 'Last 24 hours' : trendRange === 'weekly' ? 'Last 7 days' : 'Last 30 days';
  const latestCareRequest = careRequests[0] || null;
  const activeTriage = selectedTriage || latestCareRequest;
  const hasActiveTriage = Boolean(activeTriage);
  const latestTriageDate = latestCareRequest?.createdAt
    ? new Date(latestCareRequest.createdAt).toLocaleDateString('en-IN')
    : '—';
  const latestTriageOutcomeLabel = getTriageOutcomeLabel(latestCareRequest);
  const activeTriageOutcomeLabel = getTriageOutcomeLabel(activeTriage);
  const activeTriageTopic = useMemo(
    () => detectTriageTopic(activeTriage?.concern, activeTriage?.notes),
    [activeTriage?.concern, activeTriage?.notes]
  );
  const draftTriageTopic = useMemo(
    () => detectTriageTopic(careRequestDraft.concern, careRequestDraft.notes),
    [careRequestDraft.concern, careRequestDraft.notes]
  );
  const activeTriageGuidance = useMemo(
    () => buildTriageGuidance(activeTriage?.urgency, activeTriageTopic),
    [activeTriage?.urgency, activeTriageTopic]
  );
  const draftTriageGuidance = useMemo(
    () => buildTriageGuidance(careRequestDraft.urgency, draftTriageTopic),
    [careRequestDraft.urgency, draftTriageTopic]
  );
  const triageToneClass = !hasActiveTriage
    ? 'bg-brand-50 text-brand-500 border-brand-100'
    : activeTriageGuidance.tone === 'urgent'
    ? 'bg-rose-100 text-rose-700 border-rose-200'
    : activeTriageGuidance.tone === 'soon'
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  const triageBadgeLabel = hasActiveTriage ? activeTriageGuidance.badge : 'No data';
  const draftTriageToneClass =
    draftTriageGuidance.tone === 'urgent'
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : draftTriageGuidance.tone === 'soon'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  const triageHighlights = [
    { title: '3 quick questions', desc: 'Describe symptoms and when they started.' },
    { title: 'Clear next step', desc: 'Emergency vs monitor guidance.' },
    { title: 'Vet-ready brief', desc: 'Share a clean summary with your clinic.' }
  ];
  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—';
  const activeQuickUpdateMode = useMemo(
    () => QUICK_UPDATE_MODES.find((mode) => mode.value === quickUpdateMode) || QUICK_UPDATE_MODES[0],
    [quickUpdateMode]
  );
  const trendAction = useMemo(() => {
    if (trendRange === 'daily') {
      return { label: 'Add Daily Log', mode: 'symptom' as QuickUpdateMode };
    }
    if (trendRange === 'monthly') {
      return { label: 'Add Monthly Log', mode: 'medical' as QuickUpdateMode };
    }
    return { label: 'Add Weekly Check-in', mode: 'weekly' as QuickUpdateMode };
  }, [trendRange]);

  const getRangeUpdates = (days: number, offset: number) => {
    const end = new Date();
    end.setDate(end.getDate() - offset * days);
    const start = new Date();
    start.setDate(start.getDate() - (offset + 1) * days);
    return petUpdates.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate > start && entryDate <= end;
    });
  };

  const currentRangeUpdates = useMemo(() => getRangeUpdates(rangeDays, 0), [petUpdates, rangeDays]);
  const previousRangeUpdates = useMemo(() => getRangeUpdates(rangeDays, 1), [petUpdates, rangeDays]);

  const sortedCheckins = useMemo(() => {
    return [...petUpdates].sort((a, b) => b.date.localeCompare(a.date));
  }, [petUpdates]);
  const vetBriefRangeLabel = `Last ${vetBriefRangeDays} days`;
  const vetBriefRangeLowerLabel = `last ${vetBriefRangeDays} days`;
  const vetBriefRangeSentence = `the last ${vetBriefRangeDays} days`;
  const rangeCheckins = useMemo(() => {
    return sortedCheckins.filter(entry => isWithinRange(entry.date, vetBriefRangeDays));
  }, [sortedCheckins, vetBriefRangeDays]);
  const rangeSymptoms = useMemo(() => {
    return symptomLogs.filter(entry => isWithinRange(entry.occurredAt, vetBriefRangeDays));
  }, [symptomLogs, vetBriefRangeDays]);
  const rangeMedicalEvents = useMemo(() => {
    return medicalEvents.filter(entry => isWithinRange(entry.dateAdministered, vetBriefRangeDays));
  }, [medicalEvents, vetBriefRangeDays]);
  const rangeDietLogs = useMemo(() => {
    return dietLogs.filter(entry => isWithinRange(entry.logDate, vetBriefRangeDays));
  }, [dietLogs, vetBriefRangeDays]);
  const recentSymptoms = useMemo(() => {
    return [...rangeSymptoms]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 4);
  }, [rangeSymptoms]);
  const recentMedicalEvents = useMemo(() => {
    return [...rangeMedicalEvents]
      .sort((a, b) => {
        const aTime = a.dateAdministered ? new Date(a.dateAdministered).getTime() : 0;
        const bTime = b.dateAdministered ? new Date(b.dateAdministered).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 4);
  }, [rangeMedicalEvents]);
  const recentDietLogs = useMemo(() => {
    return [...rangeDietLogs]
      .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())
      .slice(0);
  }, [rangeDietLogs]);
  const recentCheckins = useMemo(() => rangeCheckins.slice(0, 4), [rangeCheckins]);
  const latestCheckin = recentCheckins[0];
  const latestWeight = latestCheckin ? safeValue(latestCheckin.weight) : '-';
  const latestWeightDisplay = latestWeight === '-' ? '-' : `${latestWeight} kg`;
  const latestDiet = latestCheckin ? safeValue(latestCheckin.dietType) : '-';
  const latestActivity = latestCheckin ? safeValue(latestCheckin.activityLevel) : '-';
  const latestCheckinDate = latestCheckin ? formatBriefDate(latestCheckin.date) : '-';
  const lastSixCheckins = useMemo(() => rangeCheckins.slice(0), [rangeCheckins]);
  const weightSeriesRange = useMemo(() => {
    return [...rangeCheckins]
      .map(entry => {
        const value = toNumber(entry.weight);
        return value === null ? null : { date: entry.date, weight: value };
      })
      .filter((entry): entry is { date: string; weight: number } => entry !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rangeCheckins]);
  const weightTrend = useMemo(() => {
    if (weightSeriesRange.length < 2) {
      return {
        startLabel: '-',
        endLabel: '-',
        deltaLabel: '-',
        minLabel: '-',
        maxLabel: '-'
      };
    }
    const start = weightSeriesRange[0];
    const end = weightSeriesRange[weightSeriesRange.length - 1];
    const delta = end.weight - start.weight;
    const deltaLabel = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg`;
    const weights = weightSeriesRange.map(point => point.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    return {
      startLabel: `${start.weight.toFixed(1)} kg on ${formatBriefDate(start.date)}`,
      endLabel: `${end.weight.toFixed(1)} kg on ${formatBriefDate(end.date)}`,
      deltaLabel,
      minLabel: `${min.toFixed(1)} kg`,
      maxLabel: `${max.toFixed(1)} kg`
    };
  }, [weightSeriesRange]);
  const weightSparkline = useMemo(() => {
    if (weightSeriesRange.length < 2) return null;
    const width = 240;
    const height = 60;
    const padding = 6;
    const weights = weightSeriesRange.map(point => point.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = Math.max(max - min, 1);
    const step = (width - padding * 2) / Math.max(weightSeriesRange.length - 1, 1);
    const points = weightSeriesRange
      .map((point, index) => {
        const x = padding + index * step;
        const normalized = (point.weight - min) / range;
        const y = height - padding - normalized * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');
    return { points, min, max, width, height };
  }, [weightSeriesRange]);
  const checkinTimeline = useMemo(() => {
    if (!lastSixCheckins.length) return [`No check-ins logged in ${vetBriefRangeSentence}.`];
    return lastSixCheckins.map((entry, index) => {
      const weight = toNumber(entry.weight);
      const prior = lastSixCheckins[index + 1];
      const priorWeight = prior ? toNumber(prior.weight) : null;
      const delta =
        weight !== null && priorWeight !== null ? `${weight - priorWeight >= 0 ? '+' : ''}${(weight - priorWeight).toFixed(1)} kg` : '-';
      const weightLabel = weight !== null ? `${weight.toFixed(1)} kg` : '-';
      const dietLabel = safeValue(entry.dietType);
      const activityLabel = safeValue(entry.activityLevel);
      return `${formatBriefDate(entry.date)} | Weight ${weightLabel} (${delta}) | Diet ${dietLabel} | Activity ${activityLabel}`;
    });
  }, [lastSixCheckins, vetBriefRangeSentence]);
  const checkinRows = useMemo(() => {
    if (!lastSixCheckins.length) return [];
    return lastSixCheckins.map((entry, index) => {
      const weight = toNumber(entry.weight);
      const prior = lastSixCheckins[index + 1];
      const priorWeight = prior ? toNumber(prior.weight) : null;
      const delta =
        weight !== null && priorWeight !== null ? `${weight - priorWeight >= 0 ? '+' : ''}${(weight - priorWeight).toFixed(1)} kg` : '-';
      return {
        date: formatBriefDate(entry.date),
        weight: weight !== null ? `${weight.toFixed(1)} kg` : '-',
        delta,
        diet: safeValue(entry.dietType),
        activity: safeValue(entry.activityLevel)
      };
    });
  }, [lastSixCheckins]);
  const dietLogRows = useMemo(() => {
    if (!recentDietLogs.length) return [];
    return recentDietLogs.map(entry => ({
      date: formatBriefDate(entry.logDate),
      meal: safeValue(entry.mealType),
      diet: safeValue(entry.dietType),
      food: safeValue(entry.actualFood)
    }));
  }, [recentDietLogs]);
  const petNameLabel = safeValue(user.pet?.name);
  const petBreedLabel = safeValue(user.pet?.breed);
  const petAgeLabel = safeValue(user.pet?.age);
  const petGenderLabel = safeValue(user.pet?.gender);
  const petWeightLabel = safeValue(user.pet?.weight);
  const petWeightDisplay = petWeightLabel === '-' ? '-' : `${petWeightLabel} kg`;
  const petCityLabel = safeValue(user.pet?.city);
  const petVaccinationLabel = safeValue(user.pet?.vaccinationStatus);
  const petLastVaccineLabel = formatBriefDate(user.pet?.lastVaccineDate);
  const petLastVetVisitLabel = formatBriefDate(user.pet?.lastVetVisitDate);
  const petSpayStatusLabel = safeValue(user.pet?.spayNeuterStatus);
  const petDietTypeLabel = safeValue(user.pet?.dietType);
  const petFeedingScheduleLabel = safeValue(user.pet?.feedingSchedule);
  const petFoodBrandLabel = safeValue(user.pet?.foodBrand);
  const petActivityBaselineLabel = safeValue(user.pet?.activityBaseline);
  const petHousingLabel = safeValue(user.pet?.housingType);
  const petWalkSurfaceLabel = safeValue(user.pet?.walkSurface);
  const petParkAccessLabel = safeValue(user.pet?.parkAccess);
  const petConditionsLabel = safeValue(listToCsv(user.pet?.conditions));
  const petMedicationsLabel = safeValue(listToCsv(user.pet?.medications));
  const petAllergiesLabel = safeValue(listToCsv(user.pet?.allergies));
  const primaryVetLabel = [user.pet?.primaryVetName, user.pet?.primaryVetPhone ? `(${user.pet.primaryVetPhone})` : '']
    .filter(Boolean)
    .join(' ') || '-';
  const emergencyContactLabel = [user.pet?.emergencyContactName, user.pet?.emergencyContactPhone ? `(${user.pet.emergencyContactPhone})` : '']
    .filter(Boolean)
    .join(' ') || '-';
  const vetBriefText = useMemo(() => {
    const pet = user.pet;
    if (!pet) return 'No pet profile on file.';
    const primaryVetLine = [pet.primaryVetName, pet.primaryVetPhone ? `(${pet.primaryVetPhone})` : '']
      .filter(Boolean)
      .join(' ');
    const emergencyLine = [pet.emergencyContactName, pet.emergencyContactPhone ? `(${pet.emergencyContactPhone})` : '']
      .filter(Boolean)
      .join(' ');
    const triageLine = activeTriage
      ? `${activeTriage.requestType} | ${activeTriageOutcomeLabel} | ${formatBriefDate(activeTriage.createdAt)}`
      : '-';
    const triageStepsSummary = hasActiveTriage && activeTriageGuidance.steps.length ? activeTriageGuidance.steps.join('; ') : '-';
    const triageRedFlagsSummary = hasActiveTriage && activeTriageGuidance.redFlags.length ? activeTriageGuidance.redFlags.join('; ') : '-';
    const triageSignalSummary = hasActiveTriage ? activeTriageTopic.label : '-';
    const symptomSummary = recentSymptoms.length
      ? recentSymptoms.map(item => `${item.symptomType} (sev ${item.severity}/5) ${formatBriefDate(item.occurredAt)}`).join('; ')
      : '-';
    const medicalSummary = recentMedicalEvents.length
      ? recentMedicalEvents
          .map(item => `${item.eventType} ${formatBriefDate(item.dateAdministered)}`)
          .join('; ')
      : '-';
    const checkinSummary = latestCheckin
      ? `Latest check-in ${formatBriefDate(latestCheckin.date)} | Weight ${latestWeightDisplay} | Diet ${latestDiet} | Activity ${latestActivity}`
      : `No check-ins logged in ${vetBriefRangeSentence}.`;
    const nutritionSummary = [
      `Diet type: ${petDietTypeLabel}`,
      `Feeding schedule: ${petFeedingScheduleLabel}`,
      `Food brand: ${petFoodBrandLabel}`,
      `Activity baseline: ${petActivityBaselineLabel}`,
      `Housing: ${petHousingLabel}`,
      `Walk surface: ${petWalkSurfaceLabel}`,
      `Park access: ${petParkAccessLabel}`
    ].join(' | ');
    const checkinTimelineSummary = checkinTimeline.length ? checkinTimeline.join('\n') : '-';
    const dietLogSummary = dietLogRows.length
      ? dietLogRows.map(row => `${row.date} | ${row.meal} | ${row.diet} | ${row.food}`).join('\n')
      : '-';
    const lines = [
      `Vet Brief for ${safeValue(pet.name)}`,
      `Data range: ${vetBriefRangeLabel}`,
      `Pet: ${safeValue(pet.name)} | ${safeValue(pet.breed)} | ${safeValue(pet.age)} | ${safeValue(pet.gender)}`,
      `Weight: ${petWeightDisplay} | City: ${safeValue(pet.city)}`,
      `Spay/Neuter: ${petSpayStatusLabel}`,
      `Vaccination: ${safeValue(pet.vaccinationStatus)} | Last vaccine: ${formatBriefDate(pet.lastVaccineDate)}`,
      `Conditions: ${safeValue(listToCsv(pet.conditions))}`,
      `Medications: ${safeValue(listToCsv(pet.medications))}`,
      `Allergies: ${safeValue(listToCsv(pet.allergies))}`,
      `Last vet visit: ${formatBriefDate(pet.lastVetVisitDate)}`,
      `Primary vet: ${primaryVetLine || '-'}`,
      `Emergency contact: ${emergencyLine || '-'}`,
      `Nutrition & routine: ${nutritionSummary}`,
      `Weight trend (${vetBriefRangeLowerLabel}): Start ${weightTrend.startLabel} | End ${weightTrend.endLabel} | Delta ${weightTrend.deltaLabel} | Min ${weightTrend.minLabel} | Max ${weightTrend.maxLabel}`,
      `Latest triage: ${triageLine}`,
      `Signal: ${triageSignalSummary}`,
      `Concern: ${safeValue(activeTriage?.concern)}`,
      `Notes: ${safeValue(activeTriage?.notes)}`,
      `Onset: ${safeValue(activeTriage?.preferredTime)}`,
      `Next steps: ${triageStepsSummary}`,
      `Red flags: ${triageRedFlagsSummary}`,
      `Recent symptoms: ${symptomSummary}`,
      `Medical events: ${medicalSummary}`,
      `Recent care logs: ${checkinSummary}`,
      `Check-in timeline (${vetBriefRangeLowerLabel}):`,
      checkinTimelineSummary,
      `Diet log (${vetBriefRangeLowerLabel}):`,
      dietLogSummary
    ];
    return lines.join('\n');
  }, [
    user.pet,
    activeTriage,
    activeTriageOutcomeLabel,
    activeTriageGuidance,
    activeTriageTopic,
    hasActiveTriage,
    recentSymptoms,
    recentMedicalEvents,
    latestCheckin,
    latestWeightDisplay,
    latestDiet,
    latestActivity,
    petWeightDisplay,
    petDietTypeLabel,
    petFeedingScheduleLabel,
    petFoodBrandLabel,
    petActivityBaselineLabel,
    petHousingLabel,
    petWalkSurfaceLabel,
    petParkAccessLabel,
    petSpayStatusLabel,
    vetBriefRangeLabel,
    vetBriefRangeLowerLabel,
    vetBriefRangeSentence,
    weightTrend,
    checkinTimeline,
    dietLogRows
  ]);
  const vetBriefHtml = useMemo(() => {
    const pet = user.pet;
    if (!pet) {
      return '<p>No pet profile on file.</p>';
    }
    const row = (cells: string[]) =>
      `<tr>${cells.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
    const checkinRowsHtml = checkinRows.length
      ? checkinRows.map(entry => row([entry.date, entry.weight, entry.delta, entry.diet, entry.activity])).join('')
      : row([`No entries in ${vetBriefRangeSentence}.`, '-', '-', '-', '-']);
    const dietRowsHtml = dietLogRows.length
      ? dietLogRows.map(entry => row([entry.date, entry.meal, entry.diet, entry.food])).join('')
      : row([`No entries in ${vetBriefRangeSentence}.`, '-', '-', '-']);
    const symptomRowsHtml = recentSymptoms.length
      ? recentSymptoms.map(entry => row([entry.symptomType, `Sev ${entry.severity}/5`, formatBriefDate(entry.occurredAt)])).join('')
      : row([`No entries in ${vetBriefRangeSentence}.`, '-', '-']);
    const medicalRowsHtml = recentMedicalEvents.length
      ? recentMedicalEvents.map(entry => row([entry.eventType, formatBriefDate(entry.dateAdministered)])).join('')
      : row([`No entries in ${vetBriefRangeSentence}.`, '-']);
    const triageStepsHtml = hasActiveTriage && activeTriageGuidance.steps.length ? activeTriageGuidance.steps.join(' | ') : '-';
    const triageRedFlagsHtml = hasActiveTriage && activeTriageGuidance.redFlags.length ? activeTriageGuidance.redFlags.join(' | ') : '-';
    const triageToneClass =
      !hasActiveTriage
        ? 'pill-monitor'
        : activeTriageGuidance.tone === 'urgent'
        ? 'pill-urgent'
        : activeTriageGuidance.tone === 'soon'
        ? 'pill-soon'
        : 'pill-monitor';
    const triageOutcomeText = hasActiveTriage ? activeTriageOutcomeLabel : 'No triage yet';
    const triageSignalText = hasActiveTriage ? activeTriageTopic.label : 'Not started';
    const triageConcernText = hasActiveTriage ? safeValue(activeTriage?.concern) : 'Run a triage check to generate guidance.';
    const weightSparkHtml = weightSparkline
      ? `<svg viewBox="0 0 ${weightSparkline.width} ${weightSparkline.height}" preserveAspectRatio="none">
          <polyline points="${weightSparkline.points}" fill="none" stroke="#A25A20" stroke-width="3" />
        </svg>
        <div class="spark-labels"><span>${weightSparkline.min.toFixed(1)} kg</span><span>${weightSparkline.max.toFixed(1)} kg</span></div>`
      : '<div class="spark-empty">Log two weights to view the trend line.</div>';
    return `
      <section class="hero">
        <div class="card">
          <p class="eyebrow">Pet Snapshot</p>
          <h2>${escapeHtml(petNameLabel)}</h2>
          <p class="muted">${escapeHtml(`${petBreedLabel} • ${petAgeLabel} • ${petGenderLabel}`)}</p>
          <div class="chip-row">
            <span class="chip">Weight ${escapeHtml(petWeightDisplay)}</span>
            <span class="chip">City ${escapeHtml(petCityLabel)}</span>
          </div>
        </div>
        <div class="card">
          <p class="eyebrow">Triage Signal</p>
          <div class="pill ${triageToneClass}">${escapeHtml(triageOutcomeText)}</div>
          <p class="muted">Signal: ${escapeHtml(triageSignalText)}</p>
          <p class="muted">Concern: ${escapeHtml(triageConcernText)}</p>
        </div>
      </section>
      <section>
        <h2>Report Range</h2>
        <table>
          <tbody>
            ${row(['Data range', vetBriefRangeLabel])}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Pet Overview</h2>
        <table>
          <tbody>
            ${row(['Name', petNameLabel])}
            ${row(['Breed', petBreedLabel])}
            ${row(['Age', petAgeLabel])}
            ${row(['Gender', petGenderLabel])}
            ${row(['Weight', petWeightDisplay])}
            ${row(['City', petCityLabel])}
            ${row(['Spay/Neuter', petSpayStatusLabel])}
            ${row(['Vaccination', petVaccinationLabel])}
            ${row(['Last vaccine', petLastVaccineLabel])}
            ${row(['Last vet visit', petLastVetVisitLabel])}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Known History</h2>
        <table>
          <tbody>
            ${row(['Conditions', petConditionsLabel])}
            ${row(['Medications', petMedicationsLabel])}
            ${row(['Allergies', petAllergiesLabel])}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Nutrition and Routine</h2>
        <table>
          <tbody>
            ${row(['Diet type', petDietTypeLabel])}
            ${row(['Feeding schedule', petFeedingScheduleLabel])}
            ${row(['Food brand', petFoodBrandLabel])}
            ${row(['Activity baseline', petActivityBaselineLabel])}
            ${row(['Housing', petHousingLabel])}
            ${row(['Walk surface', petWalkSurfaceLabel])}
            ${row(['Park access', petParkAccessLabel])}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Triage Summary</h2>
        <table>
          <tbody>
            ${row(['Type', activeTriage?.requestType || '-'])}
            ${row(['Outcome', activeTriageOutcomeLabel])}
            ${row(['Urgency', activeTriage?.urgency || '-'])}
            ${row(['Date', formatBriefDate(activeTriage?.createdAt)])}
            ${row(['Signal', triageSignalText])}
            ${row(['Onset', safeValue(activeTriage?.preferredTime)])}
            ${row(['Concern', safeValue(activeTriage?.concern)])}
            ${row(['Notes', safeValue(activeTriage?.notes)])}
            ${row(['Next steps', triageStepsHtml])}
            ${row(['Red flags', triageRedFlagsHtml])}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Weight Trend (${vetBriefRangeLabel})</h2>
        <table>
          <tbody>
            ${row(['Start', weightTrend.startLabel])}
            ${row(['End', weightTrend.endLabel])}
            ${row(['Delta', weightTrend.deltaLabel])}
            ${row(['Min', weightTrend.minLabel])}
            ${row(['Max', weightTrend.maxLabel])}
          </tbody>
        </table>
        <div class="sparkline">
          ${weightSparkHtml}
        </div>
      </section>
      <section>
        <h2>Check-in Timeline (${vetBriefRangeLabel})</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Weight</th>
              <th>Delta</th>
              <th>Diet</th>
              <th>Activity</th>
            </tr>
          </thead>
          <tbody>
            ${checkinRowsHtml}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Diet Log (${vetBriefRangeLabel})</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Meal</th>
              <th>Diet</th>
              <th>Food</th>
            </tr>
          </thead>
          <tbody>
            ${dietRowsHtml}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Recent Symptoms</h2>
        <table>
          <thead>
            <tr>
              <th>Symptom</th>
              <th>Severity</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${symptomRowsHtml}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Medical Events</h2>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${medicalRowsHtml}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Vet Contacts</h2>
        <table>
          <tbody>
            ${row(['Primary vet', primaryVetLabel])}
            ${row(['Emergency contact', emergencyContactLabel])}
          </tbody>
        </table>
      </section>
      <p class="note">Not a diagnosis. Use this brief to speed up your vet visit.</p>
    `;
  }, [
    user.pet,
    petNameLabel,
    petBreedLabel,
    petAgeLabel,
    petGenderLabel,
    petWeightDisplay,
    petCityLabel,
    petSpayStatusLabel,
    petVaccinationLabel,
    petLastVaccineLabel,
    petLastVetVisitLabel,
    petConditionsLabel,
    petMedicationsLabel,
    petAllergiesLabel,
    petDietTypeLabel,
    petFeedingScheduleLabel,
    petFoodBrandLabel,
    petActivityBaselineLabel,
    petHousingLabel,
    petWalkSurfaceLabel,
    petParkAccessLabel,
    activeTriage,
    activeTriageOutcomeLabel,
    activeTriageGuidance,
    activeTriageTopic,
    hasActiveTriage,
    vetBriefRangeLabel,
    vetBriefRangeLowerLabel,
    vetBriefRangeSentence,
    weightTrend,
    weightSparkline,
    checkinRows,
    dietLogRows,
    recentSymptoms,
    recentMedicalEvents,
    primaryVetLabel,
    emergencyContactLabel
  ]);

  const compareActivity = (value?: string) => {
    const map: Record<string, number> = { Low: 1, Moderate: 2, High: 3 };
    return value ? map[value] ?? 0 : 0;
  };

  const compareDiet = (value?: string) => {
    const map: Record<string, number> = { 'Home Cooked': 3, Mixed: 2, Kibble: 1 };
    return value ? map[value] ?? 0 : 0;
  };

  const insightSeries = useMemo(() => {
    const recent = currentRangeUpdates.length
      ? [...currentRangeUpdates].sort((a, b) => a.date.localeCompare(b.date))
      : [...sortedCheckins].slice(0, 6).reverse();
    const values = recent.map(entry => {
      if (insightMetric === 'weight') {
        const value = Number(entry.weight);
        return Number.isNaN(value) ? null : value;
      }
      if (insightMetric === 'activity') {
        return compareActivity(entry.activityLevel);
      }
      return compareDiet(entry.dietType);
    });
    const clean = values.filter((value): value is number => value !== null && value !== 0);
    if (clean.length < 2) {
      return { points: '', ready: false };
    }
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const range = Math.max(max - min, 1);
    const width = 260;
    const height = 90;
    const padding = 10;
    const step = (width - padding * 2) / Math.max(values.length - 1, 1);
    const points = values
      .map((value, index) => {
        const safe = value === null ? min : value;
        const normalized = (safe - min) / range;
        const x = padding + index * step;
        const y = height - padding - normalized * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');
    return { points, ready: true };
  }, [currentRangeUpdates, sortedCheckins, insightMetric]);

  const insightData = useMemo(() => {
    const recent = currentRangeUpdates.length
      ? [...currentRangeUpdates].sort((a, b) => a.date.localeCompare(b.date))
      : [...sortedCheckins].slice(0, 6).reverse();
    const labels = recent.map(entry => formatDate(entry.date));
    const activityValues = recent.map(entry => compareActivity(entry.activityLevel));
    const activityLabels = recent.map(entry => entry.activityLevel || '—');
    const activityMax = Math.max(...activityValues, 1);
    const activityBars = activityValues.map(value => Math.round((value / activityMax) * 100));
    const dietValues = recent.map(entry => entry.dietType || '—');
    const dietCounts = dietValues.reduce<Record<string, number>>((acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
    const totalDiet = dietValues.length || 1;
    return {
      labels,
      dietCounts,
      totalDiet,
      firstLabel: labels[0] || '—',
      lastLabel: labels[labels.length - 1] || '—',
      firstValue: recent[0]?.weight || '—',
      lastValue: recent[recent.length - 1]?.weight || '—'
    };
  }, [currentRangeUpdates, sortedCheckins, formatDate, compareActivity]);

  const activityMinutesByType = useMemo(() => {
    const now = Date.now();
    const cutoff = now - rangeDays * 24 * 60 * 60 * 1000;
    const totals = { Walk: 0, Play: 0, Train: 0 };
    user.activities.forEach(entry => {
      const timestamp = entry.timestamp instanceof Date ? entry.timestamp.getTime() : new Date(entry.timestamp).getTime();
      if (timestamp < cutoff) return;
      const type = entry.type === 'Training' ? 'Train' : entry.type;
      if (type in totals) {
        totals[type as keyof typeof totals] += entry.duration || 0;
      }
    });
    return totals;
  }, [user.activities, rangeDays]);

  const activityRangeMinutes = useMemo(() => {
    return Object.values(activityMinutesByType).reduce((sum, value) => sum + value, 0);
  }, [activityMinutesByType]);

  const insightEntries = useMemo(() => {
    return currentRangeUpdates.length
      ? [...currentRangeUpdates].sort((a, b) => a.date.localeCompare(b.date))
      : [...sortedCheckins].slice(0, 6).reverse();
  }, [currentRangeUpdates, sortedCheckins]);

  const weightChartData = useMemo(() => {
    return insightEntries.map(entry => ({
      date: formatDate(entry.date),
      weight: Number(entry.weight)
    })).filter(entry => !Number.isNaN(entry.weight));
  }, [insightEntries, formatDate]);

  const activityBarData = useMemo(() => {
    return (['Walk', 'Play', 'Train'] as const).map(type => ({
      level: type,
      minutes: activityMinutesByType[type]
    }));
  }, [activityMinutesByType]);

  const dietPieData = useMemo(() => {
    return [
      { name: 'Home Cooked', value: insightData.dietCounts['Home Cooked'] || 0, color: '#A25A20' },
      { name: 'Mixed', value: insightData.dietCounts['Mixed'] || 0, color: '#D28A5C' },
      { name: 'Kibble', value: insightData.dietCounts['Kibble'] || 0, color: '#F3C9A7' }
    ];
  }, [insightData.dietCounts]);

  const latestRangeUpdate = currentRangeUpdates[0] ?? null;
  const previousRangeUpdate = previousRangeUpdates[0] ?? null;

  const weightLatestLabel = latestRangeUpdate?.weight
    ? `${latestRangeUpdate.weight}kg`
    : user.pet?.weight
    ? `${user.pet.weight}kg`
    : '—';

  const weightDeltaLabel = (() => {
    if (latestRangeUpdate?.weight && previousRangeUpdate?.weight) {
      const latestWeight = Number(latestRangeUpdate.weight);
      const previousWeight = Number(previousRangeUpdate.weight);
      if (!Number.isNaN(latestWeight) && !Number.isNaN(previousWeight)) {
        const delta = Number((latestWeight - previousWeight).toFixed(1));
        if (delta === 0) return 'No change vs previous period';
        return `${delta > 0 ? '+' : ''}${delta}kg vs previous period`;
      }
    }
    return 'Log two entries to compare';
  })();

  const weightTrendValue = (() => {
    if (latestRangeUpdate?.weight && previousRangeUpdate?.weight) {
      const latestWeight = Number(latestRangeUpdate.weight);
      const previousWeight = Number(previousRangeUpdate.weight);
      if (!Number.isNaN(latestWeight) && !Number.isNaN(previousWeight)) {
        const delta = Number((latestWeight - previousWeight).toFixed(1));
        if (delta === 0) return 'Stable';
        return `${delta > 0 ? '+' : ''}${delta}kg`;
      }
    }
    return latestRangeUpdate?.weight ? `${latestRangeUpdate.weight}kg` : '—';
  })();

  const activityTrendValue = (() => {
    const latest = latestRangeUpdate?.activityLevel || user.pet?.activityLevel || '—';
    const previous = previousRangeUpdate?.activityLevel || '';
    if (!previous || latest === '—') return latest;
    const diff = compareActivity(latest) - compareActivity(previous);
    if (diff === 0) return `${latest} (steady)`;
    return `${latest} (${diff > 0 ? 'up' : 'down'})`;
  })();

  const dietTrendValue = (() => {
    const latest = latestRangeUpdate?.dietType || user.pet?.dietType || '—';
    const previous = previousRangeUpdate?.dietType || '';
    if (!previous || latest === '—') return latest;
    return latest === previous ? `${latest} (steady)` : `${latest} (changed)`;
  })();

  const activityLast24Hours = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return user.activities.reduce((sum, entry) => {
      const timestamp = entry.timestamp instanceof Date ? entry.timestamp.getTime() : new Date(entry.timestamp).getTime();
      if (timestamp >= cutoff) {
        return sum + (entry.duration || 0);
      }
      return sum;
    }, 0);
  }, [user.activities]);

  const trendCoverage = useMemo(() => {
    return {
      current: currentRangeUpdates.length,
      previous: previousRangeUpdates.length,
      total: petUpdates.length
    };
  }, [currentRangeUpdates.length, previousRangeUpdates.length, petUpdates.length]);

  const trendComparisonReady = trendCoverage.current > 0 && trendCoverage.previous > 0;
  const aimTargets = useMemo(() => {
    const activityBaseline = user.pet?.activityBaseline;
    const activityLevel = user.pet?.activityLevel || latestRangeUpdate?.activityLevel;
    const activityTarget = activityBaseline || (
      activityLevel === 'High'
        ? '60-90 min/day'
        : activityLevel === 'Low'
        ? '20-30 min/day'
        : '30-60 min/day'
    );
    const dietTarget = user.pet?.feedingSchedule
      ? `${user.pet.feedingSchedule} meals/day`
      : 'Consistent meal timing';
    return {
      activityTarget,
      dietTarget,
      hydrationTarget: 'Fresh water at all times'
    };
  }, [user.pet, latestRangeUpdate?.activityLevel]);

  const redFlags = useMemo(() => {
    const flags: string[] = [];
    if (dashboardSummary?.flags?.length) {
      flags.push(...dashboardSummary.flags.map(flag => `${flag} needs attention`));
    }
    if (latestRangeUpdate?.weight && previousRangeUpdate?.weight) {
      const latestWeight = Number(latestRangeUpdate.weight);
      const previousWeight = Number(previousRangeUpdate.weight);
      if (!Number.isNaN(latestWeight) && !Number.isNaN(previousWeight) && previousWeight > 0) {
        const deltaPct = Math.abs(latestWeight - previousWeight) / previousWeight;
        if (deltaPct >= 0.05) {
          flags.push('Weight change >5% since last period');
        }
      }
    }
    if (!flags.length) {
      flags.push('No red flags detected');
    }
    return flags;
  }, [dashboardSummary?.flags, latestRangeUpdate?.weight, previousRangeUpdate?.weight]);

  const checkinCalendar = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);
    const checkinDays = new Set(
      sortedCheckins.map(entry => {
        const date = new Date(entry.date);
        return date.getMonth() === month && date.getFullYear() === year ? date.getDate() : null;
      }).filter((day): day is number => day !== null)
    );
    const streakDays = new Set(
      checklistHistory.map(point => {
        if (point.completion < 80) return null;
        const date = new Date(point.date);
        return date.getMonth() === month && date.getFullYear() === year ? date.getDate() : null;
      }).filter((day): day is number => day !== null)
    );
    return { days, startOffset, checkinDays, streakDays, monthLabel: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  }, [sortedCheckins, checklistHistory]);

  const checklistStreakBars = useMemo(() => {
    const today = new Date();
    const historyMap = new Map(
      checklistHistory.map(point => [point.date.slice(0, 10), point.completion])
    );
    return Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - idx));
      const key = date.toISOString().slice(0, 10);
      const completion = historyMap.get(key) ?? 0;
      return {
        key,
        completion,
        label: date.toLocaleDateString('en-US', { weekday: 'short' })
      };
    });
  }, [checklistHistory]);

  const selectedCheckin = useMemo(() => {
    if (selectedCheckinId === 'latest') return sortedCheckins[0] || null;
    if (selectedCheckinId.startsWith('legacy-')) {
      const index = Number(selectedCheckinId.replace('legacy-', ''));
      return Number.isNaN(index) ? null : sortedCheckins[index] || null;
    }
    return sortedCheckins.find(entry => entry.id === selectedCheckinId) || null;
  }, [selectedCheckinId, sortedCheckins]);

  const symptomMetric = dashboardSummary?.symptomSignal;
  const medicalMetric = dashboardSummary?.medicalCompliance;

  const symptomDetails = useMemo(() => {
    if (symptomLogs.length) {
      return symptomLogs
        .slice(0, 4)
        .map(entry => ({
          label: entry.symptomType,
          severity: entry.severity,
          occurredAt: entry.occurredAt
        }));
    }
    const detail = dashboardSummary?.symptomSignal?.detail || '';
    return detail
      .split(/[,;•]/)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 4)
      .map(item => ({ label: item, severity: 0, occurredAt: '' }));
  }, [dashboardSummary?.symptomSignal?.detail, symptomLogs]);

  const weeklyCheckinStats = useMemo(() => {
    const weekKey = (date: Date) => {
      const start = new Date(Date.UTC(date.getFullYear(), 0, 1));
      const diff = Math.floor((date.getTime() - start.getTime()) / 86400000);
      return `${date.getFullYear()}-W${Math.ceil((diff + start.getUTCDay() + 1) / 7)}`;
    };
    const now = new Date();
    const weeks = Array.from({ length: 7 }).map((_, idx) => {
      const end = new Date(now);
      end.setDate(end.getDate() - idx * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const key = weekKey(end);
      const count = petUpdates.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      }).length;
      return { key, start, end, count };
    }).reverse();

    let streak = 0;
    for (let i = weeks.length - 1; i >= 0; i -= 1) {
      if (weeks[i].count > 0) {
        streak += 1;
      } else {
        break;
      }
    }

    const completion = weeks.reduce((sum, item) => sum + (item.count > 0 ? 1 : 0), 0);
    const completionRate = Math.round((completion / weeks.length) * 100);

    const nextCheckin = new Date(now);
    nextCheckin.setDate(nextCheckin.getDate() + (7 - nextCheckin.getDay()));

    return { weeks, streak, completionRate, nextCheckin };
  }, [petUpdates]);

  const handleTreatClaim = () => {
    if (!user.pet) return;
    const nextClaimed = Math.min(treatPoints, claimedTreats + Math.max(treatPoints - claimedTreats, 0));
    setClaimedTreats(nextClaimed);
    try {
      localStorage.setItem(getTreatsStorageKey(user.pet), JSON.stringify(nextClaimed));
    } catch {
      // ignore
    }
    showToast('Treats claimed! Keep logging to unlock more.', 'success');
  };

  const handleReminderSave = () => {
    if (!reminderDraft.title || !reminderDraft.date) return;
    const entry = {
      ...reminderDraft,
      id: reminderDraft.id || `${Date.now()}`
    };
    const next = reminderDraft.id
      ? reminders.map(item => (item.id === entry.id ? entry : item))
      : [entry, ...reminders];
    setReminders(next);
    persistReminders(user.pet, next);
    setReminderDraft({ id: '', title: '', date: '', repeat: 'None', notes: '' });
  };

  const handleReminderEdit = (reminder: Reminder) => {
    setReminderDraft(reminder);
    setShowReminders(true);
  };

  const handleReminderDelete = (reminderId: string) => {
    const next = reminders.filter(item => item.id !== reminderId);
    setReminders(next);
    persistReminders(user.pet, next);
  };

  const breedForumPosts = FORUM_MOCK.filter(p => p.breed === user.pet?.breed || p.breed === "Any");

  const customGames = useMemo(() => {
    const breed = user.pet?.breed || 'Indie';
    const energy = user.pet?.activityLevel || 'Moderate';
    
    const baseGames = [
      { id: 1, title: "Scent Scavenger", desc: "Hide pieces of ginger-free chicken around your balcony or living room.", focus: "Cognitive" },
      { id: 2, title: "Target Touch", desc: "Teach them to touch your palm with their nose for a treat. Simple but effective.", focus: "Training" },
      { id: 3, title: "Shell Game", desc: "Place a treat under one of three cups and shuffle. Great for mental fatigue.", focus: "Cognitive" },
      { id: 4, title: "Indoor Fetch", desc: "Use a soft plushie to protect your apartment furniture.", focus: "Physical" },
      { id: 5, title: "Bubble Chase", desc: "Blow pet-safe bubbles for them to 'pop' in the shaded porch area.", focus: "Physical" },
      { id: 6, title: "Wait & Release", desc: "Practice staying for 60 seconds before sprinting to a high-value snack.", focus: "Training" },
      { id: 7, title: "Pillow Hurdle", desc: "Set up a low obstacle course using cushions for joint mobility.", focus: "Physical" },
      { id: 8, title: "Name That Toy", desc: "Try to teach them the names of two different toys for mental stimulation.", focus: "Cognitive" },
      { id: 9, title: "Stair Sprints", desc: "If you have stairs, a few controlled climbs are great for high-energy breeds.", focus: "Physical" },
      { id: 10, title: "Cooling Mat Chill", desc: "Freeze some coconut water in an ice tray for a post-game cooling ritual.", focus: "Post-Activity" }
    ];

    if (energy === 'High') {
      return baseGames.map(g => g.focus === 'Physical' ? { ...g, desc: g.desc + " Increase repetitions for maximum burn." } : g);
    }
    return baseGames;
  }, [user.pet]);

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-40 scroll-smooth">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-6 left-1/2 z-[140] w-[calc(100%-3rem)] max-w-md -translate-x-1/2 rounded-2xl px-5 py-4 text-sm font-semibold shadow-2xl border backdrop-blur-xl bg-white/70 animate-in slide-in-from-top-2 duration-300 md:left-auto md:right-6 md:translate-x-0 md:max-w-sm ${
            toast.tone === 'success'
              ? 'text-emerald-900 border-emerald-200 shadow-emerald-200/40'
              : 'text-red-900 border-red-200 shadow-red-200/40'
          }`}
        >
          {toast.message}
        </div>
      )}
      <header className="px-4 py-3 sticky top-0 bg-white/90 backdrop-blur-2xl z-50 border-b border-brand-50 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(prev => !prev)}
              className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center shadow-sm hover:shadow-md transition-all"
              aria-label="Menu"
            >
              <span className="text-xl">≡</span>
            </button>
            {showProfileMenu && (
              <div className="absolute left-0 mt-3 w-[240px] max-w-[85vw] bg-white border border-brand-100 rounded-[1.75rem] shadow-2xl p-4 z-[130] space-y-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-400 mb-2">Profiles</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { label: 'Edit Parent Profile', action: () => { openParentProfile(); setActiveTab('parent'); } },
                      { label: 'Edit Pet Profile', action: openPetProfileEditor },
                      { label: 'Earn Pet Treats', action: () => setShowTreats(true) }
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => {
                          item.action();
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left bg-white border border-brand-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-700 hover:border-brand-300"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 px-1 cursor-pointer" onClick={() => setActiveTab('parent')}>
            <h1 className="text-lg sm:text-xl font-display font-black text-brand-900 tracking-tight leading-none truncate">
              {user.pet?.name || 'PawVeda'}
            </h1>
            <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest truncate flex items-center gap-2">
              <span className="text-xs">📍</span>
              <span className="truncate">{user.pet?.city || 'Set city'}</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center shadow-sm hover:shadow-md transition-all"
                aria-label="Notifications"
              >
                <span className="text-lg">🔔</span>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('parent')}
                className="relative"
                aria-label="Profile"
              >
                <img
                  src={user.pet?.photoUrl || `https://picsum.photos/seed/${user.pet?.name}/200`}
                  className="w-10 h-10 rounded-3xl object-cover border-4 border-brand-500/10 shadow-xl"
                  alt="Pet"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => setShowTreats(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand-50 border border-brand-100 text-[9px] font-black uppercase tracking-widest text-brand-700 shadow-sm hover:shadow-md transition-all"
            aria-label="Pet treats"
          >
            <span className="text-base">🍖</span>
            {treatPoints} Treats
          </button>
          {!user.isPremium && (
            <button
              onClick={() => setShowPayment(true)}
              className="bg-brand-900 text-white px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl hover:bg-brand-500 transition-all active:scale-95"
            >
              Upgrade
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 pt-12">

        {/* INTELLIGENCE FEED */}
        {activeTab === 'home' && (
          <div className="space-y-12 animate-reveal">
            <div className="space-y-2">
              <h2 className="text-5xl font-display font-black text-brand-900 leading-none">Intelligence Feed</h2>
              <p className="text-brand-800/40 text-lg font-medium italic">High-value insights for your {user.pet?.breed} in {user.pet?.city}.</p>
            </div>

            <div className="grid gap-6">
              <div className="bg-white p-10 rounded-[4rem] border border-brand-50 shadow-sm space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Free Pet Health Checkup</p>
                    <h3 className="text-2xl font-display font-black text-brand-900">Today’s safety snapshot</h3>
                    <p className="text-brand-800/50 text-sm font-medium">
                      Guidance based on your profile and local conditions.
                    </p>
                    <p className="text-[11px] text-brand-800/60 font-medium italic">Guidance only. Not a diagnosis.</p>
                  </div>
                  <Link
                    to="/checkup"
                    onClick={() => trackEvent('dashboard_checkup_view', { city: user.pet?.city, breed: user.pet?.breed })}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                  >
                    View full checkup
                  </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-brand-50/60 p-5 rounded-2xl border border-brand-100 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Safety Radar</p>
                    <p className="text-lg font-display font-black text-brand-900">
                      {safetyRadar?.airQualityLabel || 'Unavailable'}
                    </p>
                    <p className="text-[10px] text-brand-800/70 font-bold uppercase tracking-widest">
                      {safetyRadar?.status || 'Data unavailable'}
                    </p>
                    <p className="text-xs text-brand-800/60 font-medium">PM2.5 {safetyRadar?.pm25 ?? '—'}</p>
                    <p className="text-[11px] text-brand-800/60 font-medium italic">Live AQI integration pending.</p>
                  </div>
                  <div className="bg-brand-50/60 p-5 rounded-2xl border border-brand-100 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Daily Brief</p>
                    <p className="text-lg font-display font-black text-brand-900">
                      {activeBriefItem?.title || 'Evidence-backed check'}
                    </p>
                    <p className="text-xs text-brand-800/70 font-medium italic">
                      "{activeBriefItem?.detail || 'Evidence-backed guidance for today.'}"
                    </p>
                    {activeBriefItem?.sources?.length ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {activeBriefItem.sources.map(source => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            className="text-[9px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                          >
                            {source.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="bg-brand-50/60 p-5 rounded-2xl border border-brand-100 space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Breed Intelligence</p>
                    {checkupInsights.length ? (
                      <div className="space-y-2">
                        {checkupInsights.slice(0, 2).map(item => (
                          <div key={item.title}>
                            <p className="text-sm font-display font-black text-brand-900">{item.title}</p>
                            <p className="text-[11px] text-brand-800/60">{item.detail}</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {item.sources.map(source => (
                                <a
                                  key={source.url}
                                  href={source.url}
                                  target="_blank"
                                  className="text-[9px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                                >
                                  {source.label}
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-brand-800/60">
                        Add a breed in your pet profile to unlock breed-specific guidance.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-brand-900 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-brand-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{activeBriefItem?.badge || "Daily Brief"}</span>
                    <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Evidence Backed</span>
                  </div>
                  <h3 className="text-3xl font-display font-black tracking-tight">
                    {activeBriefItem?.title || `${user.pet?.city} Care Check`}
                  </h3>
                  <p className="text-white/70 text-lg font-light leading-relaxed italic">
                    "{activeBriefItem?.detail || `Evidence-backed guidance for ${user.pet?.name}.`}"
                  </p>
                  {activeBriefItem?.sources?.length ? (
                    <div className="flex flex-wrap gap-3">
                      {activeBriefItem.sources.map(source => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          className="text-[9px] font-black uppercase tracking-widest text-white/80 underline underline-offset-4"
                        >
                          {source.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="absolute -right-10 -bottom-10 text-[12rem] opacity-[0.05] rotate-12 group-hover:rotate-0 transition-transform duration-[3s]">
                  {activeBriefIcon}
                </div>
                <div className="absolute bottom-8 left-10 flex gap-2">
                  {evidenceBrief.map((item, index) => (
                    <span
                      key={item.title}
                      className={`h-2 w-2 rounded-full transition-all ${index === briefIndex ? 'bg-brand-500' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white p-10 rounded-[4rem] border border-brand-50 shadow-sm space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-display font-black text-brand-900">2-Minute Triage</h3>
                    <p className="text-brand-800/40 text-sm font-medium">Emergency vs wait, plus a vet-ready brief.</p>
                  </div>
                  <button
                    onClick={openTriageModal}
                    className="bg-brand-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all"
                  >
                    Start triage
                  </button>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-brand-50/60 p-4 rounded-2xl border border-brand-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Latest</p>
                    <p className="text-lg font-display font-black text-brand-900">{latestTriageDate}</p>
                  </div>
                  <div className="bg-brand-50/60 p-4 rounded-2xl border border-brand-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Outcome</p>
                    <p className="text-lg font-display font-black text-brand-900">{latestTriageOutcomeLabel}</p>
                  </div>
                  <div className="bg-brand-50/60 p-4 rounded-2xl border border-brand-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Vet brief</p>
                    <p className="text-lg font-display font-black text-brand-900">{latestCareRequest ? 'Drafted' : 'Not started'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setSelectedTriage(latestCareRequest);
                      setShowVetBrief(true);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                  >
                    Open vet brief
                  </button>
                  <button
                    onClick={openTriageModal}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                  >
                    Add symptoms
                  </button>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[4rem] border border-brand-50 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-display font-black text-brand-900">Today’s Priorities</h3>
                    <p className="text-brand-800/40 text-sm font-medium">What matters most for {user.pet?.name}.</p>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-400">{rangeLabel}</span>
                </div>
                <div className="space-y-3">
                  {evidenceBrief.map(item => (
                    <div key={item.title} className="bg-brand-50/60 p-4 rounded-2xl border border-brand-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">{item.badge}</p>
                      <p className="text-lg font-display font-black text-brand-900">{item.title}</p>
                      <p className="text-xs text-brand-800/70 font-medium italic">"{item.detail}"</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.sources.map(source => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            className="text-[9px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                          >
                            {source.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {user.pet?.dietType === 'Home Cooked' && (
                <div className="bg-white p-10 rounded-[4rem] border border-brand-50 shadow-sm space-y-6 group hover:shadow-2xl transition-all duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-3xl">🥘</div>
                    <div>
                      <h4 className="text-xl font-display font-black text-brand-900 tracking-tight">Desi Kitchen Protocol</h4>
                      <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Biological Match Found</p>
                    </div>
                  </div>
                  <p className="text-brand-800/60 text-base leading-relaxed font-medium">
                    Since you use <span className="text-brand-900 font-bold">Home Cooked</span> food, ensure you're avoiding hidden garlic in dal and excess turmeric.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets"
                      target="_blank"
                      className="text-[9px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                    >
                      ASPCA Toxic Foods
                    </a>
                  </div>
                  <button onClick={() => setActiveTab('nutri')} className="text-xs font-black text-brand-500 uppercase tracking-widest underline decoration-brand-100 underline-offset-8">Audit a Plate Now →</button>
                </div>
              )}
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-brand-50 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-black text-brand-900">Upcoming Reminders</h3>
                <button
                  onClick={() => setShowReminders(true)}
                  className="text-[10px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                >
                  Manage Reminders
                </button>
              </div>
              {upcomingReminders.length > 0 ? (
                <div className="space-y-3">
                  {upcomingReminders.map(reminder => (
                    <div key={reminder.id} className="bg-brand-50/60 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-display font-black text-brand-900">{reminder.title}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">{reminder.date} · {reminder.repeat}</p>
                      </div>
                      <button onClick={() => handleReminderEdit(reminder)} className="text-[9px] font-black uppercase tracking-widest text-brand-500">Edit</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-brand-800/50 font-medium italic">No reminders yet. Add your first care alert.</p>
              )}
            </div>

            {/* LIVE INTELLIGENCE FEED */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-black text-brand-900 tracking-tight">Live Intelligence Feed</h3>
                <span className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Updated Today</span>
              </div>
              <div className="bg-white p-8 rounded-[3rem] border border-brand-50 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Hybrid Feed</span>
                  <span className="text-[9px] font-bold text-brand-300 uppercase tracking-widest">Vet + Community</span>
                </div>
                <div className="max-h-[520px] overflow-y-auto pr-2 space-y-4 live-feed-scroll">
                  {liveFeedItems.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="bg-brand-50/40 p-4 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-500">
                          {item.type === 'tip' ? 'Source-backed' : item.type === 'event' ? 'Community' : 'Safety Radar'}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-brand-300">{item.meta}</span>
                      </div>
                      <h4 className="text-sm font-display font-black text-brand-900 mb-1">{item.title}</h4>
                      <p className="text-xs text-brand-800/70 font-medium italic">"{item.detail}"</p>
                      {item.sources?.length ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.sources.map(source => (
                            <a
                              key={source.url}
                              href={source.url}
                              target="_blank"
                              className="text-[9px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                            >
                              {source.label}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {item.url && (
                        <a href={item.url} target="_blank" className="text-[9px] font-black text-brand-900 underline underline-offset-4 mt-2 inline-block">
                          View Details ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LOCAL SAFETY RADAR + NEARBY SERVICES */}
            {hasTier('pro') ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-display font-black text-brand-900 tracking-tight">Local Safety Radar & Nearby Services</h3>
                  <button
                    onClick={() => setShowServices(!showServices)}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-500 underline decoration-brand-100 underline-offset-4"
                  >
                    {showServices ? "Collapse Nearby Services" : "Expand Nearby Services"}
                  </button>
                </div>
                <span className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">City Intel</span>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-6 snap-x scrollbar-hide">
                <div className="min-w-[320px] snap-center bg-white p-8 rounded-[3rem] border border-brand-50 shadow-sm hover:shadow-xl transition-all duration-500">
                  <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mb-4 inline-block">Safety Radar</span>
                  <h4 className="text-lg font-display font-black text-brand-900 mb-2">{user.pet?.city} Air + Weather</h4>
                  <p className="text-brand-800/50 text-[10px] font-medium mb-4 italic">Updated today</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Air Quality</span>
                      <span className="text-xs font-black text-brand-900">{safetyRadar?.airQualityLabel || "Loading..."}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Status</span>
                      <span className="text-xs font-black text-brand-900">{safetyRadar?.status || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Temp</span>
                      <span className="text-xs font-black text-brand-900">
                        {safetyRadar?.temperature !== undefined && safetyRadar?.temperature !== null ? `${safetyRadar.temperature}°C` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Humidity</span>
                      <span className="text-xs font-black text-brand-900">
                        {safetyRadar?.humidity !== undefined && safetyRadar?.humidity !== null ? `${safetyRadar.humidity}%` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">PM2.5</span>
                      <span className="text-xs font-black text-brand-900">{safetyRadar?.pm25 ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Safe Window</span>
                      <span className="text-xs font-black text-brand-900">{safetyRadar?.safeWindow || "—"}</span>
                    </div>
                  </div>
                  <p className="text-brand-800/60 text-xs font-medium italic mt-4">"{safetyRadar?.advisory || "Calibrating local conditions..."}"</p>
                </div>

                {showServices && nearbyServices.length > 0 ? nearbyServices.map((service, i) => (
                  <div key={service.id || i} className="min-w-[280px] snap-center bg-white p-8 rounded-[3rem] border border-brand-50 shadow-sm hover:shadow-xl transition-all duration-500">
                    <button
                      onClick={() => setExpandedServiceId(expandedServiceId === service.id ? null : service.id)}
                      className="w-full text-left"
                    >
                      <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mb-4 inline-block">{service.type}</span>
                      <h4 className="text-lg font-display font-black text-brand-900 mb-2">{service.name}</h4>
                      <p className="text-brand-800/60 text-[10px] font-bold uppercase tracking-widest mb-2">{service.locality || user.pet?.city}</p>
                      <p className="text-brand-800/50 text-[10px] font-medium mb-4 italic">{service.address}</p>
                    </button>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-brand-500 font-bold text-xs">{service.source || "Verified"}</span>
                      <a href={service.googleMapsLink || service.link} target="_blank" className="text-[9px] font-black text-brand-900 underline underline-offset-4">Open in Maps ↗</a>
                    </div>
                    {expandedServiceId === service.id && (
                      <div className="mt-4 bg-brand-50/60 p-3 rounded-2xl border border-brand-100">
                        <p className="text-[10px] font-medium text-brand-800/70">
                          "Tap Open in Maps to confirm hours, reviews, and directions."
                        </p>
                        <button
                          onClick={() => setExpandedServiceId(null)}
                          className="text-[9px] font-black text-brand-500 uppercase tracking-widest mt-2"
                        >
                          Minimize
                        </button>
                      </div>
                    )}
                  </div>
                )) : showServices ? (
                  <div className="min-w-[280px] snap-center bg-brand-50 p-8 rounded-[3rem] flex items-center justify-center animate-pulse">
                    <p className="text-brand-800/20 font-display font-black text-sm italic">Scanning Nearby Services...</p>
                  </div>
                ) : null}
              </div>
            </div>
            ) : (
              <div className="space-y-6">
                {renderLocked(
                  'Safety Radar + Nearby Services',
                  'Upgrade to Pro to unlock local alerts, air quality, and trusted nearby services.',
                  'Upgrade to Pro'
                )}
              </div>
            )}

            {/* NEW: TRAIN AT HOME DROPDOWN */}
            <div className="bg-brand-50 p-10 rounded-[4rem] border border-brand-100 space-y-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-black text-brand-900 tracking-tight">Train Your Pet at Home</h3>
                <p className="text-brand-800/40 text-sm font-medium">Daily techniques for a disciplined companion.</p>
              </div>
              <div className="space-y-4">
                {TRAINING_TECHNIQUES.map((tech, i) => (
                  <div key={i} className="bg-white rounded-[2rem] border border-brand-50 shadow-sm overflow-hidden">
                    <button 
                      onClick={() => setExpandedTraining(expandedTraining === i ? null : i)}
                      className="w-full px-8 py-5 flex items-center justify-between text-left group"
                    >
                      <span className="font-display font-black text-brand-900">{tech.title}</span>
                      <span className={`transition-transform duration-300 ${expandedTraining === i ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    <div className={`transition-all duration-500 ease-in-out ${expandedTraining === i ? 'max-h-40 opacity-100 p-8 pt-0' : 'max-h-0 opacity-0 p-0 overflow-hidden'}`}>
                      <p className="text-brand-800/60 text-sm leading-relaxed font-medium italic">"{tech.desc}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-brand-50 p-10 rounded-[4rem] border border-brand-100 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-black text-brand-900 tracking-tight">Care Protocol</h3>
                  <p className="text-brand-800/40 text-sm font-medium">Tailored steps based on {user.pet?.breed || 'your pet'} and home setup.</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-500">Streak</p>
                  <p className="text-xl font-display font-black text-brand-900">{checklistStreak} days</p>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-6 border border-brand-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-500">Progress</span>
                  <span className="text-xs font-bold text-brand-900">{checklistCompletedCount}/{checklistIds.length}</span>
                </div>
                <div className="w-full h-2 bg-brand-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 transition-all"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {mergedChecklistSections.map((section, index) => (
                  <div key={section.id} className="bg-white rounded-[2rem] border border-brand-50 shadow-sm overflow-hidden">
                    <button 
                      onClick={() => setExpandedChecklist(expandedChecklist === index ? null : index)}
                      className="w-full px-8 py-5 flex items-center justify-between text-left group"
                    >
                      <span className="font-display font-black text-brand-900">{section.title}</span>
                      <span className={`transition-transform duration-300 ${expandedChecklist === index ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    <div className={`transition-all duration-500 ease-in-out ${expandedChecklist === index ? 'max-h-[22rem] opacity-100 px-8 pb-8' : 'max-h-0 opacity-0 px-8 pb-0 overflow-hidden'}`}>
                      <div className="space-y-3">
                        {section.items.map(item => (
                          <label key={item.id} className="flex items-center gap-3 text-sm text-brand-800 font-medium">
                            <input
                              type="checkbox"
                              checked={!!checklistState[item.id]}
                              onChange={() => handleChecklistToggle(item.id)}
                              className="accent-brand-500 w-4 h-4"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UPDATED: COMMUNITY WISDOM WITH 10 ENTRIES & UPVOTES */}
            <div className="bg-white p-12 rounded-[4rem] border border-brand-50 shadow-sm space-y-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-black text-brand-900 tracking-tight">Community Wisdom</h3>
                <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Live: {user.pet?.breed} Node</span>
              </div>
              <div className="space-y-6">
                {breedForumPosts.map((post) => (
                  <div key={post.id} className="group flex gap-6 items-start p-6 rounded-[2.5rem] hover:bg-brand-50 transition-all duration-500">
                    <div className="w-14 h-14 rounded-2xl bg-brand-900 flex items-center justify-center font-display font-bold text-white text-lg shadow-lg group-hover:rotate-12 transition-transform shrink-0">{post.user[0]}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-brand-900 uppercase tracking-widest">{post.user}</span>
                        <span className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">● {post.breed} Parent</span>
                      </div>
                      <p className="text-brand-800 text-base leading-relaxed font-medium italic">"{post.text}"</p>
                      <button className="flex items-center gap-2 mt-4 text-[10px] font-black text-brand-400 uppercase tracking-widest hover:text-brand-500 transition-colors">
                        👍 {post.votes} Upvotes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-display font-black text-brand-900 tracking-tight">Guides & Blogs</h3>
                  <p className="text-brand-800/40 text-sm font-medium">Short reads tailored to daily care.</p>
                </div>
                <Link
                  to="/blog"
                  className="text-[10px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                >
                  Browse all →
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {getAllBlogs().slice(0, 4).map(entry => (
                  <Link
                    key={`${entry.petType}/${entry.slug}`}
                    to={`/blog/${entry.petType}/${entry.slug}`}
                    className="block bg-white/90 border border-brand-50 rounded-[2rem] p-6 shadow-sm hover:border-brand-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-lg font-display font-black text-brand-900">{entry.title}</h4>
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-500">{entry.petType}</span>
                    </div>
                    <p className="text-xs text-brand-800/60 mt-2">{entry.description || 'Read the full guide on PawVeda.'}</p>
                    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-brand-400 mt-4">
                      <span>{entry.readingMinutes} min read</span>
                      <span>•</span>
                      <span>{entry.wordCount} words</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="bg-white/90 border border-brand-50 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Feeling Geeky?</p>
                    <h3 className="text-2xl font-display font-black text-brand-900">Expert sources behind the guidance</h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-300">Tap to read</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {GEEKY_CARDS.map(card => (
                    <a
                      key={card.source}
                      href={card.source}
                      target="_blank"
                      rel="noreferrer"
                      className="block bg-brand-50/70 border border-brand-100 rounded-[2rem] p-6 hover:border-brand-300 hover:shadow-lg transition-all"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-brand-400">Source Flashcard</p>
                      <h4 className="text-lg font-display font-black text-brand-900 mt-3">{card.title}</h4>
                      <p className="text-xs text-brand-800/60 mt-2">{card.summary}</p>
                      <span className="inline-flex mt-4 text-[10px] font-black uppercase tracking-[0.35em] text-brand-500">Open Source →</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NUTRI LENS */}
        {activeTab === 'nutri' && (
          !hasTier('pro') ? (
            <div className="animate-reveal">
              {renderLocked(
                'Nutri Lens',
                'Upgrade to Pro to scan meals, detect toxins, and log nutrition insights with confidence.',
                'Upgrade to Pro'
              )}
            </div>
          ) : (
            <div className="space-y-10 animate-reveal">
              <h2 className="text-5xl font-display font-black text-brand-900">Nutri Lens</h2>
              {!selectedImage ? (
                <div onClick={() => fileInputRef.current?.click()} className="bg-white border-4 border-dashed border-brand-100 rounded-[4rem] p-24 text-center hover:shadow-2xl hover:border-brand-500 transition-all cursor-pointer group">
                  <div className="text-9xl mb-10 group-hover:scale-110 transition-transform duration-700">🥘</div>
                  <h3 className="text-3xl font-display font-bold text-brand-900 mb-4">Focus Plate</h3>
                  <p className="text-brand-800/40 text-lg max-w-sm mx-auto leading-relaxed italic">Scan Indian home-cooked meals for hidden toxins.</p>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleNutriLensUpload} />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="relative rounded-[4rem] overflow-hidden shadow-2xl border-[12px] border-white group">
                    <img src={selectedImage} className="w-full aspect-square object-cover" alt="Meal" />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-brand-900/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-12 text-center animate-pulse">
                        <div className="w-24 h-24 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-8 shadow-2xl" />
                        <p className="font-display font-black tracking-[0.4em] uppercase text-xs">Auditing Toxicity...</p>
                      </div>
                    )}
                  </div>
                  {lensResult && (
                    <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-brand-50 animate-reveal">
                      <div className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-10 ${lensResult.toxicity_status === 'Safe' ? 'bg-green-100 text-green-700' : lensResult.toxicity_status === 'Not Food' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                        {lensResult.toxicity_status} Detected
                      </div>
                      <div className="space-y-10">
                        <div>
                          <p className="text-[10px] font-black uppercase text-brand-400 mb-3 tracking-[0.4em]">Node Analysis</p>
                          <p className="text-3xl font-display font-black text-brand-900 leading-tight italic">"{lensResult.item_identified}"</p>
                        </div>
                        <div className="p-10 bg-brand-50/50 rounded-[3rem] border border-brand-100">
                          <p className="text-[10px] font-black uppercase text-brand-500 mb-6 tracking-[0.2em]">Veterinary Guidance</p>
                          <p className="text-xl text-brand-900 leading-relaxed font-medium">{lensResult.correction_advice}</p>
                        </div>
                      </div>
                      <button onClick={() => {setSelectedImage(null); setLensResult(null);}} className="w-full mt-14 py-8 text-brand-500 font-black uppercase tracking-[0.4em] text-xs border-2 border-brand-50 rounded-[2.5rem] hover:bg-brand-50 transition-all">New Scan</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {/* ACTIVITY HUB */}
        {activeTab === 'play' && (
          !hasTier('elite') ? (
            <div className="animate-reveal">
              {renderLocked(
                'Activity Intelligence',
                'Upgrade to Elite for activity logs, nutrition tracking, and advanced insights built for multi‑pet homes.',
                'Upgrade to Elite'
              )}
            </div>
          ) : (
            <div className="space-y-16 animate-reveal">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h2 className="text-5xl font-display font-black text-brand-900 leading-none">Play</h2>
                  <p className="text-brand-800/40 text-lg font-medium italic">Movement logs for {user.pet?.name}.</p>
                </div>
                {!showLogForm && (
                  <button onClick={() => setShowLogForm(true)} className="bg-brand-900 text-white px-8 py-4 rounded-3xl font-bold shadow-2xl hover:bg-brand-500 transition-all active:scale-95">
                    Log Effort +
                  </button>
                )}
              </div>
            
            {showLogForm && (
              <div className="bg-white p-12 rounded-[4rem] border-2 border-brand-100 shadow-2xl animate-reveal space-y-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-display font-black text-brand-900">New Entry</h3>
                  <button onClick={() => setShowLogForm(false)} className="text-brand-300 font-black uppercase text-[10px] tracking-widest hover:text-brand-900 transition-colors">Cancel</button>
                </div>
                <form onSubmit={handleLogActivitySubmit} className="space-y-8">
                  <div className="grid grid-cols-3 gap-4">
                    {(['Walk', 'Play', 'Training'] as const).map(type => (
                      <button 
                        key={type} type="button" 
                        onClick={() => setLogType(type)}
                        className={`py-6 rounded-[2rem] border-2 font-bold transition-all ${logType === type ? 'bg-brand-900 text-white border-brand-900 shadow-xl' : 'bg-white text-brand-900 border-brand-50'}`}
                      >
                        {type === 'Walk' ? '🚶‍♂️' : type === 'Play' ? '🎾' : '🎓'} <br/>
                        <span className="text-[10px] uppercase tracking-widest mt-2 block">{type}</span>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-brand-500 uppercase tracking-widest ml-2">Log Date</label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={e => setLogDate(e.target.value)}
                      className="w-full bg-brand-50 border-none rounded-[2rem] px-8 py-6 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all text-xl font-bold text-brand-900"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-brand-500 uppercase tracking-widest ml-2">Duration (Minutes)</label>
                    <input 
                      type="number" value={logDuration} onChange={e => setLogDuration(e.target.value)}
                      className="w-full bg-brand-50 border-none rounded-[2rem] px-8 py-6 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all text-xl font-bold text-brand-900"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-brand-500 uppercase tracking-widest ml-2">Observations (Notes)</label>
                    <textarea 
                      placeholder="e.g., Bruno was very alert today."
                      className="w-full bg-brand-50 border-none rounded-[2.5rem] px-8 py-6 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all text-lg font-medium h-32 resize-none"
                      value={logNotes} onChange={e => setLogNotes(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="w-full bg-brand-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-brand-500 transition-all active:scale-95">
                    Commit Entry
                  </button>
                </form>
              </div>
            )}

            <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-brand-50 space-y-8">
              <div className="flex flex-col gap-6">
                 <div className="space-y-3">
                   <p className="text-[10px] font-black text-brand-300 uppercase tracking-[0.4em] ml-1">Modality</p>
                   <div className="flex flex-wrap gap-2">
                     {['All', 'Walk', 'Play', 'Training'].map(type => (
                       <button 
                        key={type} 
                        onClick={() => setFilterType(type as any)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-brand-900 text-white shadow-xl scale-105' : 'bg-brand-50 text-brand-800/40 hover:bg-brand-100'}`}
                       >
                         {type}
                       </button>
                     ))}
                   </div>
                 </div>
                 <div className="space-y-3">
                   <p className="text-[10px] font-black text-brand-300 uppercase tracking-[0.4em] ml-1">Life-to-Date Filter</p>
                   <div className="flex gap-2">
                     {['All', 'Today', 'Week'].map(date => (
                        <button 
                          key={date} 
                          onClick={() => setFilterDate(date as any)}
                          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${filterDate === date ? 'border-brand-900 bg-white text-brand-900 shadow-md' : 'border-brand-50 text-brand-800/20'}`}
                        >
                          {date === 'All' ? 'Infinity' : date}
                        </button>
                     ))}
                   </div>
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              {filteredActivities.length === 0 ? (
                <div className="bg-white/50 border-4 border-dashed border-brand-50 rounded-[4rem] p-24 text-center">
                  <p className="text-brand-800/20 text-xl font-display font-black italic">No records in this node.</p>
                </div>
              ) : (
                filteredActivities.map((a, i) => (
                  <div key={a.id} className="bg-white p-10 rounded-[3.5rem] border border-brand-50 shadow-sm hover:shadow-xl transition-all group animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-brand-50 rounded-[1.5rem] flex items-center justify-center text-4xl group-hover:rotate-12 transition-transform duration-500">
                          {a.type === 'Walk' ? '🚶‍♂️' : a.type === 'Play' ? '🎾' : '🎓'}
                        </div>
                        <div>
                          <h4 className="text-2xl font-display font-black text-brand-900">{a.type}</h4>
                          <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mt-1">
                            {new Date(a.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-display font-black text-brand-900 leading-none">{a.duration}</div>
                        <div className="text-[8px] font-black text-brand-300 uppercase tracking-widest mt-1">Minutes</div>
                      </div>
                    </div>
                    {a.notes && (
                      <div className="bg-brand-50/50 p-6 rounded-[2.5rem] border border-brand-100 mb-6 relative overflow-hidden">
                        <p className="text-brand-800 text-sm font-medium leading-relaxed italic">"{a.notes}"</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 p-4 bg-brand-900 text-white/90 rounded-[1.5rem] text-xs font-medium shadow-lg">
                      <span className="text-lg">💡</span>
                      <p className="opacity-80 italic leading-relaxed">{a.advice}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-10 pt-10 border-t border-brand-50">
              <div className="space-y-2">
                <h3 className="text-3xl font-display font-black text-brand-900 tracking-tight">The Playbook</h3>
                <p className="text-brand-800/40 text-lg font-medium italic">10 custom drills for {user.pet?.name} & Parent.</p>
              </div>
              <div className="grid gap-4">
                {customGames.map((game, i) => (
                  <div key={game.id} className="bg-white p-8 rounded-[2.5rem] border border-brand-50 shadow-sm hover:shadow-md transition-all group flex items-start gap-6 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="w-12 h-12 bg-brand-900 text-white rounded-2xl flex items-center justify-center font-display font-bold shrink-0 shadow-lg group-hover:rotate-12 transition-transform">{game.id}</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-display font-black text-brand-900">{game.title}</h4>
                        <span className="text-[8px] font-black text-brand-500 uppercase tracking-widest border border-brand-50 px-2 py-0.5 rounded-full">{game.focus}</span>
                      </div>
                      <p className="text-brand-800/60 text-sm font-medium leading-relaxed">{game.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )
        )}

        {/* TRIAGE */}
        {activeTab === 'triage' && (
          <div className="space-y-12 animate-reveal pb-20">
            <div className="space-y-2">
              <h2 className="text-5xl font-display font-black text-brand-900 leading-none">Triage + Vet Brief</h2>
              <p className="text-brand-800/40 text-lg font-medium italic">Emergency vs wait in 2 minutes, plus a structured brief.</p>
            </div>

            <div className="bg-brand-900 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 space-y-4 max-w-2xl">
                <span className="bg-brand-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Primary Feature</span>
                <h3 className="text-3xl font-display font-black tracking-tight">Start a triage check</h3>
                <p className="text-white/80 text-base">
                  Answer a few symptom questions and get a clear next step for your pet.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={openTriageModal}
                    className="bg-white text-brand-900 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all"
                  >
                    Start triage
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTriage(latestCareRequest);
                      setShowVetBrief(true);
                    }}
                    className="border border-white/40 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Open vet brief
                  </button>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-10 text-[10rem] opacity-[0.08]">🩺</div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {triageHighlights.map((item, index) => (
                <div
                  key={item.title}
                  className="text-left bg-white border border-brand-50 rounded-[2.5rem] p-6 space-y-3 shadow-sm motion-section h-full flex flex-col"
                  style={motionDelay(index)}
                >
                  <p className="text-lg font-display font-black text-brand-900">{item.title}</p>
                  <p className="text-sm text-brand-800/60 font-medium">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[4rem] border border-brand-50 p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-display font-black text-brand-900">Clear next step</h3>
                  <p className="text-sm text-brand-800/60 font-medium">Based on the latest triage entry.</p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest border px-3 py-1 rounded-full ${triageToneClass}`}>
                  {triageBadgeLabel}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">
                Signal: {hasActiveTriage ? activeTriageTopic.label : 'Not started'}
              </p>
              <p className="text-sm text-brand-800/70 font-medium">
                {hasActiveTriage ? activeTriageGuidance.summary : 'Start a triage check to get a clear next step.'}
              </p>
              {hasActiveTriage && (
                <div className="grid md:grid-cols-2 gap-4 text-[11px] text-brand-800/70 font-medium">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Do this now</p>
                    <ul className="list-disc list-inside space-y-1">
                      {activeTriageGuidance.steps.map(step => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Red flags</p>
                    <ul className="list-disc list-inside space-y-1">
                      {activeTriageGuidance.redFlags.map(flag => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-[4rem] border border-brand-50 p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-black text-brand-900">Recent triage</h3>
                <span className="text-[9px] font-black uppercase tracking-widest text-brand-400">{careRequests.length} sessions</span>
              </div>
              {careRequests.length ? (
                <div className="space-y-3">
                  {careRequests.slice(0, 4).map(request => (
                    <button
                      key={request.id}
                      onClick={() => {
                        setSelectedTriage(request);
                        setShowVetBrief(true);
                      }}
                      className="w-full text-left bg-brand-50/60 border border-brand-100 rounded-2xl p-4 flex items-center justify-between hover:bg-brand-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-display font-black text-brand-900">{request.concern || request.requestType}</p>
                        <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">
                          {getTriageOutcomeLabel(request)}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                        {request.id.startsWith('local-') ? 'Local draft' : request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-brand-800/60 font-medium">No triage sessions yet.</p>
              )}
            </div>
          </div>
        )}

        {/* PARENT DASHBOARD */}
        {activeTab === 'parent' && (
          <div className="space-y-12 animate-reveal pb-20">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h2 className="text-5xl font-display font-black text-brand-900 leading-none tracking-tight">Parent Dashboard</h2>
                <p className="text-brand-800/40 text-lg font-medium italic mt-2">Keep profiles fresh for smarter insights.</p>
              </div>
            </div>
            <div className="space-y-8">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-brand-50/70 border border-brand-100 rounded-full p-1 flex gap-2 mx-auto">
                  {(['daily', 'weekly', 'monthly'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setTrendRange(range)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        trendRange === range ? 'bg-brand-900 text-white' : 'text-brand-500'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => openPetQuickUpdate(undefined, trendAction.mode)}
                  className="bg-brand-900 text-white px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-brand-500 active:scale-95 transition-all"
                >
                  + {trendAction.label}
                </button>
              </div>

              <div className="bg-white rounded-[3.5rem] border border-brand-50 p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Insight</p>
                    <h3 className="text-xl font-display font-black text-brand-900">Wellness Insight</h3>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-300">{rangeLabel}</span>
                </div>
                <div className="flex gap-2">
                  {(['weight', 'activity', 'diet'] as const).map(metric => (
                    <button
                      key={metric}
                      onClick={() => setInsightMetric(metric)}
                      className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        insightMetric === metric ? 'bg-brand-900 text-white' : 'bg-brand-50 text-brand-500'
                      }`}
                    >
                      {metric}
                    </button>
                  ))}
                </div>
                <div className="bg-brand-50/60 rounded-[2.5rem] p-6 border border-brand-100 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-400">Latest</p>
                      <p className="text-2xl font-display font-black text-brand-900 leading-tight">
                        {insightMetric === 'weight' ? weightLatestLabel : insightMetric === 'activity' ? activityTrendValue : dietTrendValue}
                      </p>
                      {insightMetric === 'weight' && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">{weightDeltaLabel}</p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-400">Comparison</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-500">
                        {trendComparisonReady ? `vs previous ${rangeLabel.toLowerCase()}` : 'Need 2 logs'}
                      </p>
                    </div>
                  </div>
                  {insightMetric === 'weight' && (
                    <div className="space-y-3">
                      <div className="h-40 w-full min-h-[160px]">
                        {weightChartData.length >= 2 ? (
                          <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                            <LineChart data={weightChartData}>
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis hide />
                              <Tooltip
                                contentStyle={{ borderRadius: 16, borderColor: '#F3C9A7', fontSize: 12 }}
                                formatter={(value: number) => [`${value}kg`, 'Weight']}
                              />
                              <Line
                                type="monotone"
                                dataKey="weight"
                                stroke="#A25A20"
                                strokeWidth={3}
                                dot={{ r: 4, stroke: '#A25A20', strokeWidth: 2, fill: '#FDF6F0' }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-brand-400">
                            Log two entries to unlock a real trend line.
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-brand-400">
                        <span>{insightData.firstLabel} · {insightData.firstValue}kg</span>
                        <span>{insightData.lastLabel} · {insightData.lastValue}kg</span>
                      </div>
                    </div>
                  )}
                  {insightMetric === 'activity' && (
                    <div className="space-y-3">
                      <div className="h-40 w-full min-h-[160px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                          <BarChart data={activityBarData}>
                            <XAxis dataKey="level" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip
                              contentStyle={{ borderRadius: 16, borderColor: '#F3C9A7', fontSize: 12 }}
                              formatter={(value: number) => [`${value} min`, 'Minutes']}
                            />
                            <Bar dataKey="minutes" radius={[12, 12, 8, 8]} fill="#D28A5C" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                        Total logged: {activityRangeMinutes} min this {trendRange}
                      </p>
                    </div>
                  )}
                  {insightMetric === 'diet' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-6">
                        <div className="h-32 w-32 min-h-[128px] min-w-[128px]">
                          <ResponsiveContainer width="100%" height="100%" minHeight={128} minWidth={128}>
                            <PieChart>
                              <Pie
                                data={dietPieData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={36}
                                outerRadius={58}
                                paddingAngle={3}
                              >
                                {dietPieData.map(entry => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ borderRadius: 16, borderColor: '#F3C9A7', fontSize: 12 }}
                                formatter={(value: number) => [`${value} logs`, 'Diet']}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 text-[9px] font-bold uppercase tracking-widest text-brand-400">
                          {dietPieData.map(entry => {
                            const percent = Math.round((entry.value / insightData.totalDiet) * 100);
                            return (
                              <div key={`${entry.name}-label`} className="flex items-center justify-between gap-3">
                                <span>{entry.name}</span>
                                <span>{percent}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Based on logged check-ins</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[3.5rem] border border-brand-50 p-8 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Symptom Signals</p>
                    <h3 className="text-xl font-display font-black text-brand-900">Recent Symptoms</h3>
                  </div>
                  <button
                    onClick={() => openPetQuickUpdate(undefined, 'symptom')}
                    className="text-[9px] font-black uppercase tracking-widest text-brand-500"
                  >
                    Log Symptom →
                  </button>
                </div>
                <div className="bg-brand-50/60 rounded-[2.5rem] p-6 border border-brand-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Signal</p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-brand-300">{rangeLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-display font-black text-brand-900">
                        {dashboardSummary?.symptomSignal?.value || '—'}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                        {dashboardSummary?.symptomSignal?.label || 'No recent symptom trend'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                      {dashboardSummary?.symptomSignal?.status || 'unknown'}
                    </span>
                  </div>
                  <p className="text-xs text-brand-800/60 font-medium">
                    {dashboardSummary?.symptomSignal?.detail || 'Log symptoms to surface patterns and red flags.'}
                  </p>
                  <button
                    onClick={() => setShowSymptomDetails(prev => !prev)}
                    className="text-[9px] font-black uppercase tracking-widest text-brand-500"
                  >
                    {showSymptomDetails ? 'Hide symptom list' : 'View symptom list →'}
                  </button>
                  {showSymptomDetails && (
                    <div className="bg-white/70 border border-brand-100 rounded-2xl p-4 space-y-2">
                      {symptomDetails.length ? (
                        symptomDetails.map((item, index) => (
                          <div key={`symptom-detail-${index}`} className="flex items-center justify-between text-sm text-brand-800 font-medium">
                            <div>
                              <p>{item.label}</p>
                              {item.occurredAt && (
                                <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">
                                  {new Date(item.occurredAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            {item.severity ? (
                              <span className="text-[10px] font-black uppercase tracking-widest text-brand-500">
                                Severity {item.severity}/5
                              </span>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-brand-800/60 font-medium">No symptom details logged yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-white rounded-[3rem] border border-brand-50 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Check-in Calendar</p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-brand-300">{checkinCalendar.monthLabel}</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-[9px] font-bold uppercase tracking-widest text-brand-300">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <span key={`${day}-${index}`} className="text-center">{day}</span>
                    ))}
                    {Array.from({ length: checkinCalendar.startOffset }).map((_, idx) => (
                      <span key={`offset-${idx}`} />
                    ))}
                    {checkinCalendar.days.map(day => {
                      const isCheckin = checkinCalendar.checkinDays.has(day);
                      const isStreak = checkinCalendar.streakDays.has(day);
                      return (
                        <span
                          key={`day-${day}`}
                          className={`text-center rounded-full py-1 ${
                            isCheckin ? 'bg-brand-900 text-white' : isStreak ? 'border border-brand-500 text-brand-700' : 'text-brand-400'
                          }`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                  <div className="bg-brand-50/70 border border-brand-100 rounded-[2rem] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-400">Checklist streak</p>
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-500">{checklistProgress}% today</span>
                    </div>
                    <div className="flex items-end gap-2 h-16">
                      {checklistStreakBars.map(day => (
                        <div key={day.key} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full h-full bg-white/60 border border-brand-100 rounded-full flex items-end overflow-hidden">
                            <span
                              className="w-full rounded-full bg-brand-500/80"
                              style={{ height: `${Math.max(20, Math.round(day.completion))}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-brand-400">{day.label}</span>
                        </div>
                      ))}
                    </div>
                    {!checklistStreakBars.some(day => day.completion > 0) && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                        No streak data yet — complete a checklist item to start the timeline.
                      </p>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-[3rem] border border-brand-50 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Care Progress</p>
                      <h3 className="text-xl font-display font-black text-brand-900">Checklist streaks</h3>
                    </div>
                    <button
                      onClick={() => setShowChecklist(prev => !prev)}
                      className="text-[9px] font-black uppercase tracking-widest text-brand-500"
                    >
                      {showChecklist ? 'Hide Checklist' : 'View Checklist →'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-brand-400">
                    <span>Daily: {checklistStreak} days</span>
                    <span>Weekly: {weeklyCheckinStats.streak} weeks</span>
                  </div>
                  <div className="w-full h-4 bg-brand-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-900 motion-progress" style={{ width: `${checklistProgress}%` }} />
                  </div>
                  <p className="text-xs text-brand-800/60 font-medium">{checklistCompletedCount}/{checklistIds.length} checks completed today.</p>
                  {showChecklist && (
                    <div className="pt-4 border-t border-brand-50 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Daily Checklist</p>
                          <div className="space-y-2">
                            {dailyChecklistItems.map(item => (
                              <div key={item.id} className="flex items-center gap-3 text-sm text-brand-800 font-medium">
                                <input
                                  type="checkbox"
                                  checked={!!checklistState[item.id]}
                                  onChange={() => handleChecklistToggle(item.id)}
                                  className="accent-brand-500 w-4 h-4"
                                />
                                <span className="flex-1">{item.label}</span>
                                <button
                                  type="button"
                                  onClick={() => openChecklistEditor(item, 'daily')}
                                  className="w-6 h-6 rounded-full border border-brand-200 text-[10px] font-black text-brand-500"
                                  aria-label={`Edit ${item.label}`}
                                >
                                  i
                                </button>
                              </div>
                            ))}
                            {!dailyChecklistItems.length && (
                              <p className="text-sm text-brand-800/60 font-medium">Add a daily checklist item below.</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Weekly Checklist</p>
                          <div className="space-y-2">
                            {weeklyChecklistItems.map(item => (
                              <div key={item.id} className="flex items-center gap-3 text-sm text-brand-800 font-medium">
                                <input
                                  type="checkbox"
                                  checked={!!checklistState[item.id]}
                                  onChange={() => handleChecklistToggle(item.id)}
                                  className="accent-brand-500 w-4 h-4"
                                />
                                <span className="flex-1">{item.label}</span>
                                <button
                                  type="button"
                                  onClick={() => openChecklistEditor(item, 'weekly')}
                                  className="w-6 h-6 rounded-full border border-brand-200 text-[10px] font-black text-brand-500"
                                  aria-label={`Edit ${item.label}`}
                                >
                                  i
                                </button>
                              </div>
                            ))}
                            {!weeklyChecklistItems.length && (
                              <p className="text-sm text-brand-800/60 font-medium">Add a weekly checklist item below.</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Add custom check</p>
                        <div className="grid md:grid-cols-3 gap-3">
                          <input
                            className="bg-white border border-brand-100 rounded-2xl px-4 py-3 text-sm md:col-span-2"
                            placeholder="e.g., Brush coat, Refill water"
                            value={customChecklistDraft.label}
                            onChange={(e) => setCustomChecklistDraft({ ...customChecklistDraft, label: e.target.value })}
                          />
                          <select
                            className="bg-white border border-brand-100 rounded-2xl px-4 py-3 text-sm"
                            value={customChecklistDraft.frequency}
                            onChange={(e) => setCustomChecklistDraft({ ...customChecklistDraft, frequency: e.target.value as CustomChecklistItem['frequency'] })}
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-400">
                            <input
                              type="checkbox"
                              checked={customChecklistDraft.notifyEnabled}
                              onChange={(e) => setCustomChecklistDraft({ ...customChecklistDraft, notifyEnabled: e.target.checked })}
                              className="accent-brand-500"
                            />
                            Notify me
                          </label>
                          <input
                            type="time"
                            className="bg-white border border-brand-100 rounded-2xl px-4 py-2 text-sm"
                            value={customChecklistDraft.remindTime}
                            onChange={(e) => setCustomChecklistDraft({ ...customChecklistDraft, remindTime: e.target.value })}
                          />
                          <button
                            onClick={handleAddCustomChecklist}
                            className="bg-brand-900 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest"
                          >
                            Add Check
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            {profileView === 'parent' ? (
              <div className="bg-white rounded-[4.5rem] border border-brand-50 p-12 space-y-10 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-brand-50 pb-8">
                  <div>
                    <h3 className="text-3xl font-display font-black text-brand-900">Parent Profile</h3>
                    <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest">Account Identity</span>
                  </div>
                  <div className="flex justify-center w-full">
                    <div className="bg-brand-50/70 border border-brand-100 rounded-full p-1 flex gap-2 w-full max-w-md">
                    <button
                      onClick={() => setProfileView('pet')}
                      className="flex-1 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-500"
                    >
                      Pet Info
                    </button>
                    <button
                      onClick={() => setProfileView('parent')}
                      className="flex-1 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-900 text-white"
                    >
                      Parent Info
                    </button>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Email</label>
                    <input
                      disabled
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm text-brand-400"
                      value={parentDraft.email}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Full Name</label>
                    <input
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={parentDraft.fullName}
                      onChange={(e) => setParentDraft({ ...parentDraft, fullName: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Phone</label>
                    <input
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={parentDraft.phone}
                      onChange={(e) => setParentDraft({ ...parentDraft, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Password</label>
                    <button
                      onClick={() => {
                        showToast('Use Forgot Password on the login screen to reset.', 'error');
                      }}
                      className="w-full bg-white border border-brand-100 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-500 hover:border-brand-300"
                    >
                      Reset via Login Screen
                    </button>
                  </div>
                </div>
                {parentSaveState === 'error' && (
                  <p className="text-sm text-red-500 font-bold">{parentSaveError}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Changes update your account record.</p>
                  <button
                    onClick={handleSaveParentProfile}
                    disabled={parentSaveState === 'saving'}
                    className="bg-brand-900 text-white px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all disabled:opacity-60"
                  >
                    {parentSaveState === 'saving' ? 'Saving...' : 'Save Parent Profile'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-3xl font-display font-black text-brand-900">Pet Insights</h3>
                    <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest">Profile + care signals</span>
                  </div>
                  <div className="flex justify-center w-full">
                    <div className="bg-brand-50/70 border border-brand-100 rounded-full p-1 flex gap-2 w-full max-w-md">
                    <button
                      onClick={() => setProfileView('pet')}
                      className="flex-1 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-900 text-white"
                    >
                      Pet Info
                    </button>
                    <button
                      onClick={openParentProfile}
                      className="flex-1 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-500"
                    >
                      Parent Info
                    </button>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-[4.5rem] border border-brand-50 p-12 space-y-8 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-display font-black text-brand-900">Profile snapshot</h3>
                      <p className="text-sm text-brand-800/60 font-medium">Key details that drive your insights.</p>
                    </div>
                    <button
                      onClick={openPetProfileEditor}
                      disabled={!user.pet}
                      className="bg-brand-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all disabled:opacity-40"
                    >
                      Edit Profile
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-brand-800/70 font-medium">
                    <p>Breed: {user.pet?.breed || '—'}</p>
                    <p>Age: {user.pet?.age || '—'}</p>
                    <p>Weight: {user.pet?.weight || '—'} kg</p>
                    <p>Diet: {user.pet?.dietType || '—'}</p>
                    <p>Activity baseline: {user.pet?.activityBaseline || '—'}</p>
                    <p>Vaccination: {user.pet?.vaccinationStatus || '—'}</p>
                    <p>Vet access: {user.pet?.vetAccess || '—'}</p>
                    <p>Next check-in: {weeklyCheckinStats.nextCheckin.toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-[3rem] border border-brand-50 p-6 shadow-sm space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Medical compliance</p>
                    <p className="text-2xl font-display font-black text-brand-900">{dashboardSummary?.medicalCompliance?.value || '—'}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                      {dashboardSummary?.medicalCompliance?.note || 'No schedule data yet'}
                    </p>
                    <p className="text-xs text-brand-800/60 font-medium">
                      {dashboardSummary?.medicalCompliance?.detail || 'Log vaccines, deworming, and vet visits to calculate compliance.'}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openPetQuickUpdate(undefined, 'medical')}
                        className="text-[9px] font-black uppercase tracking-widest text-brand-500"
                      >
                        Add medical event →
                      </button>
                      <button
                        onClick={() => setShowMedicalSchedule(prev => !prev)}
                        className="text-[9px] font-black uppercase tracking-widest text-brand-500"
                      >
                        {showMedicalSchedule ? 'Hide schedule' : 'View schedule →'}
                      </button>
                    </div>
                    {showMedicalSchedule && (
                      <div className="bg-brand-50/60 border border-brand-100 rounded-2xl p-4 space-y-2">
                        {medicalEvents.length ? (
                          medicalEvents.slice(0, 4).map(event => {
                            const dueDate = event.nextDue ? new Date(event.nextDue) : null;
                            const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;
                            return (
                              <div key={event.id} className="flex items-center justify-between text-sm text-brand-800 font-medium">
                                <div>
                                  <p>{event.eventType}</p>
                                  {event.nextDue && (
                                    <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">
                                      Next due {new Date(event.nextDue).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                {event.nextDue && (
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${isOverdue ? 'text-red-500' : 'text-brand-500'}`}>
                                    {isOverdue ? 'Overdue' : 'Scheduled'}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-brand-800/60 font-medium">No medical schedule yet.</p>
                        )}
                      </div>
                    )}
                    {!dashboardSummary?.medicalCompliance?.value && (
                      <button
                        onClick={() => openPetQuickUpdate(undefined, 'medical')}
                        className="text-[9px] font-black uppercase tracking-widest text-brand-500"
                      >
                        Add medical event →
                      </button>
                    )}
                  </div>
                  <div className="bg-white rounded-[3rem] border border-brand-50 p-6 shadow-sm space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Environment risk</p>
                    <p className="text-2xl font-display font-black text-brand-900">{dashboardSummary?.environmentRisk?.value || '—'}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                      {dashboardSummary?.environmentRisk?.note || 'No city data yet'}
                    </p>
                    <p className="text-xs text-brand-800/60 font-medium">
                      {dashboardSummary?.environmentRisk?.detail || 'Add your city to get heat, air quality, and safety risk alerts.'}
                    </p>
                    {!dashboardSummary?.environmentRisk?.value && (
                      <button
                        onClick={openPetProfileEditor}
                        className="text-[9px] font-black uppercase tracking-widest text-brand-500"
                      >
                        Update city →
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-[4.5rem] border border-brand-50 p-10 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-display font-black text-brand-900">Triage & Care</h3>
                      <p className="text-sm text-brand-800/60 font-medium">Get emergency vs wait and share a vet brief.</p>
                    </div>
                    <button
                    onClick={openTriageModal}
                      className="bg-brand-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all"
                    >
                      Start triage
                    </button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {triageHighlights.map((item, index) => (
                      <div
                        key={item.title}
                        className="text-left bg-brand-50/70 border border-brand-100 rounded-[2rem] p-5 space-y-2 motion-section h-full flex flex-col"
                        style={motionDelay(index)}
                      >
                        <p className="text-sm font-display font-black text-brand-900">{item.title}</p>
                        <p className="text-xs text-brand-800/60 font-medium">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-brand-50/60 border border-brand-100 rounded-[2rem] p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Recent triage</p>
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-500">{careRequests.length}</span>
                    </div>
                    {careRequests.length ? (
                      <div className="space-y-3">
                        {careRequests.slice(0, 3).map(request => (
                          <button
                            key={request.id}
                            onClick={() => {
                              setSelectedTriage(request);
                              setShowVetBrief(true);
                            }}
                            className="w-full text-left bg-white/70 border border-brand-100 rounded-2xl p-4 flex items-center justify-between hover:bg-white transition-colors"
                          >
                            <div>
                              <p className="text-sm font-display font-black text-brand-900">{request.concern || request.requestType}</p>
                              <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">
                                {getTriageOutcomeLabel(request)}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                              {request.id.startsWith('local-') ? 'Local draft' : request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-brand-800/60 font-medium">No requests yet.</p>
                    )}
                  </div>
                </div>

              </>
            )}
            <div className="bg-white rounded-[4.5rem] border border-brand-50 p-12 space-y-6 shadow-sm">
              <button
                onClick={() => setShowFeedback(prev => !prev)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <h3 className="text-2xl font-display font-black text-brand-900">Founder Feedback</h3>
                  <p className="text-brand-800/40 text-sm font-medium">Tell us what’s working and what’s missing.</p>
                </div>
                <span className={`text-sm font-black text-brand-500 transition-transform ${showFeedback ? 'rotate-180' : ''}`}>⌄</span>
              </button>
              {showFeedback && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Rating</label>
                      <select
                        className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                        value={feedbackDraft.rating}
                        onChange={(e) => setFeedbackDraft({ ...feedbackDraft, rating: Number(e.target.value) })}
                      >
                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(value => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Sentiment</label>
                      <select
                        className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                        value={feedbackDraft.sentiment}
                        onChange={(e) => setFeedbackDraft({ ...feedbackDraft, sentiment: e.target.value })}
                      >
                        {['Positive', 'Neutral', 'Negative'].map(option => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Message</label>
                      <textarea
                        className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm h-28 resize-none"
                        placeholder="What should we improve next?"
                        value={feedbackDraft.message}
                        onChange={(e) => setFeedbackDraft({ ...feedbackDraft, message: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Tags</label>
                      <input
                        className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                        placeholder="trends, health score, alerts"
                        value={feedbackDraft.tags}
                        onChange={(e) => setFeedbackDraft({ ...feedbackDraft, tags: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Helps us refine your dashboard.</p>
                    <button
                      onClick={handleSaveFeedback}
                      className="bg-brand-900 text-white px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all"
                    >
                      Send Feedback
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <button onClick={onLogout} className="w-full py-6 text-red-300 font-black uppercase tracking-[0.5em] text-[10px] hover:text-red-500 transition-colors">Logout</button>
            </div>
          </div>
          </div>
        )}

        {activeTab === 'adoption' && (
          <div className="space-y-12 animate-reveal pb-20">
            <Adoption city={user.pet?.city} />
          </div>
        )}

      </main>

      {/* Navigation */}
      <nav className="fixed bottom-10 left-6 right-6 h-24 bg-neutral-dark/95 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_40px_100px_-15px_rgba(49,29,14,0.6)] flex items-center justify-around px-10 z-50 border border-white/10">
        {[
          { id: 'home' as const, label: 'Feed', icon: '🐾' },
          { id: 'triage' as const, label: 'Triage', icon: '🩺' },
          { id: 'nutri' as const, label: 'Lens', icon: '🥗' },
          { id: 'play' as const, label: 'Play', icon: '🏃‍♂️' },
          { id: 'parent' as const, label: 'Parent', icon: '🦴' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-3 transition-all duration-700 ${activeTab === tab.id ? 'text-brand-500 -translate-y-5' : 'text-white hover:text-white/90'}`}>
            <span className={`text-3xl transition-all duration-700 ${activeTab === tab.id ? 'scale-150 drop-shadow-[0_0_20px_rgba(245,146,69,0.8)]' : 'scale-100 opacity-60'}`}>{tab.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/80">{tab.label}</span>
          </button>
        ))}
      </nav>

      {showPetProfileEditor && (
        <div className="fixed inset-0 z-[130] bg-brand-900/50 backdrop-blur-sm flex items-center justify-center p-6 motion-backdrop">
          <div className="bg-white rounded-[3rem] p-8 max-w-5xl w-full space-y-8 shadow-2xl max-h-[85vh] overflow-y-auto motion-modal">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-display font-black text-brand-900">Edit Pet Profile</h3>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-400">Keep your pet registry accurate</p>
              </div>
              <button onClick={() => setShowPetProfileEditor(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-500">Close</button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-brand-500">Identity</h4>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Pet Name</label>
                  <input
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    placeholder="Pet Name"
                    value={petDraft.name}
                    onChange={(e) => setPetDraft({ ...petDraft, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Breed</label>
                  <select
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    value={petDraft.breed}
                    onChange={(e) => setPetDraft({ ...petDraft, breed: e.target.value })}
                  >
                    {BREED_OPTIONS.map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Age</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={petDraft.age}
                      onChange={(e) => setPetDraft({ ...petDraft, age: e.target.value })}
                    >
                      {['Puppy', 'Adult', 'Senior'].map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Gender</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={petDraft.gender}
                      onChange={(e) => setPetDraft({ ...petDraft, gender: e.target.value as PetData['gender'] })}
                    >
                      {GENDER_OPTIONS.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">City</label>
                  <input
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    placeholder="City"
                    value={petDraft.city}
                    onChange={(e) => setPetDraft({ ...petDraft, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-brand-500">Vitals</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Age (Months)</label>
                    <input
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      placeholder="Age (months)"
                      value={petDraft.ageMonths}
                      onChange={(e) => setPetDraft({ ...petDraft, ageMonths: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Weight (kg)</label>
                    <input
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      placeholder="Weight (kg)"
                      value={petDraft.weight}
                      onChange={(e) => setPetDraft({ ...petDraft, weight: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Spay/Neuter</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={petDraft.spayNeuterStatus}
                      onChange={(e) => setPetDraft({ ...petDraft, spayNeuterStatus: e.target.value as PetData['spayNeuterStatus'] })}
                    >
                      {SPAY_STATUSES.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Vaccination Status</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={petDraft.vaccinationStatus}
                      onChange={(e) => setPetDraft({ ...petDraft, vaccinationStatus: e.target.value as PetData['vaccinationStatus'] })}
                    >
                      {VACCINATION_STATUSES.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Last Vaccine Date</label>
                    <input
                      type="date"
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={petDraft.lastVaccineDate}
                      onChange={(e) => setPetDraft({ ...petDraft, lastVaccineDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Vet Access</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={petDraft.vetAccess}
                      onChange={(e) => setPetDraft({ ...petDraft, vetAccess: e.target.value as PetData['vetAccess'] })}
                    >
                      {VET_ACCESS.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-brand-500">Lifestyle</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Activity Level</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={petDraft.activityLevel}
                      onChange={(e) => setPetDraft({ ...petDraft, activityLevel: e.target.value as PetData['activityLevel'] })}
                    >
                      {ACTIVITY_LEVELS.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Activity Baseline</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={petDraft.activityBaseline}
                      onChange={(e) => setPetDraft({ ...petDraft, activityBaseline: e.target.value as PetData['activityBaseline'] })}
                    >
                      {ACTIVITY_BASELINES.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Housing</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-4 py-4 text-sm"
                      value={petDraft.housingType}
                      onChange={(e) => setPetDraft({ ...petDraft, housingType: e.target.value as PetData['housingType'] })}
                    >
                      {HOUSING_TYPES.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Walk Surface</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-4 py-4 text-sm"
                      value={petDraft.walkSurface}
                      onChange={(e) => setPetDraft({ ...petDraft, walkSurface: e.target.value as PetData['walkSurface'] })}
                    >
                      {WALK_SURFACES.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Park Access</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-4 py-4 text-sm"
                      value={petDraft.parkAccess}
                      onChange={(e) => setPetDraft({ ...petDraft, parkAccess: e.target.value as PetData['parkAccess'] })}
                    >
                      {PARK_ACCESS.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-brand-500">Nutrition</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Diet Type</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={petDraft.dietType}
                      onChange={(e) => setPetDraft({ ...petDraft, dietType: e.target.value as PetData['dietType'] })}
                    >
                      {DIET_TYPES.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Feeding Schedule</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={petDraft.feedingSchedule}
                      onChange={(e) => setPetDraft({ ...petDraft, feedingSchedule: e.target.value as PetData['feedingSchedule'] })}
                    >
                      {FEEDING_SCHEDULES.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Food Brand</label>
                  <input
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    placeholder="Primary Food Brand"
                    value={petDraft.foodBrand}
                    onChange={(e) => setPetDraft({ ...petDraft, foodBrand: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Allergies</label>
                <input
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                  placeholder="Allergies (comma separated)"
                  value={petDraft.allergies}
                  onChange={(e) => setPetDraft({ ...petDraft, allergies: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Interests</label>
                <input
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                  placeholder="Interests (comma separated)"
                  value={petDraft.interests}
                  onChange={(e) => setPetDraft({ ...petDraft, interests: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Goals</label>
                <input
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                  placeholder="Goals (comma separated)"
                  value={petDraft.goals}
                  onChange={(e) => setPetDraft({ ...petDraft, goals: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Conditions</label>
                <input
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                  placeholder="Conditions (comma separated)"
                  value={petDraft.conditions}
                  onChange={(e) => setPetDraft({ ...petDraft, conditions: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Medications</label>
                <input
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                  placeholder="Medications (comma separated)"
                  value={petDraft.medications}
                  onChange={(e) => setPetDraft({ ...petDraft, medications: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Last Vet Visit</label>
                <input
                  type="date"
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                  value={petDraft.lastVetVisitDate}
                  onChange={(e) => setPetDraft({ ...petDraft, lastVetVisitDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Primary Vet Name</label>
                <input
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                  placeholder="Vet name"
                  value={petDraft.primaryVetName}
                  onChange={(e) => setPetDraft({ ...petDraft, primaryVetName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Primary Vet Phone</label>
                <input
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                  placeholder="+91 98xxxxxx"
                  value={petDraft.primaryVetPhone}
                  onChange={(e) => setPetDraft({ ...petDraft, primaryVetPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Emergency Contact Name</label>
                <input
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                  placeholder="Contact name"
                  value={petDraft.emergencyContactName}
                  onChange={(e) => setPetDraft({ ...petDraft, emergencyContactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Emergency Contact Phone</label>
                <input
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                  placeholder="+91 98xxxxxx"
                  value={petDraft.emergencyContactPhone}
                  onChange={(e) => setPetDraft({ ...petDraft, emergencyContactPhone: e.target.value })}
                />
              </div>
            </div>

            {petSaveState === 'error' && (
              <p className="text-sm text-red-500 font-bold">{petSaveError || 'Failed to update profile.'}</p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Saved changes update your AI intelligence feed.</p>
              <button
                onClick={handleSavePetProfile}
                disabled={petSaveState === 'saving'}
                className="bg-brand-900 text-white px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all disabled:opacity-60"
              >
                {petSaveState === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPetQuickUpdate && (
        <div className="fixed inset-0 z-[130] bg-brand-900/50 backdrop-blur-sm flex items-center justify-center p-6 motion-backdrop">
          <div className="bg-white rounded-[3rem] p-8 max-w-2xl w-full space-y-8 shadow-2xl max-h-[85vh] overflow-y-auto motion-modal">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-display font-black text-brand-900">Quick Pet Update</h3>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-400">{activeQuickUpdateMode.label}</p>
              </div>
              <button onClick={() => setShowPetQuickUpdate(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-500">Close</button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Log Type</label>
              <select
                className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                value={quickUpdateMode}
                onChange={(e) => setQuickUpdateMode(e.target.value as QuickUpdateMode)}
              >
                {QUICK_UPDATE_MODES.map(mode => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-300">{activeQuickUpdateMode.helper}</p>
            </div>

            {quickUpdateMode === 'weekly' && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Update Date</label>
                    <input
                      type="date"
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={quickUpdateDraft.date}
                      onChange={(e) => setQuickUpdateDraft({ ...quickUpdateDraft, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Weight (kg)</label>
                    <input
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      placeholder="Weight (kg)"
                      value={quickUpdateDraft.weight}
                      onChange={(e) => setQuickUpdateDraft({ ...quickUpdateDraft, weight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Activity Level</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={quickUpdateDraft.activityLevel}
                      onChange={(e) => setQuickUpdateDraft({ ...quickUpdateDraft, activityLevel: e.target.value })}
                    >
                      {ACTIVITY_LEVELS.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Diet Type</label>
                    <select
                      className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                      value={quickUpdateDraft.dietType}
                      onChange={(e) => setQuickUpdateDraft({ ...quickUpdateDraft, dietType: e.target.value })}
                    >
                      {DIET_TYPES.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Notes (optional)</label>
                  <textarea
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm h-28 resize-none"
                    placeholder="Appetite, energy, or anything unusual this week."
                    value={quickUpdateDraft.notes}
                    onChange={(e) => setQuickUpdateDraft({ ...quickUpdateDraft, notes: e.target.value })}
                  />
                </div>
              </>
            )}

            {quickUpdateMode === 'diet' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Log Date</label>
                  <input
                    type="date"
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    value={dietLogDraft.logDate}
                    onChange={(e) => setDietLogDraft({ ...dietLogDraft, logDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Meal Type</label>
                  <select
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    value={dietLogDraft.mealType}
                    onChange={(e) => setDietLogDraft({ ...dietLogDraft, mealType: e.target.value })}
                  >
                    {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Diet Type</label>
                  <select
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    value={dietLogDraft.dietType}
                    onChange={(e) => setDietLogDraft({ ...dietLogDraft, dietType: e.target.value })}
                  >
                    {DIET_TYPES.map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Food Served</label>
                  <input
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    placeholder="Food served"
                    value={dietLogDraft.actualFood}
                    onChange={(e) => setDietLogDraft({ ...dietLogDraft, actualFood: e.target.value })}
                  />
                </div>
              </div>
            )}

            {quickUpdateMode === 'medical' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Event Type</label>
                  <select
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    value={medicalEventDraft.eventType}
                    onChange={(e) => setMedicalEventDraft({ ...medicalEventDraft, eventType: e.target.value })}
                  >
                    {['Vaccine', 'Deworming', 'Vet Visit', 'Grooming', 'Other'].map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Date Administered</label>
                  <input
                    type="date"
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    value={medicalEventDraft.dateAdministered}
                    onChange={(e) => setMedicalEventDraft({ ...medicalEventDraft, dateAdministered: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Next Due</label>
                  <input
                    type="date"
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    value={medicalEventDraft.nextDue}
                    onChange={(e) => setMedicalEventDraft({ ...medicalEventDraft, nextDue: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Verified By</label>
                  <input
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    placeholder="Vet or clinic"
                    value={medicalEventDraft.verifiedBy}
                    onChange={(e) => setMedicalEventDraft({ ...medicalEventDraft, verifiedBy: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Notes</label>
                  <textarea
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm h-24 resize-none"
                    placeholder="Add any notes"
                    value={medicalEventDraft.notes}
                    onChange={(e) => setMedicalEventDraft({ ...medicalEventDraft, notes: e.target.value })}
                  />
                </div>
              </div>
            )}

            {quickUpdateMode === 'symptom' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Occurred At</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    value={symptomLogDraft.occurredAt}
                    onChange={(e) => setSymptomLogDraft({ ...symptomLogDraft, occurredAt: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Symptom</label>
                  <input
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    placeholder="Symptom type"
                    value={symptomLogDraft.symptomType}
                    onChange={(e) => setSymptomLogDraft({ ...symptomLogDraft, symptomType: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Severity</label>
                  <select
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                    value={symptomLogDraft.severity}
                    onChange={(e) => setSymptomLogDraft({ ...symptomLogDraft, severity: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map(option => (
                      <option key={option} value={option}>Severity {option}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Notes</label>
                  <textarea
                    className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm h-24 resize-none"
                    placeholder="What you observed"
                    value={symptomLogDraft.notes}
                    onChange={(e) => setSymptomLogDraft({ ...symptomLogDraft, notes: e.target.value })}
                  />
                </div>
              </div>
            )}

            {quickUpdateMode === 'weekly' && petSaveState === 'error' && (
              <p className="text-sm text-red-500 font-bold">{petSaveError || 'Failed to update pet.'}</p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Updates refresh your daily brief logic.</p>
              <button
                onClick={handleQuickUpdateSubmit}
                disabled={quickUpdateMode === 'weekly' && petSaveState === 'saving'}
                className="bg-brand-900 text-white px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all disabled:opacity-60"
              >
                {quickUpdateMode === 'weekly' && petSaveState === 'saving' ? 'Saving...' : `Save ${activeQuickUpdateMode.label}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {checklistEditor && (
        <div className="fixed inset-0 z-[135] bg-brand-900/50 backdrop-blur-sm flex items-center justify-center p-6 motion-backdrop">
          <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto motion-modal">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-display font-black text-brand-900">Edit Checklist Item</h3>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-400">{checklistEditor.frequency} item</p>
              </div>
              <button onClick={() => setChecklistEditor(null)} className="text-[10px] font-black uppercase tracking-widest text-brand-500">Close</button>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Label</label>
              <input
                className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                value={checklistEditor.label}
                onChange={(e) => setChecklistEditor({ ...checklistEditor, label: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-400">
                <input
                  type="checkbox"
                  checked={checklistEditor.notifyEnabled}
                  onChange={(e) => setChecklistEditor({ ...checklistEditor, notifyEnabled: e.target.checked })}
                  className="accent-brand-500"
                />
                Notify me
              </label>
              <input
                type="time"
                className="bg-white border border-brand-100 rounded-2xl px-4 py-2 text-sm"
                value={checklistEditor.remindTime}
                onChange={(e) => setChecklistEditor({ ...checklistEditor, remindTime: e.target.value })}
              />
            </div>
            <div className="grid gap-3">
              <button
                onClick={handleChecklistEditorSave}
                className="w-full bg-brand-900 text-white py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all"
              >
                Save Changes
              </button>
              <button
                onClick={handleChecklistEditorRemove}
                className="w-full bg-white border border-brand-100 text-brand-900 py-3 rounded-[2rem] font-black text-[10px] uppercase tracking-widest"
              >
                Remove Item
              </button>
            </div>
          </div>
        </div>
      )}

      {showVetBrief && (
        <div className="fixed inset-0 z-[135] bg-brand-900/50 backdrop-blur-sm flex items-center justify-center p-6 motion-backdrop">
          <div className="bg-white rounded-[3rem] p-8 max-w-6xl w-full space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto motion-modal">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-display font-black text-brand-900">Vet Brief</h3>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-400">Shareable intake summary</p>
              </div>
              <button onClick={() => setShowVetBrief(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-500">Close</button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyVetBrief}
                className="bg-brand-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all"
              >
                Copy brief
              </button>
              <button
                onClick={handlePrintVetBrief}
                className="bg-white border border-brand-100 text-brand-900 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-brand-50 transition-all"
              >
                Export PDF
              </button>
              <button
                onClick={() => {
                  setShowVetBrief(false);
                  openTriageModal();
                }}
                className="text-[10px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
              >
                Add triage notes
              </button>
            </div>
            <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Report range</span>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
                {VET_BRIEF_RANGE_OPTIONS.map(days => {
                  const isActive = vetBriefRangeDays === days;
                  return (
                    <button
                      key={`report-range-${days}`}
                      onClick={() => setVetBriefRangeDays(days)}
                      className={`w-full px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all sm:w-auto ${
                        isActive
                          ? 'bg-brand-900 text-white border-brand-900 shadow-lg'
                          : 'bg-white text-brand-600 border-brand-100 hover:border-brand-300'
                      }`}
                    >
                      {days} days
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
              Showing logs from {vetBriefRangeSentence}.
            </p>
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-3 motion-section" style={motionDelay(0)}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Pet overview</p>
                <div>
                  <h4 className="text-xl font-display font-black text-brand-900">{petNameLabel}</h4>
                  <p className="text-[11px] text-brand-800/60 font-medium">{petBreedLabel} | {petAgeLabel} | {petGenderLabel}</p>
                </div>
                <div className="text-[11px] text-brand-800/60 font-medium">
                  Weight {petWeightDisplay} | City {petCityLabel}
                </div>
                <div className="space-y-1 text-[10px] font-bold uppercase tracking-widest text-brand-400">
                  <p>Vaccination: {petVaccinationLabel}</p>
                  <p>Last vaccine: {petLastVaccineLabel}</p>
                  <p>Last vet visit: {petLastVetVisitLabel}</p>
                  <p>Spay/neuter: {petSpayStatusLabel}</p>
                </div>
              </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-3 motion-section" style={motionDelay(1)}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Known history</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Conditions: {petConditionsLabel}</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Medications: {petMedicationsLabel}</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Allergies: {petAllergiesLabel}</p>
              </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-3 motion-section" style={motionDelay(2)}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Nutrition & routine</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Diet type: {petDietTypeLabel}</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Feeding schedule: {petFeedingScheduleLabel}</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Food brand: {petFoodBrandLabel}</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Activity baseline: {petActivityBaselineLabel}</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Housing: {petHousingLabel}</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Walk surface: {petWalkSurfaceLabel}</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Park access: {petParkAccessLabel}</p>
              </div>
              <div className="bg-white border border-brand-100 rounded-[2.5rem] p-6 space-y-4 lg:col-span-2 motion-section" style={motionDelay(3)}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Triage summary</p>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-400">{formatBriefDate(activeTriage?.createdAt)}</span>
                </div>
                <div className="grid md:grid-cols-4 gap-3 text-sm text-brand-800/70 font-medium">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Type</p>
                    <p>{activeTriage?.requestType || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Outcome</p>
                    <p>{activeTriageOutcomeLabel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Urgency</p>
                    <p>{activeTriage?.urgency || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Signal</p>
                    <p>{hasActiveTriage ? activeTriageTopic.label : '-'}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-xs text-brand-800/60 font-medium">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Concern</p>
                    <p>{safeValue(activeTriage?.concern)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Notes</p>
                    <p>{safeValue(activeTriage?.notes)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Onset</p>
                    <p>{safeValue(activeTriage?.preferredTime)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-4 lg:col-span-2 motion-section" style={motionDelay(4)}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Next steps</p>
                  <span className={`text-[9px] font-black uppercase tracking-widest border px-3 py-1 rounded-full ${triageToneClass}`}>
                    {triageBadgeLabel}
                  </span>
                </div>
                {hasActiveTriage ? (
                  <>
                    <p className="text-sm text-brand-800/70 font-medium">{activeTriageGuidance.summary}</p>
                    <div className="grid md:grid-cols-2 gap-4 text-[11px] text-brand-800/70 font-medium">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Do this now</p>
                        <ul className="space-y-1 list-disc list-inside">
                          {activeTriageGuidance.steps.map(step => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Red flags</p>
                        <ul className="space-y-1 list-disc list-inside">
                          {activeTriageGuidance.redFlags.map(flag => (
                            <li key={flag}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-brand-800/60 font-medium">Start a triage check to get personalized next steps.</p>
                )}
              </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-3 motion-section" style={motionDelay(5)}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Recent symptoms</p>
                {recentSymptoms.length ? (
                  <div className="space-y-2 text-[11px] text-brand-800/70 font-medium">
                    {recentSymptoms.map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span>{item.symptomType}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                          Sev {item.severity}/5 - {formatBriefDate(item.occurredAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-brand-800/60 font-medium">No symptoms logged in {vetBriefRangeSentence}.</p>
                )}
              </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-3 motion-section" style={motionDelay(6)}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Medical events</p>
                {recentMedicalEvents.length ? (
                  <div className="space-y-2 text-[11px] text-brand-800/70 font-medium">
                    {recentMedicalEvents.map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span>{item.eventType}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                          {formatBriefDate(item.dateAdministered)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-brand-800/60 font-medium">No medical events logged in {vetBriefRangeSentence}.</p>
                )}
              </div>
              <div className="bg-white border border-brand-100 rounded-[2.5rem] p-6 space-y-4 lg:col-span-2 motion-section" style={motionDelay(7)}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Weight trend ({vetBriefRangeLowerLabel})</p>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-brand-400">{weightTrend.deltaLabel}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-[11px] text-brand-800/70 font-medium">
                  <div className="space-y-1">
                    <p>Start: {weightTrend.startLabel}</p>
                    <p>End: {weightTrend.endLabel}</p>
                  </div>
                  <div className="space-y-1">
                    <p>Min: {weightTrend.minLabel}</p>
                    <p>Max: {weightTrend.maxLabel}</p>
                  </div>
                </div>
                {weightSparkline ? (
                  <div className="bg-white/70 border border-brand-100 rounded-2xl p-3">
                    <svg
                      viewBox={`0 0 ${weightSparkline.width} ${weightSparkline.height}`}
                      className="w-full h-14"
                      preserveAspectRatio="none"
                    >
                      <polyline
                        fill="none"
                        stroke="#A25A20"
                        strokeWidth="3"
                        points={weightSparkline.points}
                      />
                    </svg>
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-brand-400">
                      <span>{weightSparkline.min.toFixed(1)} kg</span>
                      <span>{weightSparkline.max.toFixed(1)} kg</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-brand-800/60 font-medium">Log two weights to view the trend line.</p>
                )}
              </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-4 lg:col-span-2 motion-section" style={motionDelay(8)}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Recent care logs</p>
                <div className="grid md:grid-cols-4 gap-3 text-sm text-brand-800/70 font-medium">
                  <div className="bg-white/70 border border-brand-100 rounded-2xl p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Latest check-in</p>
                    <p>{latestCheckinDate}</p>
                  </div>
                  <div className="bg-white/70 border border-brand-100 rounded-2xl p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Weight</p>
                    <p>{latestWeightDisplay}</p>
                  </div>
                  <div className="bg-white/70 border border-brand-100 rounded-2xl p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Diet</p>
                    <p>{latestDiet}</p>
                  </div>
                  <div className="bg-white/70 border border-brand-100 rounded-2xl p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Activity</p>
                    <p>{latestActivity}</p>
                  </div>
                </div>
              </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-3 lg:col-span-2 motion-section" style={motionDelay(9)}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Check-in timeline ({vetBriefRangeLowerLabel})</p>
                {checkinRows.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] text-brand-800/70 font-medium">
                      <thead className="text-[9px] font-black uppercase tracking-widest text-brand-400">
                        <tr>
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Weight</th>
                          <th className="py-2 pr-3">Delta</th>
                          <th className="py-2 pr-3">Diet</th>
                          <th className="py-2">Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkinRows.map((row, index) => (
                          <tr key={`checkin-row-${index}`} className="border-t border-brand-100/60">
                            <td className="py-2 pr-3">{row.date}</td>
                            <td className="py-2 pr-3">{row.weight}</td>
                            <td className="py-2 pr-3">{row.delta}</td>
                            <td className="py-2 pr-3">{row.diet}</td>
                            <td className="py-2">{row.activity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-brand-800/60 font-medium">No check-ins logged in {vetBriefRangeSentence}.</p>
                )}
              </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-3 lg:col-span-2 motion-section" style={motionDelay(10)}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Diet log ({vetBriefRangeLowerLabel})</p>
                {dietLogRows.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] text-brand-800/70 font-medium">
                      <thead className="text-[9px] font-black uppercase tracking-widest text-brand-400">
                        <tr>
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Meal</th>
                          <th className="py-2 pr-3">Diet</th>
                          <th className="py-2">Food</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dietLogRows.map((row, index) => (
                          <tr key={`diet-row-${index}`} className="border-t border-brand-100/60">
                            <td className="py-2 pr-3">{row.date}</td>
                            <td className="py-2 pr-3">{row.meal}</td>
                            <td className="py-2 pr-3">{row.diet}</td>
                            <td className="py-2">{row.food}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-brand-800/60 font-medium">No diet logs in {vetBriefRangeSentence}.</p>
                )}
              </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-3 lg:col-span-2 motion-section" style={motionDelay(11)}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Vet contacts</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Primary vet: {primaryVetLabel}</p>
                <p className="text-[11px] text-brand-800/70 font-medium">Emergency contact: {emergencyContactLabel}</p>
              </div>
            </div>
            <div className="bg-brand-900 text-white/80 rounded-[2rem] p-4 text-[10px] font-bold uppercase tracking-widest motion-section" style={motionDelay(12)}>
              Not a diagnosis. Use this brief to speed up your vet visit.
            </div>
          </div>
        </div>
      )}

      {showCareRequest && (
        <div className="fixed inset-0 z-[135] bg-brand-900/50 backdrop-blur-sm flex items-center justify-center p-6 motion-backdrop">
          <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto motion-modal">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-display font-black text-brand-900">Triage Check</h3>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-400">Quick symptom intake</p>
              </div>
              <button onClick={() => setShowCareRequest(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-500">Close</button>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Primary concern</label>
              <input
                className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                placeholder="Short summary (e.g., vomiting, limping)"
                value={careRequestDraft.concern}
                onChange={(e) => setCareRequestDraft({ ...careRequestDraft, concern: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">When did it start?</label>
              <input
                type="text"
                className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                placeholder="e.g., Today 6pm, Yesterday morning"
                value={careRequestDraft.preferredTime}
                onChange={(e) => setCareRequestDraft({ ...careRequestDraft, preferredTime: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Symptoms + context</label>
              <textarea
                className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm h-28 resize-none"
                placeholder="Include appetite, behavior change, meds, or allergies"
                value={careRequestDraft.notes}
                onChange={(e) => setCareRequestDraft({ ...careRequestDraft, notes: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">How urgent does this feel?</label>
              <select
                className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                value={careRequestDraft.urgency}
                onChange={(e) => setCareRequestDraft({ ...careRequestDraft, urgency: e.target.value })}
              >
                {['Monitor', 'Visit soon', 'Emergency'].map(option => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <div className="bg-brand-50/60 border border-brand-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Suggested next step</p>
                  <span className={`text-[9px] font-black uppercase tracking-widest border px-3 py-1 rounded-full ${draftTriageToneClass}`}>
                    {draftTriageGuidance.badge}
                  </span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">
                  Signal: {draftTriageTopic.label}
                </p>
                <p className="text-sm text-brand-800/70 font-medium">{draftTriageGuidance.summary}</p>
                <ul className="text-[11px] text-brand-800/70 font-medium list-disc list-inside space-y-1">
                  {draftTriageGuidance.steps.slice(0, 2).map(step => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Contact phone (optional)</label>
              <input
                className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-6 py-4 text-sm"
                placeholder="+91 98765 43210"
                value={careRequestDraft.phone}
                onChange={(e) => setCareRequestDraft({ ...careRequestDraft, phone: e.target.value })}
              />
            </div>
            <button
              onClick={() => {
                handleSaveCareRequest();
              }}
              className="w-full bg-brand-900 text-white py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all"
            >
              Submit Triage
            </button>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed top-24 right-6 z-[120] w-[320px] bg-white border border-brand-50 rounded-[2rem] shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-display font-black text-brand-900">Notifications</h4>
            <button onClick={() => setShowNotifications(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-500">Close</button>
          </div>
          {notifications.length > 0 ? (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
              {notifications.map(item => (
                <div key={item.id} className="bg-brand-50/70 p-4 rounded-2xl">
                  <p className="text-sm font-display font-black text-brand-900">{item.title}</p>
                  <p className="text-[10px] text-brand-800/60 font-bold uppercase tracking-widest">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-800/50 font-medium italic">No new notifications.</p>
          )}
        </div>
      )}

      {showTreats && (
        <div className="fixed inset-0 z-[130] bg-brand-900/50 backdrop-blur-sm flex items-center justify-center p-6 motion-backdrop">
          <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto motion-modal">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-display font-black text-brand-900">Pet Treats</h3>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-400">Earned rewards</p>
              </div>
              <button onClick={() => setShowTreats(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-500">Close</button>
            </div>
              <div className="bg-brand-50/60 border border-brand-100 rounded-[2.5rem] p-6 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Total Treats</p>
              <p className="text-4xl font-display font-black text-brand-900">{treatPoints}</p>
              <p className="text-xs text-brand-800/60 font-medium">Earn treats for daily care, weekly check-ins, and activity logs.</p>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-brand-100">
                <div
                  className="h-full bg-brand-900"
                  style={{ width: `${Math.min(100, Math.round((claimedTreats / Math.max(treatPoints, 1)) * 100))}%` }}
                />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">{claimedTreats} claimed · {Math.max(treatPoints - claimedTreats, 0)} available</p>
            </div>
            <div className="grid gap-3 text-sm text-brand-800/70 font-medium">
              <p>Care tasks done: {checklistCompletedCount}</p>
              <p>Care streak days: {checklistStreak}</p>
              <p>Weekly check-ins: {treatsLedger.updates}</p>
              <p>Activity logs: {treatsLedger.activities}</p>
            </div>
            <div className="grid gap-3">
              <button
                onClick={handleTreatClaim}
                className="w-full bg-brand-900 text-white py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all"
              >
                Claim Rewards
              </button>
              <button
                onClick={() => {
                  setShowTreats(false);
                  setActiveTab('play');
                }}
                className="w-full bg-white border border-brand-100 text-brand-900 py-3 rounded-[2rem] font-black text-[10px] uppercase tracking-widest"
              >
                Go to Activity Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayment && (
        <div className="fixed inset-0 z-[130] bg-brand-900/50 backdrop-blur-sm flex items-center justify-center p-6 motion-backdrop">
          <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto motion-modal">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-black text-brand-900">Choose your Pawveda plan</h3>
              <button onClick={() => setShowPayment(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-500">Close</button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Plus", price: "₹49/mo · ₹399/yr", desc: "Essential care + 2 AI checkups/month" },
                { label: "Pro Parent", price: "₹299/mo · ₹2,499/yr", desc: "Vet briefs + Safety Radar + 6 AI checkups/month" },
                { label: "Elite Parent", price: "₹499/mo · ₹3,999/yr", desc: "Advanced insights + 12 AI checkups/month" }
              ].map(plan => (
                <div key={plan.label} className="border border-brand-100 rounded-[2rem] p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-display font-black text-brand-900">{plan.label}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">{plan.desc}</p>
                  </div>
                  <span className="text-sm font-black text-brand-900">{plan.price}</span>
                </div>
              ))}
            </div>
            <div className="bg-brand-50/70 p-4 rounded-2xl text-xs text-brand-800/70">
              Powered by Razorpay. You’ll be redirected to a secure checkout.
            </div>
            <button
              onClick={() => {
                onUpgrade();
                setShowPayment(false);
              }}
              className="w-full bg-brand-900 text-white py-4 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-lg hover:bg-brand-500 transition-all"
            >
              Continue to Razorpay
            </button>
          </div>
        </div>
      )}

      {showReminders && (
        <div className="fixed inset-0 z-[130] bg-brand-900/50 backdrop-blur-sm flex items-center justify-center p-6 motion-backdrop">
          <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto motion-modal">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-black text-brand-900">Reminders</h3>
              <button onClick={() => setShowReminders(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-500">Close</button>
            </div>
            <div className="space-y-4">
              <input
                value={reminderDraft.title}
                onChange={e => setReminderDraft({ ...reminderDraft, title: e.target.value })}
                placeholder="Reminder title"
                className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-4 py-3 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={reminderDraft.date}
                  onChange={e => setReminderDraft({ ...reminderDraft, date: e.target.value })}
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-4 py-3 text-sm"
                />
                <select
                  value={reminderDraft.repeat}
                  onChange={e => setReminderDraft({ ...reminderDraft, repeat: e.target.value as Reminder['repeat'] })}
                  className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-4 py-3 text-sm"
                >
                  <option value="None">No Repeat</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              </div>
              <textarea
                value={reminderDraft.notes}
                onChange={e => setReminderDraft({ ...reminderDraft, notes: e.target.value })}
                placeholder="Notes (optional)"
                className="w-full bg-brand-50/60 border border-brand-100 rounded-2xl px-4 py-3 text-sm h-24 resize-none"
              />
              <button onClick={handleReminderSave} className="w-full bg-brand-900 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                {reminderDraft.id ? "Update Reminder" : "Add Reminder"}
              </button>
            </div>
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
              {reminders.length > 0 ? reminders.map(reminder => (
                <div key={reminder.id} className="bg-brand-50/70 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-display font-black text-brand-900">{reminder.title}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">{reminder.date} · {reminder.repeat}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleReminderEdit(reminder)} className="text-[9px] font-black uppercase tracking-widest text-brand-500">Edit</button>
                    <button onClick={() => handleReminderDelete(reminder.id)} className="text-[9px] font-black uppercase tracking-widest text-red-400">Delete</button>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-brand-800/50 font-medium italic">No reminders yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showHelpCenter && (
        <div className="fixed inset-0 z-[130] bg-brand-900/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-black text-brand-900">Help Center</h3>
              <button onClick={() => setShowHelpCenter(false)} className="text-[10px] font-black uppercase tracking-widest text-brand-500">Close</button>
            </div>
            <div className="space-y-3">
              {[
                { q: "How do I update my pet profile?", a: "Go to Parent Dashboard and edit your pet registry once cloud storage is connected." },
                { q: "How are care centres verified?", a: "We surface nearby services via maps and ask you to confirm hours before visiting." },
                { q: "How do reminders work?", a: "Set a date and repeat cycle; reminders appear in your feed and notifications." }
              ].map(item => (
                <div key={item.q} className="bg-brand-50/70 p-4 rounded-2xl">
                  <p className="text-sm font-display font-black text-brand-900">{item.q}</p>
                  <p className="text-xs text-brand-800/60 font-medium">{item.a}</p>
                </div>
              ))}
            </div>
            <div className="bg-brand-50/70 p-4 rounded-2xl space-y-3">
              <p className="text-sm font-display font-black text-brand-900">Contact Support</p>
              <input placeholder="Email" className="w-full bg-white border border-brand-100 rounded-2xl px-4 py-3 text-sm" />
              <textarea placeholder="Describe your issue" className="w-full bg-white border border-brand-100 rounded-2xl px-4 py-3 text-sm h-24 resize-none" />
              <button className="w-full bg-brand-900 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest">Submit Ticket</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-900/50 backdrop-blur-sm transition-all duration-500">
          <div className="bg-white p-16 rounded-[5rem] shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-700">
            <div className="w-24 h-24 border-8 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto shadow-xl" />
            <h3 className="text-3xl font-display font-black text-brand-900 tracking-tight">{loadingMsg || 'Syncing Node...'}</h3>
            <p className="text-brand-800/40 text-[9px] font-black uppercase tracking-[0.4em] animate-pulse">Intelligence Layer 3.0</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes reveal { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-reveal { animation: reveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .live-feed-scroll::-webkit-scrollbar { width: 6px; }
        .live-feed-scroll::-webkit-scrollbar-thumb { background: rgba(150, 115, 88, 0.3); border-radius: 999px; }
        .live-feed-scroll { scrollbar-width: thin; scrollbar-color: rgba(150, 115, 88, 0.3) transparent; }
      `}</style>
    </div>
  );
};

export default Dashboard;
