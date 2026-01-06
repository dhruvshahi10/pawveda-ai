
import React, { useState, useEffect, useMemo } from 'react';
import { PetData } from '../types';

interface Props {
  onComplete: (data: PetData) => void;
}

const steps = [
  { 
    title: "Initializing Intelligence", 
    subtitle: "Welcome to the future of desi pet care. We're about to calibrate our AI for your companion's specific biology.",
    image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=1000"
  },
  { 
    title: "Geography Matters", 
    subtitle: "Climate dictates everything from hydration to paw-safety. Which city are you located in?",
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1000"
  },
  { 
    title: "Their Identity", 
    subtitle: "A name defines a bond. How do you address your companion?",
    image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=1000"
  },
  { 
    title: "Lineage & Stage", 
    subtitle: "Our models are specialized for Indies/Pariahs but support all heritage breeds.",
    image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=1000"
  },
  { 
    title: "Metabolic Vitals", 
    subtitle: "Precision nutrition starts with accurate weight and activity metrics.",
    image: "https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&q=80&w=1000"
  },
  { 
    title: "The Desi Kitchen", 
    subtitle: "What's on the menu? We specialize in auditing home-cooked meals for toxicity.",
    image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=1000"
  },
  { 
    title: "Priority Focus", 
    subtitle: "What is your main goal with PawVeda Intelligence?",
    image: "https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?auto=format&fit=crop&q=80&w=1000"
  },
  { 
    title: "Calibrating Nodes", 
    subtitle: "Syncing with Indian Veterinary Standards, Google Search Grounding, and local climate APIs.",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1000"
  }
];

const breeds = ['Indie / Pariah', 'Golden Retriever', 'Labrador', 'German Shepherd', 'Beagle', 'Shih Tzu', 'Persian Cat', 'Indie Cat'];
const priorities = ['Toxicity Checks', 'Climate Safety', 'Health Vault', 'AI Studio', 'RWA/Admin Peace'];

