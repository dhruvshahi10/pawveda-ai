
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UserState, NutriLensResult, ActivityLog, PetData, UserCredits, NewsInsight } from '../types';
import { 
  analyzeNutriLens, 
  suggestActivity, 
  generatePetArt, 
  fetchCityInsights,
  generatePlayPlan,
  fetchCityPetCentres,
  PetCentre
} from '../services/geminiService';

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

const Dashboard: React.FC<Props> = ({ user, setUser, onUpgrade, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'nutri' | 'play' | 'studio' | 'parent'>('home');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [cityNews, setCityNews] = useState<NewsInsight[]>([]);
  const [petCentres, setPetCentres] = useState<PetCentre[]>([]);
  const [expandedTraining, setExpandedTraining] = useState<number | null>(null);
  const [dailyGame, setDailyGame] = useState<string>('');
  
  // Nutri Lens State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lensResult, setLensResult] = useState<NutriLensResult | null>(null);
  
  // Activity State
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState<'Walk' | 'Play' | 'Training'>('Walk');
  const [logDuration, setLogDuration] = useState('20');
  const [logNotes, setLogNotes] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Walk' | 'Play' | 'Training'>('All');
  const [filterDate, setFilterDate] = useState<'All' | 'Today' | 'Week'>('All');
  
  // Studio State
  const [studioPrompt, setStudioPrompt] = useState('');
  const [generatedArt, setGeneratedArt] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Data Fetch
  useEffect(() => {
    const loadData = async () => {
      if (user.pet) {
        const [news, centres, game] = await Promise.all([
          fetchCityInsights(user.pet.city, user.pet.breed),
          fetchCityPetCentres(user.pet.city),
          generatePlayPlan(user.pet)
        ]);
        setCityNews(news);
        setPetCentres(centres);
        setDailyGame(game);
      }
    };
    loadData();
  }, [user.pet]);

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
    
    setIsProcessing(true);
    setLoadingMsg(`Syncing Log...`);
    
    try {
      const weather = `${user.pet?.city} current weather`;
      const advice = await suggestActivity(user.pet!, logType, weather);
      
      const newAct: ActivityLog = { 
        id: Date.now().toString(), 
        type: logType, 
        duration: parseInt(logDuration) || 0, 
        timestamp: new Date(), 
        advice,
        notes: logNotes
      };
      
      setUser({ ...user, activities: [newAct, ...user.activities] });
      setShowLogForm(false);
      setLogNotes('');
      setLogDuration('20');
    } finally { 
      setIsProcessing(false); 
      setLoadingMsg(""); 
    }
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

  const handleGenerateArt = async () => {
    if (!studioPrompt) return;
    if (!deductCredit('studio')) return;
    setIsProcessing(true);
    setLoadingMsg("Creating art...");
    try {
      const url = await generatePetArt(studioPrompt, "1K");
      setGeneratedArt(url);
    } finally {
      setIsProcessing(false);
      setLoadingMsg("");
    }
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
      <header className="px-6 py-8 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-2xl z-50 border-b border-brand-50 shadow-sm">
        <div className="flex items-center gap-5 cursor-pointer" onClick={() => setActiveTab('parent')}>
          <div className="relative group">
            <img src={`https://picsum.photos/seed/${user.pet?.name}/200`} className="w-14 h-14 rounded-3xl object-cover border-4 border-brand-500/10 shadow-xl group-hover:scale-110 transition-transform duration-500" alt="Pet" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white shadow-sm" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black text-brand-900 tracking-tight leading-none mb-1">{user.pet?.name}</h1>
            <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{user.pet?.city} Active Node</p>
          </div>
        </div>
        <div className="flex gap-4">
          {!user.isPremium && <button onClick={onUpgrade} className="bg-brand-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-brand-500 transition-all active:scale-95">Upgrade</button>}
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
              <div className="bg-brand-900 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-brand-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Climate Shield</span>
                    <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Live Sync</span>
                  </div>
                  <h3 className="text-3xl font-display font-black tracking-tight">{user.pet?.city} Walking Index</h3>
                  <p className="text-white/70 text-lg font-light leading-relaxed italic">
                    "Surface heat in {user.pet?.city} is currently high. For {user.pet?.name}, we recommend shaded walks only between 6 AM - 8 AM."
                  </p>
                </div>
                <div className="absolute -right-10 -bottom-10 text-[12rem] opacity-[0.05] rotate-12 group-hover:rotate-0 transition-transform duration-[3s]">🌡️</div>
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
                  <button onClick={() => setActiveTab('nutri')} className="text-xs font-black text-brand-500 uppercase tracking-widest underline decoration-brand-100 underline-offset-8">Audit a Plate Now →</button>
                </div>
              )}
            </div>

            {/* NEW: GENUINE PET CARE CENTRES CAROUSEL */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-black text-brand-900 tracking-tight">Care Centres in {user.pet?.city}</h3>
                <span className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Genuine Registry</span>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-6 snap-x scrollbar-hide">
                {petCentres.length > 0 ? petCentres.map((centre, i) => (
                  <div key={i} className="min-w-[280px] snap-center bg-white p-8 rounded-[3rem] border border-brand-50 shadow-sm hover:shadow-xl transition-all duration-500">
                    <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest mb-4 inline-block">{centre.type}</span>
                    <h4 className="text-lg font-display font-black text-brand-900 mb-2">{centre.name}</h4>
                    <p className="text-brand-800/50 text-[10px] font-medium mb-4 italic">{centre.address}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-brand-500 font-bold text-xs">⭐ {centre.rating}</span>
                      <a href={centre.link} target="_blank" className="text-[9px] font-black text-brand-900 underline underline-offset-4">Visit Node ↗</a>
                    </div>
                  </div>
                )) : (
                  <div className="min-w-full bg-brand-50 p-10 rounded-[3rem] flex items-center justify-center animate-pulse">
                    <p className="text-brand-800/20 font-display font-black text-sm italic">Fetching Local Care Centres...</p>
                  </div>
                )}
              </div>
            </div>

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

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-black text-brand-900 tracking-tight">Local Alerts: {user.pet?.city}</h3>
                <span className="text-[10px] font-bold text-brand-300 uppercase tracking-widest">Grounded Fetching</span>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-6 snap-x scrollbar-hide">
                {cityNews.length > 0 ? cityNews.map((news, i) => (
                  <div key={i} className="min-w-[320px] snap-center bg-white p-10 rounded-[3.5rem] border border-brand-50 relative overflow-hidden group shadow-sm hover:shadow-2xl transition-all duration-500">
                    <span className="text-brand-500 text-[9px] font-black uppercase tracking-[0.3em] mb-4 block">{news.source}</span>
                    <h4 className="text-xl font-display font-black mb-4 leading-tight text-brand-900 group-hover:text-brand-500 transition-colors">{news.title}</h4>
                    <p className="text-brand-800/50 text-sm font-medium mb-6 line-clamp-3 leading-relaxed italic">"{news.snippet}"</p>
                    <a href={news.url} target="_blank" className="text-[10px] font-black text-brand-900 underline underline-offset-8 decoration-brand-200">View Source ↗</a>
                  </div>
                )) : (
                  <div className="min-w-full bg-brand-50 p-20 rounded-[4rem] flex items-center justify-center animate-pulse">
                    <p className="text-brand-800/20 font-display font-black text-xl italic">Calibrating City Node...</p>
                  </div>
                )}
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
          </div>
        )}

        {/* NUTRI LENS */}
        {activeTab === 'nutri' && (
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
        )}

        {/* ACTIVITY HUB */}
        {activeTab === 'play' && (
          <div className="space-y-16 animate-reveal">
            <div className="flex justify-between items-end">
              <div className="space-y-2">
                <h2 className="text-5xl font-display font-black text-brand-900 leading-none">Activity</h2>
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
        )}

        {/* MAGIC STUDIO */}
        {activeTab === 'studio' && (
          <div className="space-y-12 animate-reveal">
            <h2 className="text-5xl font-display font-black text-brand-900 leading-none">Magic Studio</h2>
            <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-brand-50 space-y-10">
              <textarea 
                placeholder={`e.g., A cinematic 4K photo of ${user.pet?.name} in a royal palace...`} 
                className="w-full bg-brand-50 p-10 rounded-[3rem] outline-none border-4 border-transparent focus:border-brand-500/20 transition-all text-xl font-medium h-48 resize-none shadow-inner" 
                value={studioPrompt} onChange={e => setStudioPrompt(e.target.value)} 
              />
              <button onClick={handleGenerateArt} className="w-full bg-brand-900 text-white py-8 rounded-[3rem] font-black text-2xl shadow-2xl hover:bg-brand-500 transition-all active:scale-95">Render Artwork ✨</button>
            </div>
            {generatedArt && (
              <div className="animate-reveal p-10 bg-white rounded-[5.5rem] shadow-2xl border-[16px] border-brand-50 group">
                <img src={generatedArt} className="w-full rounded-[4rem] transition-transform duration-700 group-hover:scale-105" alt="Creation" />
                <button onClick={() => setGeneratedArt(null)} className="w-full py-6 text-brand-300 font-bold uppercase tracking-[0.5em] text-[10px] mt-8 hover:text-brand-900 transition-colors">Dismiss Piece</button>
              </div>
            )}
          </div>
        )}

        {/* PARENT DASHBOARD */}
        {activeTab === 'parent' && (
          <div className="space-y-12 animate-reveal pb-20">
            <h2 className="text-5xl font-display font-black text-brand-900 leading-none tracking-tight">Parent Dashboard</h2>
            <div className="grid grid-cols-2 gap-8">
              {[
                { label: 'Intelligence Rank', value: user.isPremium ? 'Elite Node' : 'Basic Node', icon: '💎' },
                { label: 'Metabolic Score', value: '96%', icon: '🔥' },
                { label: 'Monthly Efforts', value: user.activities.length, icon: '🛡️' },
                { label: 'Vitals Status', value: 'Synced', icon: '📊' }
              ].map((metric, i) => (
                <div key={i} className="bg-white p-12 rounded-[4.5rem] border border-brand-50 shadow-sm flex flex-col items-center text-center group hover:shadow-2xl transition-all duration-500">
                  <span className="text-5xl mb-6 group-hover:scale-110 transition-transform">{metric.icon}</span>
                  <span className="text-brand-500 font-black text-[9px] uppercase tracking-[0.3em] mb-2">{metric.label}</span>
                  <div className="text-4xl font-display font-black text-brand-900 tracking-tighter">{metric.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-[4.5rem] border border-brand-50 p-16 space-y-12 shadow-sm">
              <div className="flex items-center justify-between border-b border-brand-50 pb-10">
                <h3 className="text-3xl font-display font-black text-brand-900">Pet Registry</h3>
                <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest">Active Profile</span>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                <div><p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] mb-2">Breed Heritage</p><p className="text-2xl font-bold text-brand-900">{user.pet?.breed}</p></div>
                <div><p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] mb-2">Weight Node</p><p className="text-2xl font-bold text-brand-900">{user.pet?.weight}kg Class</p></div>
                <div><p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] mb-2">Diet Strategy</p><p className="text-2xl font-bold text-brand-900">{user.pet?.dietType}</p></div>
                <div><p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] mb-2">Climate Hub</p><p className="text-2xl font-bold text-brand-900">{user.pet?.city}</p></div>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <button onClick={onLogout} className="w-full py-6 text-red-300 font-black uppercase tracking-[0.5em] text-[10px] hover:text-red-500 transition-colors">Terminate Parent Node</button>
            </div>
          </div>
        )}

      </main>

      {/* Navigation */}
      <nav className="fixed bottom-10 left-6 right-6 h-24 bg-neutral-dark/95 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_40px_100px_-15px_rgba(49,29,14,0.6)] flex items-center justify-around px-10 z-50 border border-white/10">
        {[
          { id: 'home' as const, label: 'Feed', icon: '🐾' },
          { id: 'nutri' as const, label: 'Lens', icon: '🥗' },
          { id: 'play' as const, label: 'Activity', icon: '🏃‍♂️' },
          { id: 'studio' as const, label: 'Studio', icon: '✨' },
          { id: 'parent' as const, label: 'Parent', icon: '🦴' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-2 transition-all duration-700 ${activeTab === tab.id ? 'text-brand-500 -translate-y-5' : 'text-white/30 hover:text-white/60'}`}>
            <span className={`text-3xl transition-all duration-700 ${activeTab === tab.id ? 'scale-150 drop-shadow-[0_0_20px_rgba(245,146,69,0.8)]' : 'scale-100 opacity-60'}`}>{tab.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.4em]">{tab.label}</span>
          </button>
        ))}
      </nav>

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
      `}</style>
    </div>
  );
};

export default Dashboard;
