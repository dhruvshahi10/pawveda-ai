import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildBreedInsights, buildCheckupAssessment, buildCheckupFocus, buildEvidenceBrief, inferPetType } from '../lib/checkupInsights';
import { CAT_BREEDS, DOG_BREEDS, INDIAN_CITIES, OTHER_BREEDS, PET_TYPES, PetType } from '../lib/petOptions';
import { AiCheckupResponse, PetData, Reminder, UserState } from '../types';
import { trackEvent } from '../lib/usageAnalytics';
import { runAiCheckup } from '../services/geminiService';

type CheckupInputs = {
  name: string;
  city: string;
  petType: PetType | '';
  breed: string;
  age: 'Young' | 'Adult' | 'Senior';
  activityLevel: 'Low' | 'Moderate' | 'High';
  dietType: 'Home Cooked' | 'Kibble' | 'Mixed';
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

const DEFAULT_INPUTS: CheckupInputs = {
  name: '',
  city: '',
  petType: '',
  breed: '',
  age: 'Adult',
  activityLevel: 'Moderate',
  dietType: 'Home Cooked',
  outdoorExposure: 'Daily',
  appetite: 'Normal',
  waterIntake: 'Normal',
  energy: 'Normal',
  stool: 'Normal',
  housingType: 'Apartment',
  walkSurface: 'Mixed',
  conditionsFlag: 'No',
  conditionsText: ''
};

const MAX_SUGGESTIONS = 10;

const normalizeQuery = (value: string) => value.trim().toLowerCase();
const filterTextMatches = (list: string[], query: string, limit = MAX_SUGGESTIONS) => {
  const normalized = normalizeQuery(query);
  const filtered = normalized ? list.filter(item => item.toLowerCase().includes(normalized)) : list;
  return filtered.slice(0, limit);
};

const toPetData = (inputs: CheckupInputs): PetData => ({
  name: inputs.name || 'Your pet',
  breed: inputs.breed,
  age: inputs.age,
  ageMonths: '',
  weight: '15',
  dietType: inputs.dietType,
  gender: 'Male',
  activityLevel: inputs.activityLevel,
  city: inputs.city,
  allergies: [],
  interests: [],
  spayNeuterStatus: 'Unknown',
  vaccinationStatus: 'Not sure',
  lastVaccineDate: '',
  lastVetVisitDate: '',
  activityBaseline: '30-60 min',
  housingType: inputs.housingType === 'House' ? 'Independent House' : inputs.housingType === 'Farm' ? 'Farm / Villa' : 'Apartment',
  walkSurface: inputs.walkSurface === 'Asphalt' ? 'Asphalt' : inputs.walkSurface === 'Grass' ? 'Grass' : 'Mixed',
  parkAccess: 'Yes',
  feedingSchedule: 'Twice',
  foodBrand: '',
  conditions: inputs.conditionsFlag === 'Yes' && inputs.conditionsText.trim() ? [inputs.conditionsText.trim()] : [],
  medications: [],
  primaryVetName: '',
  primaryVetPhone: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  goals: [],
  vetAccess: 'Regular Vet'
});

const FreeHealthCheckup: React.FC<{ user: UserState }> = ({ user }) => {
  const navigate = useNavigate();
  const [inputs, setInputs] = useState<CheckupInputs>(DEFAULT_INPUTS);
  const [view, setView] = useState<'form' | 'results'>(user.pet ? 'results' : 'form');
  const hasTrackedResults = React.useRef(false);
  const [aiResponse, setAiResponse] = useState<AiCheckupResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [cityOpen, setCityOpen] = useState(false);
  const [breedOpen, setBreedOpen] = useState(false);
  const inferredPetType = inferPetType(inputs.breed, inputs.petType);
  const displayPetType = inputs.petType || (inputs.breed ? inferredPetType : '');

  useEffect(() => {
    if (!user.pet) return;
    setInputs({
      name: user.pet.name || '',
      city: user.pet.city || '',
      petType: user.pet.breed ? inferPetType(user.pet.breed, '') : '',
      breed: user.pet.breed || '',
      age: user.pet.age || 'Adult',
      activityLevel: user.pet.activityLevel || 'Moderate',
      dietType: user.pet.dietType || 'Home Cooked',
      outdoorExposure: 'Daily',
      appetite: 'Normal',
      waterIntake: 'Normal',
      energy: 'Normal',
      stool: 'Normal',
      housingType: 'Apartment',
      walkSurface: 'Mixed',
      conditionsFlag: 'No',
      conditionsText: ''
    });
    setView('results');
  }, [user.pet]);

  useEffect(() => {
    if (view !== 'results' || hasTrackedResults.current) return;
    trackEvent('checkup_results_view', {
      city: inputs.city,
      petType: displayPetType || inferredPetType,
      breed: inputs.breed,
      age: inputs.age
    });
    hasTrackedResults.current = true;
  }, [view, inputs.city, inputs.breed, inputs.age, displayPetType, inferredPetType]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    trackEvent('checkup_submit', {
      city: inputs.city,
      petType: displayPetType || inferredPetType,
      breed: inputs.breed,
      age: inputs.age,
      activityLevel: inputs.activityLevel,
      dietType: inputs.dietType,
      outdoorExposure: inputs.outdoorExposure,
      appetite: inputs.appetite,
      waterIntake: inputs.waterIntake,
      energy: inputs.energy,
      stool: inputs.stool
    });
    setActionNotice('');
    setAiError('');
    setView('results');
    if (!isLoggedIn) {
      setAiResponse(null);
      return;
    }
    setAiLoading(true);
    try {
      const response = await runAiCheckup({
        petId: user.pet?.id || null,
        petType: inferredPetType,
        breed: inputs.breed,
        age: inputs.age,
        activityLevel: inputs.activityLevel,
        dietType: inputs.dietType,
        city: inputs.city,
        outdoorExposure: inputs.outdoorExposure,
        appetite: inputs.appetite,
        waterIntake: inputs.waterIntake,
        energy: inputs.energy,
        stool: inputs.stool,
        housingType: inputs.housingType,
        walkSurface: inputs.walkSurface,
        conditionsFlag: inputs.conditionsFlag,
        conditionsText: inputs.conditionsText
      });
      setAiResponse(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI checkup failed.';
      setAiError(message || 'AI checkup failed.');
      setAiResponse(null);
    } finally {
      setAiLoading(false);
    }
  };

  const petData = useMemo(() => toPetData(inputs), [inputs]);
  const petContext = useMemo(() => ({ ...petData, petType: inferredPetType }), [petData, inferredPetType]);
  const insights = useMemo(() => buildBreedInsights(petContext), [petContext]);
  const focusSignals = useMemo(() => buildCheckupFocus(petContext), [petContext]);
  const evidenceBrief = useMemo(() => buildEvidenceBrief(petContext), [petContext]);
  const assessment = useMemo(() => buildCheckupAssessment({
    petType: inferredPetType,
    breed: inputs.breed,
    age: inputs.age,
    activityLevel: inputs.activityLevel,
    dietType: inputs.dietType,
    city: inputs.city,
    outdoorExposure: inputs.outdoorExposure,
    appetite: inputs.appetite,
    waterIntake: inputs.waterIntake,
    energy: inputs.energy,
    stool: inputs.stool,
    housingType: inputs.housingType,
    walkSurface: inputs.walkSurface,
    conditionsFlag: inputs.conditionsFlag,
    conditionsText: inputs.conditionsText
  }), [inputs, inferredPetType]);
  const cityMatches = useMemo(() => filterTextMatches(INDIAN_CITIES, inputs.city), [inputs.city]);
  const breedFilterType = displayPetType || '';
  const breedOptions = useMemo(() => {
    if (breedFilterType === 'Dog') return DOG_BREEDS;
    if (breedFilterType === 'Cat') return CAT_BREEDS;
    if (breedFilterType === 'Other') return OTHER_BREEDS;
    return [...DOG_BREEDS, ...CAT_BREEDS, ...OTHER_BREEDS];
  }, [breedFilterType]);
  const breedMatches = useMemo(() => filterTextMatches(breedOptions, inputs.breed), [breedOptions, inputs.breed]);
  const isLoggedIn = user.isLoggedIn;
  const showProfileFields = !isLoggedIn || !user.pet;
  const aiSignals = aiResponse?.focusSignals ?? [];
  const activeSignals = aiSignals.length ? aiSignals : focusSignals;
  const activeWatchlist = aiResponse?.watchlist?.length ? aiResponse.watchlist : assessment.watchlist;
  const activeChecklist = aiResponse?.careChecklist?.length ? aiResponse.careChecklist : assessment.careChecklist;
  const activeSummary = aiResponse?.summary || assessment.summary;
  const activeVetBrief = aiResponse?.vetBrief || assessment.vetBrief;
  const activeSources = aiResponse?.sources?.length ? aiResponse.sources : null;
  const riskTone = aiResponse?.riskLevel || assessment.statusTone;
  const riskLabel =
    riskTone === 'care'
      ? 'Needs closer care'
      : riskTone === 'watch'
      ? 'Monitor closely'
      : 'Stable baseline';

  const steps = [
    { title: 'Pet Profile', subtitle: 'Who are we checking?' },
    { title: 'Lifestyle Context', subtitle: 'Environment + routine' },
    { title: 'Recent Changes', subtitle: 'Last 72 hours' }
  ];

  const nextStep = () => {
    if (stepIndex === 0 && !inputs.city.trim()) {
      setActionNotice('Please add your city before continuing.');
      return;
    }
    setActionNotice('');
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => {
    setActionNotice('');
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const getCustomChecklistStorageKey = (pet?: PetData) =>
    `pawveda_custom_checklist_${pet?.id || pet?.name || 'guest'}_${pet?.city || 'city'}`;

  const getReminderStorageKey = (pet?: PetData) =>
    `pawveda_reminders_${pet?.name || 'guest'}_${pet?.city || 'city'}`;

  const saveChecklistFromCheckup = (items: string[]) => {
    if (!user.pet || items.length === 0) return;
    try {
      const key = getCustomChecklistStorageKey(user.pet);
      const existing = localStorage.getItem(key);
      const parsed = existing ? JSON.parse(existing) : [];
      const next = Array.isArray(parsed) ? parsed : [];
      const timestamp = Date.now();
      items.forEach((item, index) => {
        next.push({ id: `checkup-${timestamp}-${index}`, label: item, frequency: 'daily' });
      });
      localStorage.setItem(key, JSON.stringify(next));
      setActionNotice('Checklist updated. See Dashboard → Daily Checklist.');
    } catch {
      setActionNotice('Unable to update checklist right now.');
    }
  };

  const saveRemindersFromCheckup = (items: string[]) => {
    if (!user.pet || items.length === 0) return;
    try {
      const key = getReminderStorageKey(user.pet);
      const existing = localStorage.getItem(key);
      const parsed = existing ? JSON.parse(existing) : [];
      const next: Reminder[] = Array.isArray(parsed) ? parsed : [];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const timestamp = Date.now();
      items.forEach((item, index) => {
        next.push({ id: `checkup-${timestamp}-${index}`, title: item, date: tomorrow, repeat: 'None', notes: 'From AI checkup' });
      });
      localStorage.setItem(key, JSON.stringify(next));
      setActionNotice('Reminders added. See Dashboard → Reminders.');
    } catch {
      setActionNotice('Unable to save reminders right now.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-5xl bg-white rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(82,49,23,0.15)] border border-brand-50 overflow-hidden">
        <div className="px-8 py-10 sm:px-12 sm:py-14 space-y-10">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500">Free Pet Health Checkup</p>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-900">Get a quick safety snapshot.</h1>
            <p className="text-brand-800/60 text-base sm:text-lg font-medium">
              Guidance based on your inputs and local conditions. This is not a diagnosis.
            </p>
          </div>

          {view === 'form' && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="bg-white border border-brand-100 rounded-[2.5rem] p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between motion-section">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-brand-400">Step {stepIndex + 1} of {steps.length}</p>
                  <h2 className="text-2xl font-display font-black text-brand-900">{steps[stepIndex].title}</h2>
                  <p className="text-sm text-brand-800/70">{steps[stepIndex].subtitle}</p>
                </div>
                <div className="w-full sm:w-48">
                  <div className="h-2 rounded-full bg-brand-100 overflow-hidden motion-progress">
                    <div
                      className="h-full bg-brand-900"
                      style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {!showProfileFields && stepIndex === 0 && (
                <div className="bg-brand-50/70 border border-brand-100 rounded-[2.5rem] p-6 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Pet Profile</p>
                  <p className="text-lg font-display font-black text-brand-900">
                    {inputs.name || user.pet?.name || 'Your pet'} · {inputs.breed || user.pet?.breed || 'Breed'}
                  </p>
                  <p className="text-sm text-brand-800/70">
                    {inputs.city || user.pet?.city || 'City'} · {inputs.age} · {inputs.activityLevel} activity · {inputs.dietType}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                  >
                    Edit profile
                  </button>
                </div>
              )}

              {showProfileFields && stepIndex === 0 && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Pet Name (Optional)</label>
                      <input
                        type="text"
                        value={inputs.name}
                        onChange={(event) => setInputs(prev => ({ ...prev, name: event.target.value }))}
                        placeholder="e.g., Bruno"
                        className="w-full bg-brand-50 border-none rounded-[2rem] px-6 py-4 text-sm font-bold text-brand-900 focus:ring-4 focus:ring-brand-500/10 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">City</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={inputs.city}
                          onChange={(event) => {
                            setInputs(prev => ({ ...prev, city: event.target.value }));
                            setCityOpen(true);
                          }}
                          onFocus={() => {
                            setCityOpen(true);
                            setBreedOpen(false);
                          }}
                          onBlur={() => window.setTimeout(() => setCityOpen(false), 120)}
                          placeholder="Start typing your city"
                          autoComplete="off"
                          className="w-full bg-brand-50 border-none rounded-[2rem] px-6 py-4 text-sm font-bold text-brand-900 focus:ring-4 focus:ring-brand-500/10 outline-none"
                        />
                        <span className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-brand-500/70">▾</span>
                        {cityOpen && (
                          <div className="absolute z-20 mt-3 w-full rounded-[1.75rem] border border-brand-100 bg-white shadow-xl overflow-hidden">
                            <ul className="max-h-56 overflow-auto py-2">
                              {cityMatches.length > 0 ? (
                                cityMatches.map(city => (
                                  <li key={city}>
                                    <button
                                      type="button"
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        setInputs(prev => ({ ...prev, city }));
                                        setCityOpen(false);
                                      }}
                                      className="w-full text-left px-6 py-3 text-sm font-bold text-brand-900 hover:bg-brand-50"
                                    >
                                      {city}
                                    </button>
                                  </li>
                                ))
                              ) : (
                                <li className="px-6 py-3 text-xs font-bold text-brand-400">No matches found.</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Pet Type</label>
                      <div className="grid grid-cols-3 gap-3">
                        {PET_TYPES.map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, petType: type, breed: '' }))}
                            className={`py-4 rounded-2xl border text-xs font-black uppercase tracking-widest ${
                              inputs.petType === type
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Breed / Lineage</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={inputs.breed}
                          onChange={(event) => {
                            setInputs(prev => ({ ...prev, breed: event.target.value }));
                            setBreedOpen(true);
                          }}
                          onFocus={() => {
                            setBreedOpen(true);
                            setCityOpen(false);
                          }}
                          onBlur={() => window.setTimeout(() => setBreedOpen(false), 120)}
                          placeholder={breedFilterType ? `Search ${breedFilterType.toLowerCase()} breed` : 'Search breed'}
                          autoComplete="off"
                          className="w-full bg-brand-50 border-none rounded-[2rem] px-6 py-4 text-sm font-bold text-brand-900 focus:ring-4 focus:ring-brand-500/10 outline-none"
                        />
                        <span className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-brand-500/70">▾</span>
                        {breedOpen && (
                          <div className="absolute z-20 mt-3 w-full rounded-[1.75rem] border border-brand-100 bg-white shadow-xl overflow-hidden">
                            <ul className="max-h-56 overflow-auto py-2">
                              {breedMatches.length > 0 ? (
                                breedMatches.map(option => (
                                  <li key={option}>
                                    <button
                                      type="button"
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        const inferred = inferPetType(option, '');
                                        setInputs(prev => ({ ...prev, breed: option, petType: inferred }));
                                        setBreedOpen(false);
                                      }}
                                      className="w-full text-left px-6 py-3 text-sm font-bold text-brand-900 hover:bg-brand-50"
                                    >
                                      {option}
                                    </button>
                                  </li>
                                ))
                              ) : (
                                <li className="px-6 py-3 text-xs font-bold text-brand-400">No matches found.</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Life Stage</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Young', 'Adult', 'Senior'] as const).map(stage => (
                          <button
                            key={stage}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, age: stage }))}
                            className={`py-4 rounded-2xl border text-xs font-black uppercase tracking-widest ${
                              inputs.age === stage
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {stage}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Activity Level</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Low', 'Moderate', 'High'] as const).map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, activityLevel: level }))}
                            className={`py-4 rounded-2xl border text-xs font-black uppercase tracking-widest ${
                              inputs.activityLevel === level
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Diet Type</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Home Cooked', 'Kibble', 'Mixed'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, dietType: type }))}
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                              inputs.dietType === type
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {stepIndex === 1 && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-brand-400 pt-2">Lifestyle context</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Outdoor Exposure</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Daily', 'Weekly', 'Rare'] as const).map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, outdoorExposure: level }))}
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                              inputs.outdoorExposure === level
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Housing Type</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Apartment', 'House', 'Farm'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, housingType: type }))}
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                              inputs.housingType === type
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Walk Surface</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Mixed', 'Grass', 'Asphalt'] as const).map(surface => (
                          <button
                            key={surface}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, walkSurface: surface }))}
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                              inputs.walkSurface === surface
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {surface}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {stepIndex === 2 && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-brand-400 pt-2">Recent changes (72h)</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Recent Appetite</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Normal', 'Lower', 'None'] as const).map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, appetite: level }))}
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                              inputs.appetite === level
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Water Intake</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Normal', 'Lower', 'Higher'] as const).map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, waterIntake: level }))}
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                              inputs.waterIntake === level
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Energy Level</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Normal', 'Lower', 'Restless'] as const).map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, energy: level }))}
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                              inputs.energy === level
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Stool / Urine</label>
                      <div className="grid grid-cols-4 gap-3">
                        {(['Normal', 'Loose', 'Vomiting', 'Straining'] as const).map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, stool: level }))}
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                              inputs.stool === level
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Known Conditions / Meds</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['No', 'Yes'] as const).map(level => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setInputs(prev => ({ ...prev, conditionsFlag: level }))}
                            className={`py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                              inputs.conditionsFlag === level
                                ? 'bg-brand-900 text-white border-brand-900'
                                : 'bg-white text-brand-900 border-brand-100 hover:border-brand-500'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                      {inputs.conditionsFlag === 'Yes' && (
                        <input
                          type="text"
                          value={inputs.conditionsText}
                          onChange={(event) => setInputs(prev => ({ ...prev, conditionsText: event.target.value }))}
                          placeholder="e.g., skin allergy, thyroid meds"
                          className="w-full bg-brand-50 border-none rounded-[2rem] px-5 py-3 text-xs font-bold text-brand-900 focus:ring-4 focus:ring-brand-500/10 outline-none"
                        />
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between gap-4 pt-4">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={stepIndex === 0}
                  className="px-5 py-3 rounded-full border border-brand-200 text-[10px] font-black uppercase tracking-widest text-brand-700 disabled:opacity-30"
                >
                  Back
                </button>
                {stepIndex < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-3 rounded-full bg-brand-900 text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputs.city.trim()}
                    className="px-8 py-3 rounded-full bg-brand-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                  >
                    Run Free Checkup
                  </button>
                )}
              </div>

              {actionNotice && (
                <p className="text-[10px] text-brand-600 font-semibold">{actionNotice}</p>
              )}
            </form>
          )}

          {view === 'results' && (
            <div className="space-y-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-400">Checkup Snapshot</p>
                  <h2 className="text-3xl font-display font-black text-brand-900">
                    {inputs.name ? `${inputs.name}'s` : "Your pet's"} safety status
                  </h2>
                  <p className="text-brand-800/60 text-sm font-medium">
                    {[inputs.city, displayPetType, inputs.breed, inputs.age, `${inputs.activityLevel} activity`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="text-[11px] text-brand-800/60 font-medium italic">Guidance only. Not a diagnosis.</p>
                </div>
                <button
                  onClick={() => {
                    setAiResponse(null);
                    setAiError('');
                    setActionNotice('');
                    setStepIndex(0);
                    setView('form');
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                >
                  Edit inputs
                </button>
              </div>

              {aiLoading && (
                <div className="bg-brand-50/70 border border-brand-100 rounded-[2rem] p-4 text-sm font-semibold text-brand-700">
                  Generating your AI checkup…
                </div>
              )}

              {aiError && (
                <div className="bg-white border border-brand-100 rounded-[2rem] p-4 text-sm font-semibold text-brand-700">
                  {aiError} Showing the standard checkup view instead.
                </div>
              )}

              {aiResponse?.usage && (
                <div className="bg-white border border-brand-100 rounded-[2rem] p-4 text-[11px] font-semibold text-brand-700">
                  AI checkups remaining: {aiResponse.usage.remaining}/{aiResponse.usage.limit} · resets {new Date(aiResponse.usage.resetAt).toLocaleDateString('en-IN')}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-3">
                <div className="bg-brand-50/70 border border-brand-100 rounded-[2.5rem] p-6 space-y-3 motion-section">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Snapshot</p>
                  <p className="text-2xl font-display font-black text-brand-900">{riskLabel}</p>
                  <p className="text-sm text-brand-800/70 font-medium">{activeSummary}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      riskTone === 'care'
                        ? 'bg-brand-900 text-white'
                        : riskTone === 'watch'
                        ? 'bg-brand-200 text-brand-900'
                        : 'bg-white text-brand-900 border border-brand-100'
                    }`}>
                      {riskTone === 'care' ? 'Care Focus' : riskTone === 'watch' ? 'Watch Closely' : 'Stable'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white text-brand-500 border border-brand-100">
                      Not a diagnosis
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-brand-100 rounded-[2.5rem] p-6 space-y-3 motion-section" style={{ ['--delay' as string]: '120ms' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Personalized Focus</p>
                  {activeSignals.map(item => (
                    <div key={item.label} className="bg-brand-50/60 rounded-2xl p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">{item.label}</p>
                      <p className="text-sm font-display font-black text-brand-900">{item.detail}</p>
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

                <div className="bg-white border border-brand-100 rounded-[2.5rem] p-6 space-y-4 motion-section" style={{ ['--delay' as string]: '220ms' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Watchlist (72h)</p>
                  <ul className="space-y-3">
                    {activeWatchlist.map(item => (
                      <li key={item} className="flex items-start gap-3 text-sm text-brand-800/70">
                        <span className="mt-1 w-2 h-2 rounded-full bg-brand-500/60" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="bg-white border border-brand-100 rounded-[2.5rem] p-6 space-y-4 motion-section">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Care Checklist (Today)</p>
                  <ul className="space-y-3">
                    {activeChecklist.map(item => (
                      <li key={item} className="flex items-start gap-3 text-sm text-brand-800/70">
                        <span className="w-5 h-5 rounded-full border border-brand-200 flex items-center justify-center text-[10px] font-black text-brand-500">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {isLoggedIn ? (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => saveChecklistFromCheckup(activeChecklist)}
                        className="bg-brand-900 text-white py-2 rounded-full text-[9px] font-black uppercase tracking-widest"
                      >
                        Add to checklist
                      </button>
                      <button
                        type="button"
                        onClick={() => saveRemindersFromCheckup(activeWatchlist)}
                        className="border border-brand-200 text-brand-700 py-2 rounded-full text-[9px] font-black uppercase tracking-widest"
                      >
                        Create reminders
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-brand-800/60 font-medium pt-2">
                      Sign up to save checklist items and reminders.
                    </p>
                  )}
                  {actionNotice && (
                    <p className="text-[10px] text-brand-600 font-semibold pt-2">{actionNotice}</p>
                  )}
                </div>

                <div className="bg-white border border-brand-100 rounded-[2.5rem] p-6 space-y-4 motion-section" style={{ ['--delay' as string]: '120ms' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Vet-Ready Brief</p>
                  <p className="text-sm text-brand-800/70 italic">"{activeVetBrief}"</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (isLoggedIn) {
                        trackEvent('checkup_cta_dashboard', { city: inputs.city, breed: inputs.breed });
                        navigate('/dashboard');
                      } else {
                        trackEvent('checkup_cta_signup', { city: inputs.city, breed: inputs.breed });
                        navigate('/auth?mode=signup');
                      }
                    }}
                    className="w-full bg-brand-900 text-white py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-colors"
                  >
                    {isLoggedIn ? 'Open full brief' : 'Unlock full brief'}
                  </button>
                </div>

                <div className="bg-white border border-brand-100 rounded-[2.5rem] p-6 space-y-4 motion-section" style={{ ['--delay' as string]: '220ms' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Evidence Panel</p>
                  {activeSources ? (
                    <div className="grid gap-3">
                      {activeSources.map(source => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          className="bg-brand-50/60 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                        >
                          {source.label}
                        </a>
                      ))}
                    </div>
                  ) : (
                    evidenceBrief.map(item => (
                      <div key={item.title} className="bg-brand-50/60 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">{item.badge}</p>
                        <p className="text-sm font-display font-black text-brand-900">{item.title}</p>
                        <p className="text-xs text-brand-800/70 italic">"{item.detail}"</p>
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
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white border border-brand-100 rounded-[2.5rem] p-6 space-y-4 motion-section">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Breed Intelligence</p>
                  {!inputs.breed.trim() ? (
                    <button
                      type="button"
                      onClick={() => setView('form')}
                      className="text-[10px] font-black uppercase tracking-widest text-brand-500 underline underline-offset-4"
                    >
                      Add breed
                    </button>
                  ) : null}
                </div>
                {inputs.breed.trim() ? (
                  insights.length ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {insights.map(item => (
                        <div key={item.title} className="bg-brand-50/60 rounded-2xl p-4">
                          <p className="text-sm font-display font-black text-brand-900">{item.title}</p>
                          <p className="text-xs text-brand-800/70">{item.detail}</p>
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
                  ) : (
                    <p className="text-sm text-brand-800/60 font-medium">
                      We are still expanding source-backed guidance for {inputs.breed}. Try another lineage for now.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-brand-800/60 font-medium">
                    Add a breed or lineage to unlock breed-specific guidance backed by published sources.
                  </p>
                )}
              </div>

              <div className="bg-brand-900 text-white rounded-[2.5rem] p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Next Steps</p>
                  <p className="text-lg font-display font-black">
                    Save this checkup to unlock alerts, history, and vet-ready briefs.
                  </p>
                </div>
                {isLoggedIn ? (
                  <button
                    onClick={() => {
                      trackEvent('checkup_cta_dashboard', { city: inputs.city, breed: inputs.breed });
                      navigate('/dashboard');
                    }}
                    className="bg-white text-brand-900 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      trackEvent('checkup_cta_signup', { city: inputs.city, breed: inputs.breed });
                      navigate('/auth?mode=signup');
                    }}
                    className="bg-white text-brand-900 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest"
                  >
                    Create Account
                  </button>
                )}
              </div>

              {!isLoggedIn && (
                <p className="text-[11px] text-brand-800/60 font-medium italic">
                  You can run the checkup for free. Create an account to save your pet profile and receive ongoing alerts.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-brand-50/60 px-8 py-6 sm:px-12 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-brand-400">
          <span>Guidance only. Not a diagnosis.</span>
          <Link to="/" className="text-brand-500 underline underline-offset-4">Back to home</Link>
        </div>
      </div>
    </div>
  );
};

export default FreeHealthCheckup;