// Simulated real-time city registry
const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur", 
  "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna", 
  "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", 
  "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", 
  "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", 
  "Kota", "Guwahati", "Chandigarh", "Solapur", "Hubli-Dharwad"
];

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [citySearch, setCitySearch] = useState('');
  const [isCityLoading, setIsCityLoading] = useState(false);
  const [formData, setFormData] = useState<PetData>({
    name: '',
    breed: 'Indie / Pariah',
    age: 'Adult',
    weight: '15',
    dietType: 'Home Cooked',
    gender: 'Male',
    activityLevel: 'Moderate',
    city: '',
    allergies: [],
    interests: []
  });

  const next = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      onComplete(formData);
    }
  };

  const back = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const citySuggestions = useMemo(() => {
    if (!citySearch || citySearch.length < 2) return [];
    return INDIAN_CITIES.filter(c => 
      c.toLowerCase().includes(citySearch.toLowerCase()) && c !== formData.city
    ).slice(0, 5);
  }, [citySearch, formData.city]);

  useEffect(() => {
    if (citySearch) {
      setIsCityLoading(true);
      const timer = setTimeout(() => setIsCityLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [citySearch]);

  useEffect(() => {
    if (step === steps.length - 1) {
      const timer = setTimeout(() => onComplete(formData), 3500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const progress = (step / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center p-4 md:p-10">
      <div className="w-full max-w-6xl h-[90vh] md:h-[80vh] bg-white rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(82,49,23,0.15)] overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-50 z-50">
          <div className="h-full bg-brand-500 transition-all duration-1000 ease-in-out" style={{ width: `${progress}%` }} />
        </div>

        {/* Left Side: Cinematic Visuals */}
        <div className="w-full md:w-1/2 relative overflow-hidden group hidden md:block">
          {steps.map((s, idx) => (
            <img 
              key={idx}
              src={s.image} 
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1.5s] ease-in-out ${step === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} 
              alt="Contextual Pet" 
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-900/20 to-transparent" />
          
          <div className="absolute bottom-16 left-16 right-16 text-white">
            <span className="text-brand-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">Node Calibration</span>
            <h2 className="text-4xl md:text-5xl font-display font-extrabold leading-tight mb-6 tracking-tighter">
              {steps[step].title}
            </h2>
            <p className="text-brand-100/70 text-lg font-light leading-relaxed max-w-sm">
              {steps[step].subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Forms */}
        <div className="w-full md:w-1/2 p-8 md:p-20 flex flex-col justify-center bg-white relative overflow-y-auto">
          
          {/* Back Button Navigation */}
          {step > 0 && step < steps.length - 1 && (
            <button 
              onClick={back}
              className="absolute top-12 left-12 flex items-center gap-2 text-brand-300 font-black text-[10px] uppercase tracking-widest hover:text-brand-900 transition-all group z-[60]"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Go Back
            </button>
          )}

          {step === 0 && (
            <div className="animate-reveal space-y-12 text-center md:text-left">
              <div className="w-24 h-24 bg-brand-50 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner mx-auto md:mx-0">🇮🇳</div>
              <div className="space-y-4">
                <h3 className="text-3xl font-display font-bold text-brand-900 tracking-tight">Intelligence for India.</h3>
                <p className="text-brand-800/40 text-lg leading-relaxed">
                  Most pet tech is designed for Western climates and processed kibble. PawVeda is calibrated for our streets, our spices, and our companions.
                </p>
              </div>
              <button 
                onClick={next}
                className="w-full bg-brand-900 text-white py-6 rounded-[2.5rem] text-xl font-bold shadow-2xl hover:bg-brand-500 transition-all flex items-center justify-center gap-4 group active:scale-95"
              >
                Start Calibration <span className="group-hover:translate-x-2 transition-transform">→</span>
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="animate-reveal space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-2">Real-time City Sync</label>
                <div className="relative">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Search city (e.g., Bangalore)"
                    className="w-full bg-brand-50 border-none rounded-[2.5rem] px-10 py-7 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all text-2xl font-bold text-brand-900"
                    value={citySearch || formData.city}
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      if (!e.target.value) setFormData({...formData, city: ''});
                    }}
                  />
                  {isCityLoading && <div className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}
                  
                  {citySuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[2.5rem] shadow-2xl border border-brand-50 overflow-hidden z-[70] animate-reveal">
                      {citySuggestions.map(city => (
                        <button 
                          key={city}
                          onClick={() => {
                            setFormData({...formData, city});
                            setCitySearch('');
                          }}
                          className="w-full text-left px-10 py-5 hover:bg-brand-50 font-bold text-brand-900 transition-colors flex items-center justify-between group"
                        >
                          {city}
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-500">📍</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-brand-800/40 text-sm italic">Grounds our AI in local weather warnings and RWA news.</p>
              <button 
                disabled={!formData.city}
                onClick={next}
                className="w-full bg-brand-900 text-white py-6 rounded-[2.5rem] font-bold text-xl shadow-2xl hover:bg-brand-500 transition-all disabled:opacity-20 transform active:scale-95"
              >
                Lock Location {formData.city && `(${formData.city})`}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-reveal space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-2">Companion Name</label>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="e.g., Bruno, Rani, Kalu"
                  className="w-full bg-brand-50 border-none rounded-[2.5rem] px-10 py-7 outline-none focus:ring-4 focus:ring-brand-500/10 transition-all text-2xl font-bold text-brand-900"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-2">Gender</label>
                <div className="flex gap-4">
                  {['Male', 'Female'].map(g => (
                    <button 
                      key={g}
                      onClick={() => setFormData({...formData, gender: g as any})}
                      className={`flex-1 py-6 rounded-[2rem] font-bold transition-all border-2 ${formData.gender === g ? 'bg-brand-900 text-white border-brand-900 shadow-lg' : 'bg-white text-brand-900 border-brand-50 hover:border-brand-100'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <button disabled={!formData.name} onClick={next} className="w-full bg-brand-900 text-white py-6 rounded-[2.5rem] font-bold text-xl shadow-2xl hover:bg-brand-500 transition-all disabled:opacity-20 active:scale-95">Confirm Identity</button>
            </div>
          )}

          {step === 3 && (
            <div className="animate-reveal space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-2">Breed / Lineage</label>
                <div className="grid grid-cols-2 gap-3">
                  {breeds.map(b => (
                    <button 
                      key={b}
                      onClick={() => setFormData({...formData, breed: b})}
                      className={`p-5 rounded-2xl border-2 text-left transition-all text-sm font-bold ${formData.breed === b ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-sm' : 'border-brand-50 bg-white text-brand-800/40 hover:border-brand-200'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-2">Life Stage</label>
                <div className="flex gap-3">
                  {['Puppy', 'Adult', 'Senior'].map(stage => (
                    <button 
                      key={stage}
                      onClick={() => setFormData({...formData, age: stage})}
                      className={`flex-1 py-4 rounded-xl border-2 text-xs font-bold transition-all ${formData.age === stage ? 'bg-brand-900 text-white border-brand-900' : 'bg-white text-brand-900 border-brand-50 hover:border-brand-100'}`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={next} className="w-full bg-brand-900 text-white py-6 rounded-[2.5rem] font-bold text-xl shadow-2xl hover:bg-brand-500 transition-all mt-4 active:scale-95">Continue Calibration</button>
            </div>
          )}

          {step === 4 && (
            <div className="animate-reveal space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-2">Weight Metric (kg)</label>
                <div className="flex items-center gap-8">
                  <input 
                    type="range" min="1" max="80" 
                    className="flex-1 accent-brand-500 h-2 bg-brand-50 rounded-lg appearance-none cursor-pointer"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  />
                  <span className="bg-brand-900 text-white px-8 py-3 rounded-2xl font-display font-black text-2xl shadow-xl">{formData.weight}</span>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-2">Activity Profile</label>
                <div className="space-y-3">
                  {['Low', 'Moderate', 'High'].map(level => (
                    <button 
                      key={level}
                      onClick={() => setFormData({...formData, activityLevel: level as any})}
                      className={`w-full p-6 rounded-[2rem] border-2 text-left flex items-center justify-between transition-all ${formData.activityLevel === level ? 'border-brand-500 bg-brand-50 shadow-md' : 'border-brand-50 bg-white hover:border-brand-100'}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{level === 'Low' ? '🛋️' : level === 'Moderate' ? '🚶' : '⚡'}</span>
                        <span className="font-bold text-brand-900">{level} Intensity</span>
                      </div>
                      {formData.activityLevel === level && <span className="w-3 h-3 bg-brand-500 rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={next} className="w-full bg-brand-900 text-white py-6 rounded-[2.5rem] font-bold text-xl shadow-2xl hover:bg-brand-500 transition-all active:scale-95">Proceed to Nutrition</button>
            </div>
          )}

          {step === 5 && (
            <div className="animate-reveal space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-2">Dietary Foundation</label>
                <div className="space-y-4">
                  {['Home Cooked', 'Kibble', 'Mixed'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setFormData({...formData, dietType: type as any})}
                      className={`w-full p-8 rounded-[3rem] border-2 text-left transition-all ${formData.dietType === type ? 'border-brand-500 bg-brand-50 shadow-xl' : 'border-brand-50 bg-white group hover:border-brand-200'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xl font-bold text-brand-900">{type}</span>
                        <span className="text-2xl">{type === 'Home Cooked' ? '🥘' : type === 'Kibble' ? '🥣' : '🍱'}</span>
                      </div>
                      <p className="text-xs text-brand-800/40 leading-relaxed font-medium">
                        {type === 'Home Cooked' ? 'AI focuses on Indian kitchen spice toxicity auditing.' : 'Optimizes for volume and brand safety matrix.'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={next} className="w-full bg-brand-900 text-white py-6 rounded-[2.5rem] font-bold text-xl shadow-2xl hover:bg-brand-500 transition-all active:scale-95">Finalize Setup</button>
            </div>
          )}

          {step === 6 && (
            <div className="animate-reveal space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] ml-2">Select Priorities</label>
                <div className="grid grid-cols-1 gap-3">
                  {priorities.map(p => {
                    const selected = formData.interests.includes(p);
                    return (
                      <button 
                        key={p}
                        onClick={() => {
                          const newInterests = selected 
                            ? formData.interests.filter(i => i !== p)
                            : [...formData.interests, p];
                          setFormData({...formData, interests: newInterests});
                        }}
                        className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center justify-between ${selected ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-md' : 'border-brand-50 bg-white text-brand-800/40 hover:border-brand-200'}`}
                      >
                        <span className="font-bold">{p}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-brand-500 border-brand-500 text-white shadow-sm' : 'border-brand-100'}`}>
                          {selected && '✓'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={next} className="w-full bg-brand-500 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-[0_20px_50px_rgba(245,146,69,0.3)] hover:bg-brand-600 transition-all active:scale-95">Initialize Profile</button>
            </div>
          )}

          {step === 7 && (
            <div className="text-center space-y-12 py-10">
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 border-8 border-brand-50 rounded-full" />
                <div className="absolute inset-0 border-8 border-brand-500 rounded-full border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-6xl">🐾</div>
              </div>
              <div className="space-y-6">
                <h3 className="text-4xl font-display font-black text-brand-900">Synchronizing...</h3>
                <div className="space-y-3">
                  <p className="text-brand-800/40 font-bold uppercase text-[10px] tracking-widest animate-pulse">Fetching {formData.city} Weather Baseline</p>
                  <p className="text-brand-800/40 font-bold uppercase text-[10px] tracking-widest animate-pulse delay-75">Grounding {formData.breed} Heritage Search</p>
                  <p className="text-brand-800/40 font-bold uppercase text-[10px] tracking-widest animate-pulse delay-150">Optimizing Spice Auditor Matrix</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Onboarding;
