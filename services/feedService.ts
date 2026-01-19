import { ChecklistHistoryPoint, ChecklistSection, DailyBrief, DailyBriefItem, MicroTip, NearbyService, PetData, PetEvent, SafetyRadar } from "../types";
import { apiClient } from "./apiClient";

const MICRO_TIPS: MicroTip[] = [
  { id: "tip-heat-paws", title: "Paw Heat Check", detail: "If the pavement is too hot for your hand, it’s too hot for paws. Choose shaded routes.", tags: ["safety", "walks"] },
  { id: "tip-hydration", title: "Hydration Boost", detail: "Add a splash of unsalted bone broth or curd water to increase hydration on humid days.", tags: ["nutrition"] },
  { id: "tip-ticks", title: "Tick Patrol", detail: "Inspect ears, paws, and neck after walks. Early tick removal prevents infections.", tags: ["health"] },
  { id: "tip-deworm", title: "Deworming Rhythm", detail: "Adult dogs typically need deworming every 3 months. Confirm with your vet.", tags: ["health"] },
  { id: "tip-ears", title: "Ear Care", detail: "Indie and floppy-eared breeds trap moisture. Dry ears after bath or rain.", tags: ["grooming"] },
  { id: "tip-slow-feed", title: "Slow Feeding", detail: "Use a slow feeder or scatter feeding to reduce gulping and improve digestion.", tags: ["nutrition"] }
];

const CITY_EVENTS: Record<string, PetEvent[]> = {
  bengaluru: [
    { id: "blr-adopt-1", title: "Community Adoption Drive", venue: "Cubbon Park Zone", dateLabel: "This weekend", source: "Pawveda Community", city: "Bengaluru" },
    { id: "blr-vax-1", title: "Rabies Vaccination Camp", venue: "Koramangala Community Hall", dateLabel: "Next 7 days", source: "Local NGO", city: "Bengaluru" },
    { id: "blr-meet-1", title: "Indie Social Walk", venue: "Jayanagar 4th Block", dateLabel: "Sunday morning", source: "Pawveda Community", city: "Bengaluru" }
  ],
  delhi: [
    { id: "del-adopt-1", title: "Community Adoption Drive", venue: "Sundar Nursery Grounds", dateLabel: "This weekend", source: "Pawveda Community", city: "Delhi" },
    { id: "del-vax-1", title: "Rabies Vaccination Camp", venue: "Lodhi Road Clinic Hub", dateLabel: "Next 7 days", source: "Local NGO", city: "Delhi" },
    { id: "del-meet-1", title: "Indie Social Walk", venue: "Nehru Park Loop", dateLabel: "Sunday morning", source: "Pawveda Community", city: "Delhi" }
  ],
  mumbai: [
    { id: "mum-adopt-1", title: "Adoption + Foster Meet", venue: "Bandra Reclamation", dateLabel: "This weekend", source: "Local NGO", city: "Mumbai" },
    { id: "mum-vax-1", title: "Vaccination Camp", venue: "Andheri Pet Clinic Zone", dateLabel: "Next 7 days", source: "Vet Network", city: "Mumbai" },
    { id: "mum-meet-1", title: "Paw Parent Meetup", venue: "Powai Lakeside", dateLabel: "Saturday evening", source: "Pawveda Community", city: "Mumbai" }
  ],
  bangalore: [
    { id: "blr-adopt-1", title: "Community Adoption Drive", venue: "Cubbon Park Zone", dateLabel: "This weekend", source: "Pawveda Community", city: "Bangalore" },
    { id: "blr-vax-1", title: "Rabies Vaccination Camp", venue: "Koramangala Community Hall", dateLabel: "Next 7 days", source: "Local NGO", city: "Bangalore" },
    { id: "blr-meet-1", title: "Indie Social Walk", venue: "Jayanagar 4th Block", dateLabel: "Sunday morning", source: "Pawveda Community", city: "Bangalore" }
  ],
  pune: [
    { id: "pune-adopt-1", title: "Adoption + Foster Meet", venue: "Baner Open Ground", dateLabel: "This weekend", source: "Local NGO", city: "Pune" },
    { id: "pune-vax-1", title: "Puppy Vaccination Camp", venue: "Aundh Pet Clinic", dateLabel: "Next 7 days", source: "Vet Network", city: "Pune" },
    { id: "pune-meet-1", title: "Senior Dogs Care Session", venue: "Koregaon Park", dateLabel: "Saturday evening", source: "Pawveda Community", city: "Pune" }
  ]
};

