import { PetData } from '../types';
import { CAT_BREEDS, DOG_BREEDS, PetType } from './petOptions';
import { SourceRef, getSources } from './healthSources';

export type BreedInsight = {
  title: string;
  detail: string;
  sources: SourceRef[];
};

export type FocusSignal = {
  label: string;
  detail: string;
  sources: SourceRef[];
};

export type CheckupAssessment = {
  statusLabel: string;
  statusTone: 'steady' | 'watch' | 'care';
  summary: string;
  watchlist: string[];
  careChecklist: string[];
  vetBrief: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

const isMatchInList = (value: string, list: string[]) =>
  list.some(item => normalize(item) === normalize(value));

export const inferPetType = (breed: string | undefined, petType?: PetType | ''): PetType => {
  if (petType && petType !== '') return petType;
  if (breed) {
    if (isMatchInList(breed, DOG_BREEDS)) return 'Dog';
    if (isMatchInList(breed, CAT_BREEDS)) return 'Cat';
  }
  return 'Other';
};

const exerciseSources = (petType: PetType) =>
  petType === 'Cat' ? getSources(['vca_exercise_cat']) : getSources(['vca_exercise_dog']);

const groomingSources = (petType: PetType) =>
  petType === 'Cat' ? getSources(['rspca_grooming_cat']) : getSources(['rspca_grooming_dog']);

const seniorSources = (petType: PetType) =>
  petType === 'Cat' ? getSources(['vca_senior_cat']) : getSources(['vca_senior_dog']);

const hydrationSources = (petType: PetType) =>
  petType === 'Cat' ? getSources(['icatcare_water']) : getSources(['aspca_heat']);

const uniqueList = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const buildBreedSignals = (breed: string) => {
  const lower = normalize(breed);
  return {
    isIndie: lower.includes('indie') || lower.includes('pariah'),
    isRetriever: lower.includes('retriever') || lower.includes('labrador') || lower.includes('golden'),
    isShepherd: lower.includes('shepherd') || lower.includes('malinois') || lower.includes('collie'),
    isBrachy: lower.includes('pug') || lower.includes('bulldog') || lower.includes('shih tzu') || lower.includes('persian'),
    isLongHair: lower.includes('persian') || lower.includes('maine coon') || lower.includes('ragdoll') || lower.includes('longhair'),
    isToy: lower.includes('chihuahua') || lower.includes('pomeranian') || lower.includes('maltese') || lower.includes('toy') || lower.includes('yorkshire') || lower.includes('papillon'),
    isGiant: lower.includes('great dane') || lower.includes('mastiff') || lower.includes('saint bernard') || lower.includes('newfoundland') || lower.includes('great pyrenees'),
    isTerrier: lower.includes('terrier'),
    isSpitz: lower.includes('spitz') || lower.includes('husky') || lower.includes('malamute') || lower.includes('samoyed') || lower.includes('akita') || lower.includes('chow chow'),
    isSighthound: lower.includes('whippet') || lower.includes('greyhound') || lower.includes('borzoi'),
    isHound: lower.includes('hound') || lower.includes('beagle') || lower.includes('basset') || lower.includes('bloodhound') || lower.includes('dachshund'),
    isSporting: lower.includes('spaniel') || lower.includes('setter') || lower.includes('pointer') || lower.includes('vizsla') || lower.includes('weimaraner'),
    isWorking: lower.includes('cattle dog') || lower.includes('sheepdog') || lower.includes('malinois') || lower.includes('shepherd') || lower.includes('husky')
  };
};

const uniqueInsights = (items: BreedInsight[]) => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.title}-${item.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export type EvidenceBriefItem = {
  title: string;
  detail: string;
  badge: string;
  sources: SourceRef[];
};

export const buildBreedInsights = (pet: Pick<PetData, 'breed'> & { petType?: PetType | '' }): BreedInsight[] => {
  const breed = pet.breed || '';
  if (!breed.trim()) return [];
  const petType = inferPetType(breed, pet.petType);
  const insights: BreedInsight[] = [];
  const signals = buildBreedSignals(breed);

  if (signals.isIndie) {
    insights.push(
      {
        title: 'Street-smart stamina',
        detail: 'Prioritize shaded walks and limit peak heat exposure even for hardy breeds.',
        sources: getSources(['aspca_heat'])
      },
      {
        title: 'Tick patrol',
        detail: 'Check ears and paws after walks; early tick removal reduces infection risk.',
        sources: getSources(['capc_parasites'])
      }
    );
  }

  if (signals.isRetriever) {
    insights.push(
      {
        title: 'Joint protection',
        detail: 'Maintain steady weight and low-impact activity to reduce hip stress.',
        sources: exerciseSources(petType)
      },
      {
        title: 'Hydration focus',
        detail: 'Offer water before and after walks to reduce heat stress risk.',
        sources: getSources(['aspca_heat'])
      }
    );
  }

  if (signals.isShepherd) {
    insights.push(
      {
        title: 'Hip awareness',
        detail: 'Favor low-impact play and gradual conditioning to protect joints.',
        sources: exerciseSources(petType)
      }
    );
  }

  if (signals.isBrachy) {
    insights.push(
      {
        title: 'Breathing safety',
        detail: 'Short-nosed breeds need cooler, shorter walks with frequent breaks.',
        sources: getSources(['acvs_brachy', 'aspca_heat'])
      }
    );
  }

  if (signals.isLongHair) {
    insights.push(
      {
        title: 'Coat management',
        detail: 'Consistent grooming reduces mats and skin irritation.',
        sources: groomingSources(petType)
      }
    );
  }

  if (signals.isToy) {
    insights.push(
      {
        title: 'Gentle pacing',
        detail: 'Short play sessions prevent fatigue in small breeds.',
        sources: exerciseSources(petType)
      }
    );
  }

  if (signals.isGiant) {
    insights.push(
      {
        title: 'Joint protection',
        detail: 'Maintain steady weight and low-impact activity to protect joints.',
        sources: exerciseSources(petType)
      }
    );
  }

  if (signals.isTerrier) {
    insights.push(
      {
        title: 'High-drive enrichment',
        detail: 'Structured games and scent work reduce restlessness.',
        sources: exerciseSources(petType)
      }
    );
  }

  if (signals.isSpitz) {
    insights.push(
      {
        title: 'Heat-safe routine',
        detail: 'Double coats trap heat; prefer cooler walk windows.',
        sources: getSources(['aspca_heat'])
      }
    );
  }

  if (signals.isSighthound) {
    insights.push(
      {
        title: 'Lean body care',
        detail: 'Warm up before sprints and avoid overexertion.',
        sources: exerciseSources(petType)
      }
    );
  }

  if (signals.isHound) {
    insights.push(
      {
        title: 'Scent focus',
        detail: 'Sniff walks and puzzle feeders help channel natural drive.',
        sources: exerciseSources(petType)
      }
    );
  }

  if (signals.isSporting) {
    insights.push(
      {
        title: 'High-energy balance',
        detail: 'Daily mental + physical exercise keeps athletic breeds steady.',
        sources: exerciseSources(petType)
      }
    );
  }

  if (signals.isWorking) {
    insights.push(
      {
        title: 'Task-driven routine',
        detail: 'Structured training and jobs reduce boredom stress.',
        sources: exerciseSources(petType)
      }
    );
  }

  if (petType === 'Cat') {
    insights.push(
      {
        title: 'Hydration habit',
        detail: 'Refresh water often; hydration supports urinary and kidney health.',
        sources: hydrationSources(petType)
      }
    );
  }

  if (petType === 'Dog' && insights.length === 0) {
    insights.push(
      {
        title: 'Heat safety',
        detail: 'Avoid peak heat walks and use shaded routes when possible.',
        sources: getSources(['aspca_heat'])
      },
      {
        title: 'Exercise balance',
        detail: 'Mix mental games with physical play to avoid overexertion.',
        sources: exerciseSources(petType)
      }
    );
  }

  if (petType === 'Other' && insights.length === 0) {
    insights.push(
      {
        title: 'Heat management',
        detail: 'Provide shade and fresh water during warmer hours.',
        sources: getSources(['aspca_heat'])
      }
    );
  }

  const cleaned = uniqueInsights(insights);
  return cleaned.slice(0, 3);
};

export const buildEvidenceBrief = (pet: Pick<PetData, 'dietType' | 'activityLevel' | 'age' | 'city'> & { petType?: PetType | '' }): EvidenceBriefItem[] => {
  const petType = inferPetType(undefined, pet.petType);
  const candidates: Array<{ priority: number; item: EvidenceBriefItem }> = [];

  const add = (priority: number, item: EvidenceBriefItem) => {
    candidates.push({ priority, item });
  };

  if (pet.age === 'Senior') {
    add(1, {
      title: 'Senior comfort',
      detail: 'Short, frequent walks with warm rest zones support mobility.',
      badge: 'Senior care',
      sources: seniorSources(petType)
    });
  }

  if (pet.age === 'Young') {
    add(2, {
      title: 'Growth-friendly routine',
      detail: 'Short training bursts with rest reduce overstimulation.',
      badge: 'Growth',
      sources: exerciseSources(petType)
    });
  }

  if (pet.activityLevel === 'High') {
    add(2, {
      title: 'Activity balance',
      detail: 'Mix mental games with physical play to prevent overexertion.',
      badge: 'Activity',
      sources: exerciseSources(petType)
    });
  }

  if (pet.activityLevel === 'Low') {
    add(2, {
      title: 'Mobility boost',
      detail: 'Two short walks a day reduce stiffness and improve circulation.',
      badge: 'Activity',
      sources: exerciseSources(petType)
    });
  }

  if (pet.dietType === 'Home Cooked') {
    add(1, {
      title: 'Home-cooked safety',
      detail: 'Avoid onion, garlic, grapes, chocolate, and xylitol.',
      badge: 'Nutrition',
      sources: getSources(['aspca_foods', 'wsava_nutrition'])
    });
  } else {
    add(3, {
      title: 'Nutrition safety',
      detail: 'Avoid common toxic foods like onion, garlic, grapes, and chocolate.',
      badge: 'Nutrition',
      sources: getSources(['aspca_foods'])
    });
  }

  if (petType === 'Cat') {
    add(2, {
      title: 'Hydration check',
      detail: 'Refresh water often; hydration supports urinary health.',
      badge: 'Hydration',
      sources: hydrationSources(petType)
    });
  }

  if (petType === 'Dog') {
    add(3, {
      title: 'Heat safety check',
      detail: 'Avoid peak heat walks and use shaded routes when possible.',
      badge: 'Safety',
      sources: getSources(['aspca_heat'])
    });
  }

  if (pet.city) {
    add(2, {
      title: 'City heat planning',
      detail: `Plan exercise around ${pet.city}'s cooler hours to reduce heat stress.`,
      badge: 'Local',
      sources: getSources(['aspca_heat'])
    });
  }

  if (petType === 'Other') {
    add(3, {
      title: 'General safety check',
      detail: 'Reduce heat exposure and keep hydration consistent.',
      badge: 'Safety',
      sources: getSources(['aspca_heat'])
    });
  }

  const unique = new Map<string, EvidenceBriefItem>();
  candidates
    .sort((a, b) => a.priority - b.priority)
    .forEach(candidate => {
      if (!unique.has(candidate.item.title)) {
        unique.set(candidate.item.title, candidate.item);
      }
    });

  const selected = Array.from(unique.values()).slice(0, 3);
  while (selected.length < 3) {
    selected.push({
      title: 'Heat safety check',
      detail: 'Avoid peak heat walks and use shaded routes when possible.',
      badge: 'Safety',
      sources: getSources(['aspca_heat'])
    });
  }
  return selected.slice(0, 3);
};

export const buildCheckupFocus = (pet: Pick<PetData, 'dietType' | 'activityLevel' | 'age' | 'city' | 'breed'> & { petType?: PetType | '' }): FocusSignal[] => {
  const petType = inferPetType(pet.breed, pet.petType);
  const candidates: Array<{ priority: number; signal: FocusSignal }> = [];
  const add = (priority: number, signal: FocusSignal) => {
    candidates.push({ priority, signal });
  };
  const breedSignals = pet.breed ? buildBreedSignals(pet.breed) : null;

  if (breedSignals?.isBrachy) {
    add(1, {
      label: 'Brachy heat safety',
      detail: 'Short, cooler walks with breathing breaks.',
      sources: getSources(['acvs_brachy', 'aspca_heat'])
    });
  }
  if (breedSignals?.isGiant) {
    add(2, {
      label: 'Joint protection',
      detail: 'Low-impact activity protects large joints.',
      sources: exerciseSources(petType)
    });
  }
  if (breedSignals?.isTerrier) {
    add(2, {
      label: 'High-drive focus',
      detail: 'Add scent games and short training bursts.',
      sources: exerciseSources(petType)
    });
  }
  if (breedSignals?.isLongHair) {
    add(3, {
      label: 'Coat care',
      detail: 'Regular brushing prevents mats and skin irritation.',
      sources: groomingSources(petType)
    });
  }
  if (breedSignals?.isIndie) {
    add(3, {
      label: 'Parasite checks',
      detail: 'Check ears and paws after outdoor walks.',
      sources: getSources(['capc_parasites'])
    });
  }

  if (pet.age === 'Senior') {
    add(1, {
      label: 'Senior age',
      detail: 'Mobility support and shorter walks.',
      sources: seniorSources(petType)
    });
  }
  if (pet.age === 'Young') {
    add(2, {
      label: 'Young growth',
      detail: 'Short training bursts and rest.',
      sources: exerciseSources(petType)
    });
  }
  if (pet.activityLevel === 'High') {
    add(2, {
      label: 'High activity',
      detail: 'Balance physical and mental play.',
      sources: exerciseSources(petType)
    });
  }
  if (pet.activityLevel === 'Low') {
    add(2, {
      label: 'Low activity',
      detail: 'Short walks to reduce stiffness.',
      sources: exerciseSources(petType)
    });
  }
  if (pet.dietType === 'Home Cooked') {
    add(1, {
      label: 'Home-cooked diet',
      detail: 'Avoid toxic ingredients in kitchen leftovers.',
      sources: getSources(['aspca_foods'])
    });
  }
  if (petType === 'Cat') {
    add(2, {
      label: 'Cat hydration',
      detail: 'Frequent fresh water reduces urinary strain.',
      sources: hydrationSources(petType)
    });
  }
  if (petType === 'Dog') {
    add(2, {
      label: 'Heat safety',
      detail: 'Plan walks in cooler windows.',
      sources: getSources(['aspca_heat'])
    });
  }
  if (petType === 'Other') {
    add(3, {
      label: 'General safety',
      detail: 'Heat and hydration checks are essential.',
      sources: getSources(['aspca_heat'])
    });
  }
  if (pet.city) {
    add(3, {
      label: 'Local heat window',
      detail: `Plan outdoor time around ${pet.city}'s cooler hours.`,
      sources: getSources(['aspca_heat'])
    });
  }

  const unique = new Map<string, FocusSignal>();
  candidates
    .sort((a, b) => a.priority - b.priority)
    .forEach(candidate => {
      if (!unique.has(candidate.signal.label)) {
        unique.set(candidate.signal.label, candidate.signal);
      }
    });
  return Array.from(unique.values()).slice(0, 3);
};

export type CheckupProfile = {
  petType?: PetType | '';
  breed: string;
  age: 'Young' | 'Adult' | 'Senior';
  activityLevel: 'Low' | 'Moderate' | 'High';
  dietType: 'Home Cooked' | 'Kibble' | 'Mixed';
  city: string;
  outdoorExposure: 'Daily' | 'Weekly' | 'Rare';
  appetite: 'Normal' | 'Lower' | 'None';
  waterIntake: 'Normal' | 'Lower' | 'Higher';
  energy: 'Normal' | 'Lower' | 'Restless';
  stool: 'Normal' | 'Loose' | 'Vomiting' | 'Straining';
  housingType: 'Apartment' | 'House' | 'Farm';
  walkSurface: 'Mixed' | 'Grass' | 'Asphalt';
  conditionsFlag: 'No' | 'Yes';
  conditionsText: string;
};

export const buildCheckupAssessment = (profile: CheckupProfile): CheckupAssessment => {
  const petType = inferPetType(profile.breed, profile.petType);
  const signals = buildBreedSignals(profile.breed || '');
  let score = 0;

  if (profile.appetite === 'Lower') score += 1;
  if (profile.appetite === 'None') score += 3;
  if (profile.waterIntake === 'Lower') score += 1;
  if (profile.waterIntake === 'Higher') score += 1;
  if (profile.energy === 'Lower') score += 1;
  if (profile.energy === 'Restless') score += 1;
  if (profile.stool === 'Loose') score += 2;
  if (profile.stool === 'Vomiting') score += 3;
  if (profile.stool === 'Straining') score += 3;
  if (profile.conditionsFlag === 'Yes') score += 1;
  if (profile.age === 'Senior') score += 1;
  if (signals.isBrachy) score += 1;

  const statusTone = score >= 4 ? 'care' : score >= 2 ? 'watch' : 'steady';
  const statusLabel =
    statusTone === 'care'
      ? 'Needs closer care'
      : statusTone === 'watch'
      ? 'Monitor closely'
      : 'Stable baseline';

  const summary =
    statusTone === 'care'
      ? 'Multiple changes were noted. Monitor closely and contact a vet if symptoms persist or worsen.'
      : statusTone === 'watch'
      ? 'Some changes were noted. Track trends for 48–72 hours and adjust routines.'
      : 'No immediate red flags based on your inputs. Keep routine steady and observe.';

  const watchlist = uniqueList([
    profile.appetite !== 'Normal' ? 'Appetite at each meal' : 'Appetite consistency',
    profile.waterIntake !== 'Normal' ? 'Water intake + urination' : 'Water intake',
    profile.energy !== 'Normal' ? 'Energy and play interest' : 'Energy level',
    profile.stool !== 'Normal' ? 'Stool/urine changes' : 'Stool consistency',
    signals.isBrachy ? 'Breathing effort during walks' : '',
    profile.age === 'Senior' ? 'Stiffness after rest' : ''
  ]).slice(0, 6);

  const careChecklist = uniqueList([
    profile.activityLevel === 'Low' ? 'Two short walks + light play today' : 'Keep activity balanced',
    profile.outdoorExposure === 'Daily' ? 'Check paws + coat after walks' : 'Plan one safe outdoor session',
    profile.walkSurface === 'Asphalt' ? 'Avoid hot surfaces, test with hand' : '',
    profile.dietType === 'Home Cooked' ? 'Avoid onion, garlic, grapes, chocolate' : '',
    profile.energy === 'Restless' ? 'Add 10 minutes of scent games' : '',
    profile.energy === 'Lower' ? 'Offer calm rest + hydration' : '',
    profile.age === 'Senior' ? 'Warm bedding + gentle stretches' : '',
    signals.isBrachy ? 'Keep walks short and shaded' : '',
    profile.housingType === 'Apartment' ? 'Add indoor enrichment (sniff mat, puzzles)' : ''
  ]).slice(0, 5);

  const conditionLabel = profile.conditionsFlag === 'Yes' && profile.conditionsText.trim()
    ? profile.conditionsText.trim()
    : profile.conditionsFlag === 'Yes'
    ? 'Conditions reported'
    : 'None reported';

  const vetBrief = [
    `${petType} ${profile.breed || 'pet'}, ${profile.age}.`,
    `Activity: ${profile.activityLevel}. Diet: ${profile.dietType}.`,
    `Outdoor: ${profile.outdoorExposure}. Surface: ${profile.walkSurface}.`,
    `Recent changes: appetite ${profile.appetite}, water ${profile.waterIntake}, energy ${profile.energy}, stool/urine ${profile.stool}.`,
    `Conditions/meds: ${conditionLabel}.`
  ].join(' ');

  return { statusLabel, statusTone, summary, watchlist, careChecklist, vetBrief };
};