const buildChecklist = (petData: PetData): ChecklistSection[] => {
  const activityTarget = petData.activityBaseline || (
    petData.activityLevel === 'High'
      ? '60-90 min/day'
      : petData.activityLevel === 'Low'
      ? '20-30 min/day'
      : '30-60 min/day'
  );
  const mealLabel = petData.dietType === 'Home Cooked'
    ? 'Balanced meal with protein + veg (no onion/garlic)'
    : 'Measure kibble per weight goal';
  const enrichmentLabel = petData.parkAccess === 'No'
    ? 'Add 10-min indoor enrichment'
    : 'Schedule one outdoor sniff walk';
  const pawLabel = petData.walkSurface === 'Asphalt'
    ? 'Check paws after hot pavement'
    : 'Quick paw + coat check';
  const vetLabel = petData.vetAccess === 'None'
    ? 'Book a baseline vet visit'
    : 'Confirm next vet check date';

  return [
    {
      id: 'daily-protocol',
      title: 'Daily Care Protocol',
      items: [
        { id: 'hydrate', label: 'Fresh water refreshed twice' },
        { id: 'meals', label: mealLabel },
        { id: 'activity', label: `Activity target: ${activityTarget}` },
        { id: 'enrichment', label: enrichmentLabel }
      ]
    },
    {
      id: 'safety-health',
      title: 'Safety & Health',
      items: [
        { id: 'paws', label: pawLabel },
        { id: 'coat', label: 'Brush coat or wipe down after walks' },
        { id: 'ticks', label: 'Quick tick check (ears, paws, neck)' },
        { id: 'vet', label: vetLabel }
      ]
    }
  ];
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getDailySlice = <T>(list: T[], count: number, seed: number): T[] => {
  if (list.length <= count) return list;
  const start = seed % list.length;
  return [...list.slice(start), ...list.slice(0, start)].slice(0, count);
};

export const getMicroTips = (petData: PetData): MicroTip[] => {
  const daySeed = Math.floor(Date.now() / 86400000);
  const seed = daySeed + hashString(petData.breed || "");
  return getDailySlice(MICRO_TIPS, 3, seed);
};

export const getChecklist = (petData: PetData): ChecklistSection[] => {
  return buildChecklist(petData);
};

export const fetchPetEvents = async (city: string): Promise<PetEvent[]> => {
  try {
    const data = await apiClient.get<{ events?: any[] }>(`/api/pet-events?city=${encodeURIComponent(city)}`);
    if (Array.isArray(data?.events) && data.events.length) {
      return data.events.map((event: any, index: number) => ({
        id: `event-${index}`,
        title: event.title || "Pet Event",
        venue: event.venue || city,
        dateLabel: event.dateLabel || "Upcoming",
        url: event.url,
        source: event.source || "Google Search",
        city
      }));
    }
  } catch {
    // ignore
  }
  const normalizedCity = city.toLowerCase();
  const fallback = CITY_EVENTS[normalizedCity];
  const seed = Math.floor(Date.now() / 86400000);
  if (fallback && fallback.length) {
    return getDailySlice(fallback, 3, seed);
  }
  const generic = [
    { id: "gen-adopt", title: "Community Adoption Drive", venue: `${city} Central Grounds`, dateLabel: "This weekend", source: "Pawveda Community", city },
    { id: "gen-vax", title: "Rabies Vaccination Camp", venue: `${city} Vet District`, dateLabel: "Next 7 days", source: "Local NGO", city },
    { id: "gen-meet", title: "Paw Parent Meetup", venue: `${city} City Park`, dateLabel: "Sunday morning", source: "Pawveda Community", city }
  ];
  return getDailySlice(generic, 3, seed);
};

const buildFallbackBrief = (city: string): DailyBrief => {
  const items: DailyBriefItem[] = [
    {
      id: "walk-index",
      title: "Walking Index",
      value: "78/100",
      detail: "Prefer shaded routes; avoid peak noon walks.",
      badge: "Climate Shield",
      icon: "🌡️"
    },
    {
      id: "hydration",
      title: "Hydration Risk",
      value: "Moderate",
      detail: "Add one extra water refill today.",
      badge: "Nutrition",
      icon: "💧"
    },
    {
      id: "air",
      title: "Air Quality",
      value: "Monitor",
      detail: "Keep outdoor activity short in the afternoon.",
      badge: "Safety",
      icon: "🫧"
    }
  ];
  return { city, updatedAt: new Date().toISOString(), items };
};

export const fetchDailyBrief = async (city: string): Promise<DailyBrief> => {
  try {
    return await apiClient.get<DailyBrief>(`/api/daily-brief?city=${encodeURIComponent(city)}`);
  } catch {
    // ignore
  }
  return buildFallbackBrief(city);
};

export const fetchSafetyRadar = async (city: string): Promise<SafetyRadar> => {
  try {
    return await apiClient.get<SafetyRadar>(`/api/air-quality?city=${encodeURIComponent(city)}`);
  } catch {
    // ignore
  }
  const day = new Date();
  const month = day.getMonth();
  const warmMonths = [3, 4, 5];
  const monsoonMonths = [6, 7, 8];
  const status = warmMonths.includes(month) ? "Heat Caution" : monsoonMonths.includes(month) ? "Monsoon Caution" : "Balanced";
  return {
    city,
    pm25: null,
    airQualityLabel: "Unknown",
    status,
    advisory: "Monitor local conditions and keep walks short during peak hours.",
    safeWindow: "6:00 AM - 9:00 AM",
    updatedAt: day.toISOString()
  };
};

export const fetchNearbyServices = async (city: string): Promise<NearbyService[]> => {
  try {
    const data = await apiClient.get<{ services?: NearbyService[] }>(`/api/nearby-services?city=${encodeURIComponent(city)}`);
    const services = Array.isArray(data?.services) ? data.services : [];
    if (services.length) return services;
  } catch {
    // ignore
  }
  const normalized = city.toLowerCase();
  const fallbackMap: Record<string, NearbyService[]> = {
    delhi: [
      {
        id: "del-vet-1",
        name: "Capital Vet Clinic",
        type: "Vet Clinic",
        address: "South Delhi",
        locality: "Delhi",
        link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Capital Vet Clinic Delhi")}`,
        source: "Google Maps"
      },
      {
        id: "del-groom-1",
        name: "Paws & Shine Grooming",
        type: "Groomer",
        address: "GK-II",
        locality: "Delhi",
        link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Paws & Shine Grooming Delhi")}`,
        source: "Google Maps"
      }
    ],
    mumbai: [
      {
        id: "mum-vet-1",
        name: "Coastal Pet Clinic",
        type: "Vet Clinic",
        address: "Bandra",
        locality: "Mumbai",
        link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Coastal Pet Clinic Mumbai")}`,
        source: "Google Maps"
      }
    ],
    bengaluru: [
      {
        id: "blr-vet-1",
        name: "Garden City Pet Clinic",
        type: "Vet Clinic",
        address: "Indiranagar",
        locality: "Bengaluru",
        link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Garden City Pet Clinic Bengaluru")}`,
        source: "Google Maps"
      }
    ],
    pune: [
      {
        id: "pune-vet-1",
        name: "Deccan Pet Care",
        type: "Vet Clinic",
        address: "Baner",
        locality: "Pune",
        link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Deccan Pet Care Pune")}`,
        source: "Google Maps"
      }
    ]
  };
  return fallbackMap[normalized] || [];
};

export const seedChecklistHistory = (): ChecklistHistoryPoint[] => {
  const today = new Date();
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return { date: date.toISOString().slice(0, 10), completion: 0 };
  });
};
