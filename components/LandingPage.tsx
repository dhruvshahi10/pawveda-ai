
import React, { useEffect, useMemo, useState } from 'react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import { apiClient } from '../services/apiClient';

interface Props {
  onStart: (mode?: 'login' | 'signup') => void;
}

const problems = [
  "Is the hidden onion in your dal harming your pet?",
  "Walking your Indie in the 42°C Delhi heat?",
  "Scattered medical records across WhatsApp chats?",
  "Is home-cooked food enough for your breed's joints?",
  "Struggling with RWA rules for your pet in Mumbai?"
];

const animalTypes = [
  { icon: "🐕", name: "Indie / Pariah", feature: "NutriScan Expert" },
  { icon: "🐈", name: "Persian Cat", feature: "Coat Health AI" },
  { icon: "🦮", name: "Golden Retriever", feature: "Joint Support" },
  { icon: "🐩", name: "Poodle", feature: "Allergy Audit" },
  { icon: "🐕‍🦺", name: "German Shepherd", feature: "Guard Health" },
  { icon: "🐱", name: "Indie Cat", feature: "Toxicity Shield" },
  { icon: "🐰", name: "Rabbit", feature: "Fiber Analytics" },
  { icon: "🦜", name: "Parrot", feature: "Avian Safety" },
];

const petQuotes = [
  "“Dogs are not our whole life, but they make our lives whole.” — Roger Caras",
  "“Until one has loved an animal, a part of one’s soul remains unawakened.” — Anatole France",
  "“What counts is not necessarily the size of the dog in the fight — it’s the size of the fight in the dog.” — Mark Twain",
  "“Cats choose us; we don’t own them.” — Kristin Cast",
  "“A pet is the only thing on earth that loves you more than you love yourself.” — Josh Billings"
];

const adoptionPets = [
  { name: "Bruno", breed: "Indie / Pariah", city: "Delhi", photo: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=800" },
  { name: "Miso", breed: "Indie Cat", city: "Mumbai", photo: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&q=80&w=800" },
  { name: "Luna", breed: "Golden Retriever", city: "Bengaluru", photo: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&q=80&w=800" },
  { name: "Simba", breed: "Indie / Pariah", city: "Pune", photo: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800" }
];

const LandingPage: React.FC<Props> = ({ onStart }) => {
  const [problemIndex, setProblemIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [premiumInterest, setPremiumInterest] = useState<string[]>([]);
  const [phoneCountry, setPhoneCountry] = useState('IN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProblemIndex(prev => (prev + 1) % problems.length);
    }, 4000);
    const quoteInterval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % petQuotes.length);
    }, 4500);
    setIsVisible(true);
    return () => {
      clearInterval(interval);
      clearInterval(quoteInterval);
    };
  }, []);

  const countries = useMemo(() => {
    const displayNames =
      typeof Intl !== 'undefined' && 'DisplayNames' in Intl
        ? new Intl.DisplayNames(['en'], { type: 'region' })
        : null;
    return getCountries()
      .map(code => ({
        code,
        name: displayNames?.of(code) || code,
        callingCode: getCountryCallingCode(code)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selectedCountry = useMemo(
    () => countries.find(country => country.code === phoneCountry),
    [countries, phoneCountry]
  );

  const handleCtaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    const trimmedEmail = email.trim().toLowerCase();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!emailValid) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (premiumInterest.length === 0) {
      setFormError('Please select at least one feature you are excited about.');
      return;
    }
    if (!phoneNumber.trim()) {
      setFormError('Please enter your contact number.');
      return;
    }
    if (!selectedCountry) {
      setFormError('Please select your country.');
      return;
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const parsedPhone = parsePhoneNumberFromString(normalizedPhone, phoneCountry);
    if (!parsedPhone || !parsedPhone.isValid()) {
      setFormError(`Please enter a valid ${selectedCountry.name} phone number.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiClient.post<{ status?: string; message?: string }>(
        '/api/waitlist',
        {
          email: trimmedEmail,
          premiumInterest: premiumInterest.join(', '),
          countryCode: selectedCountry.code,
          countryName: selectedCountry.name,
          phoneE164: parsedPhone.number,
          phoneNational: parsedPhone.nationalNumber,
          source: 'landing_page'
        }
      );
      if (response?.status === 'duplicate') {
        setFormError(response.message || 'You have already submitted your interest.');
        return;
      }
      setFormSubmitted(true);
      setEmail('');
      setPremiumInterest([]);
      setPhoneNumber('');
    } catch (err) {
      console.error('Waitlist submission failed:', err);
      setFormError('We could not save your details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const interestOptions = [
    'AI-Powered NutriScan (Dal/Curd Audits)',
    'Health Vault (Prescription Analysis)',
    'Climate Shield (Heat Safety Alerts)',
    'Studio Pro (Cinematic Memories)',
    '24/7 AI First-Aid Companion'
  ];

  const toggleInterest = (value: string) => {
    setPremiumInterest((prev) => (
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    ));
  };

  return (
    <div className="relative overflow-hidden bg-[#FAF8F6] scroll-smooth">
      {/* Navigation */}
      <nav className={`flex items-center justify-between px-6 py-8 max-w-7xl mx-auto relative z-50 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-900 rounded-xl flex items-center justify-center text-white font-display font-bold text-xl shadow-lg hover:rotate-12 transition-transform cursor-pointer">P</div>
          <span className="text-2xl font-display font-bold text-brand-900 tracking-tighter">PawVeda</span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={() => onStart('login')} className="hidden md:block text-sm font-bold text-brand-800/60 hover:text-brand-900 transition-colors uppercase tracking-widest">Login</button>
          <button onClick={() => onStart('signup')} className="bg-brand-900 text-white px-8 py-3.5 rounded-full font-bold shadow-xl hover:bg-brand-500 transition-all active:scale-95">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className={`transition-all duration-1000 delay-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              The Intelligence Layer for Indian Pet Parents
            </span>
            <h1 className="text-6xl md:text-8xl font-display font-extrabold text-neutral-dark leading-[0.9] mb-10 tracking-tighter">
              Expert Care. <br/><span className="text-brand-500 italic font-serif">Redefined.</span>
            </h1>
            
            <div className="h-20 mb-12 border-l-4 border-brand-500 pl-8 flex items-center overflow-hidden">
              <p className="text-xl md:text-2xl text-brand-800/80 font-medium italic animate-reveal">
                {problems[problemIndex]}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 items-center">
              <button onClick={() => onStart('signup')} className="w-full sm:w-auto bg-brand-500 text-white px-14 py-6 rounded-[2.5rem] text-xl font-bold shadow-2xl shadow-brand-500/20 hover:bg-brand-600 transition-all active:scale-95 group">
                Join the Pack <span className="inline-block group-hover:translate-x-2 transition-transform ml-2">→</span>
              </button>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/100?u=${i + 20}`} className="w-12 h-12 rounded-full border-4 border-[#FAF8F6] shadow-md" alt="User" />
                  ))}
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-brand-900 uppercase">Trusted by</p>
                  <p className="text-[10px] text-brand-800/50 uppercase">5,000+ Desi Parents</p>
                </div>
              </div>
            </div>
          </div>

          <div className={`relative transition-all duration-1000 delay-500 transform ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
            <div className="absolute inset-0 bg-brand-200/20 rounded-full blur-3xl animate-pulse -z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?auto=format&fit=crop&q=80&w=1200" 
              className="rounded-[5rem] shadow-[0_40px_100px_-20px_rgba(82,49,23,0.3)] w-full object-cover aspect-[4/5] border-8 border-white hover:scale-[1.02] transition-transform duration-700"
              alt="Happy Indian Dog"
            />
            {/* Floating UI Elements */}
            <div className="absolute -bottom-10 -left-10 bg-white/90 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl max-w-[280px] border border-white/20 animate-bounce-slow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg shadow-brand-500/30">🥗</div>
                <div>
                  <div className="text-[10px] font-black text-brand-500 uppercase tracking-widest">NutriScan Active</div>
                  <div className="text-[9px] text-brand-300 uppercase">Grounded Check</div>
                </div>
              </div>
              <p className="text-xs font-bold text-neutral-dark leading-relaxed italic">"Dal identified. Safe for Bruno. Avoid adding table salt or fried tadka."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-32 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-brand-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4 block">Pawveda Intelligence</span>
            <h2 className="text-4xl md:text-5xl font-display font-black text-brand-900">What does your paw companion get?</h2>
          </div>
          <div className="hidden md:grid md:grid-cols-3 gap-16">
            {[
              { icon: "📡", title: "Daily Pet Brief", desc: "Personalized walking index, hydration risk, and air safety based on your city and breed.", delay: 'delay-100' },
              { icon: "🧭", title: "Safety Radar", desc: "Heat, humidity, and air quality signals with safe walk windows and actions.", delay: 'delay-200' },
              { icon: "🏥", title: "Nearby Services", desc: "Find clinics, groomers, and boarding quickly with map-verified links.", delay: 'delay-300' },
              { icon: "⏰", title: "Care Reminders", desc: "Vaccines, deworming, grooming, and checkups — never miss a cycle.", delay: 'delay-400' },
              { icon: "✅", title: "Breed Checklists", desc: "Daily routines and nutrition checklists tailored to your companion.", delay: 'delay-500' },
              { icon: "✨", title: "Magic Studio", desc: "Generate cinematic pet art and keep memories in one place.", delay: 'delay-600' }
            ].map((item, i) => (
              <div key={i} className={`group p-12 rounded-[4rem] bg-brand-50 hover:bg-brand-900 transition-all duration-700 transform hover:-translate-y-4`}>
                <div className="text-6xl mb-10 group-hover:scale-110 transition-transform duration-500">{item.icon}</div>
                <h3 className="text-3xl font-display font-bold mb-6 text-brand-900 group-hover:text-white transition-colors">{item.title}</h3>
                <p className="text-brand-800/60 group-hover:text-white/70 leading-relaxed font-light text-lg transition-colors">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="md:hidden flex gap-5 overflow-x-auto pb-4 snap-x scrollbar-hide">
            {[
              { icon: "📡", title: "Daily Pet Brief", desc: "Personalized walking index, hydration risk, and air safety." },
              { icon: "🧭", title: "Safety Radar", desc: "Heat, humidity, and air quality with safe windows." },
              { icon: "🏥", title: "Nearby Services", desc: "Clinics, groomers, and boarding with verified links." },
              { icon: "⏰", title: "Care Reminders", desc: "Vaccines, deworming, grooming cycles." },
              { icon: "✅", title: "Breed Checklists", desc: "Daily routines tailored to your companion." },
              { icon: "✨", title: "Magic Studio", desc: "Cinematic pet art and memories." }
            ].map((item) => (
              <div key={item.title} className="min-w-[240px] snap-center bg-brand-50 rounded-[2.5rem] p-6 border border-brand-100 shadow-sm">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-display font-black text-brand-900 mb-3">{item.title}</h3>
                <p className="text-sm text-brand-800/60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials + Brand Partners */}
      <section className="py-32 px-6 bg-brand-50">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center">
            <span className="text-brand-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4 block">Loved by Parents</span>
            <h2 className="text-4xl md:text-5xl font-display font-black text-brand-900">Stories From the Pawveda Pack</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { name: "Aarav & Coco", quote: "The walking index saved us during Delhi heatwaves. It feels personal.", city: "Delhi" },
              { name: "Neha & Luna", quote: "Reminders + checklist finally made our routine consistent.", city: "Bengaluru" },
              { name: "Rishi & Simba", quote: "Nearby services and vet tips are worth the premium alone.", city: "Mumbai" }
            ].map((item) => (
              <div key={item.name} className="bg-white p-8 rounded-[3rem] border border-brand-100 shadow-sm hover:shadow-xl transition-all">
                <p className="text-lg font-display font-black text-brand-900 mb-4">“{item.quote}”</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-500">{item.name}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-brand-300">{item.city}</p>
              </div>
            ))}
          </div>
          <div className="pt-6">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-brand-400 mb-6">Trusted By Pet Brands</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {["Royal Canin", "Pedigree", "Drools", "Heads Up For Tails", "Supertails", "Farmina"].map((brand) => (
                <div key={brand} className="px-6 py-3 bg-white rounded-full border border-brand-100 text-[11px] font-black uppercase tracking-widest text-brand-500 shadow-sm">
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Animal Types Carousel */}
      <section className="py-32 bg-neutral-dark overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 mb-20 text-center">
          <span className="text-brand-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4 block">Inclusive Intelligence</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight">Care for Every Companion</h2>
          <p className="text-white/60 text-lg mt-6 max-w-3xl mx-auto italic">
            {petQuotes[quoteIndex]}
          </p>
          <p className="text-brand-200/60 text-[10px] font-black uppercase tracking-[0.4em] mt-6">
            Dogs • Cats • Birds • Rabbits • Small Animals • Rescues
          </p>
        </div>

        {/* Endless Carousel */}
        <div className="flex gap-10 animate-scroll md:whitespace-nowrap px-10 py-4 overflow-x-auto md:overflow-visible snap-x scrollbar-hide">
          {[...animalTypes, ...animalTypes, ...animalTypes].map((animal, i) => (
            <div key={i} className="inline-flex items-center gap-8 bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[3.5rem] min-w-[280px] snap-center hover:bg-white/10 transition-all group cursor-pointer hover:border-brand-500/50">
              <div className="text-6xl group-hover:scale-125 transition-transform duration-500">{animal.icon}</div>
              <div className="whitespace-normal">
                <p className="text-white font-display font-bold text-xl mb-1">{animal.name}</p>
                <p className="text-brand-500 text-[10px] font-black uppercase tracking-[0.2em]">{animal.feature}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute top-0 left-0 w-40 h-full bg-gradient-to-r from-neutral-dark to-transparent z-10"></div>
        <div className="absolute top-0 right-0 w-40 h-full bg-gradient-to-l from-neutral-dark to-transparent z-10"></div>
      </section>

      {/* Adoption Preview */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <span className="text-brand-500 font-black text-[10px] uppercase tracking-[0.3em]">Adopt a Paw</span>
            <h2 className="text-4xl md:text-5xl font-display font-black text-brand-900">Adopt. Don’t Shop.</h2>
            <p className="text-brand-800/60 text-lg max-w-3xl mx-auto">
              Discover verified pets waiting for loving homes across India. Each adoption is vetted, documented, and guided by rescue partners.
            </p>
          </div>
          <div className="flex gap-6 overflow-x-auto snap-x scrollbar-hide pb-4">
            {adoptionPets.map((pet) => (
              <div key={pet.name} className="min-w-[260px] snap-center bg-brand-50 rounded-[2.5rem] overflow-hidden border border-brand-100 shadow-sm">
                <img src={pet.photo} alt={pet.name} className="w-full h-44 object-cover" />
                <div className="p-5 space-y-2">
                  <p className="text-lg font-display font-black text-brand-900">{pet.name}</p>
                  <p className="text-sm text-brand-800/60">{pet.breed}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">{pet.city}</p>
                  <button onClick={() => onStart('signup')} className="w-full mt-3 bg-brand-900 text-white py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest">
                    Adopt
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={() => onStart('signup')} className="bg-brand-900 text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-[10px]">
              Explore Adoption Hub
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-40 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-display font-black mb-6 tracking-tighter">Premium Care. <span className="text-brand-500">No Compromise.</span></h2>
          <p className="text-brand-800/40 text-xl font-medium">Simple, transparent pricing for Indian households.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {[
            {
              name: "Beta",
              price: "₹19",
              badge: "Early Access",
              perks: ["Daily Pet Brief", "Reminders", "Basic Checklists"]
            },
            {
              name: "Pro Parent",
              price: "₹299",
              badge: "Popular",
              perks: ["Safety Radar", "Nearby Services", "Community Events", "Unlimited Nutri Lens"]
            },
            {
              name: "Elite Parent",
              price: "₹399",
              badge: "Premium",
              perks: ["AI First-Aid", "Priority Support", "Unlimited Studio", "Advanced Insights"]
            }
          ].map((plan) => (
            <div key={plan.name} className={`p-10 rounded-[3.5rem] ${plan.name === "Elite Parent" ? "bg-brand-900 text-white" : "bg-white border-2 border-brand-100"} shadow-lg relative overflow-hidden`}>
              <div className="absolute top-6 right-6 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full bg-brand-500 text-white">
                {plan.badge}
              </div>
              <h3 className={`text-2xl font-bold uppercase tracking-widest ${plan.name === "Elite Parent" ? "text-white" : "text-brand-900"}`}>{plan.name}</h3>
              <div className={`text-5xl font-display font-black mt-4 ${plan.name === "Elite Parent" ? "text-white" : "text-brand-900"}`}>
                {plan.price}
                <span className={`text-base font-normal opacity-70 ml-2`}>/mo</span>
              </div>
              <ul className={`mt-8 space-y-4 text-base ${plan.name === "Elite Parent" ? "text-white/70" : "text-brand-800/60"}`}>
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${plan.name === "Elite Parent" ? "bg-brand-500/30 text-brand-200" : "bg-brand-100 text-brand-500"}`}>✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
              <button onClick={() => onStart('signup')} className={`w-full mt-10 py-4 rounded-[2rem] font-black text-sm uppercase tracking-widest ${plan.name === "Elite Parent" ? "bg-brand-500 text-white" : "border-2 border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white"} transition-all`}>
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Interest Form */}
      <section className="py-40 px-6 bg-brand-50">
        <div className="max-w-6xl mx-auto bg-white rounded-[5rem] shadow-2xl overflow-hidden grid md:grid-cols-2 relative group border border-white">
          <div className="p-16 md:p-24 flex flex-col justify-center">
            <span className="text-brand-500 font-black text-[10px] uppercase tracking-[0.3em] mb-6 block">Try For Free</span>
            <h2 className="text-5xl font-display font-black text-brand-900 mb-8 leading-[1.1] tracking-tight">Try PawVeda for free. <br/><span className="text-brand-500">Shape what we ship.</span></h2>
            <p className="text-brand-800/60 text-xl mb-12 leading-relaxed">
              Tell us what you want most and we will send your free "Desi Food Toxicity Guide" plus early access.
            </p>
            
            {formSubmitted ? (
              <div className="animate-in fade-in zoom-in-95 duration-700 bg-brand-50/50 p-12 rounded-[4rem] text-center border-4 border-dashed border-brand-100">
                <div className="text-6xl mb-6 scale-animate">🐾</div>
                <h3 className="text-3xl font-display font-black text-brand-900 mb-4">You're on the list!</h3>
                <p className="text-lg text-brand-800/60 max-w-xs mx-auto">We'll reach out to your inbox shortly with our exclusive guides.</p>
              </div>
            ) : (
              <form onSubmit={handleCtaSubmit} className="space-y-6">
                <div className="relative">
                  <input 
                    required
                    type="email" 
                    placeholder="Email Address" 
                    className="w-full bg-[#FAF8F6] border-2 border-transparent focus:border-brand-500/30 rounded-[2.5rem] px-10 py-6 outline-none transition-all text-lg font-medium shadow-inner"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-[1.1fr_1.5fr]">
                  <div className="relative">
                    <select 
                      required
                      className="w-full bg-[#FAF8F6] border-2 border-transparent focus:border-brand-500/30 rounded-[2.5rem] px-8 py-6 outline-none transition-all text-lg font-medium shadow-inner appearance-none cursor-pointer"
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value)}
                    >
                      {countries.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">▼</div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-800/50">
                      +{selectedCountry?.callingCode || ''}
                    </span>
                    <input 
                      required
                      type="tel" 
                      placeholder="Contact Number" 
                      className="w-full bg-[#FAF8F6] border-2 border-transparent focus:border-brand-500/30 rounded-[2.5rem] px-10 py-6 pl-20 outline-none transition-all text-lg font-medium shadow-inner"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-500">Pick what excites you</p>
                    <span className="text-xs text-brand-800/50">Multiple select</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {interestOptions.map((option) => {
                      const selected = premiumInterest.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleInterest(option)}
                          className={`px-5 py-3 rounded-[999px] border-2 text-sm font-semibold transition-all ${
                            selected
                              ? 'bg-brand-900 text-white border-brand-900 shadow-lg'
                              : 'bg-[#FAF8F6] text-brand-900 border-brand-100 hover:border-brand-500/60'
                          }`}
                          aria-pressed={selected}
                        >
                          {selected ? '✓ ' : ''}{option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {formError && (
                  <p className="text-sm text-red-500 font-semibold text-center">{formError}</p>
                )}
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-brand-500 transition-all active:scale-95 transform hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving your access...' : 'Try for free'}
                </button>
              </form>
            )}
          </div>
          
          <div className="relative hidden md:block overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?auto=format&fit=crop&q=80&w=1200" 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[5s]" 
              alt="Interest Form Background"
            />
            <div className="absolute inset-0 bg-brand-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-20 text-center">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-12 rounded-[4rem] text-white">
                <p className="text-6xl mb-8">💡</p>
                <p className="text-3xl font-display font-bold leading-tight mb-6">"Every pet is a 1 of 1. Their care should be too."</p>
                <div className="h-1 w-12 bg-brand-500 mx-auto mb-6"></div>
                <p className="text-brand-100 font-black uppercase text-[10px] tracking-[0.3em]">— PawVeda Intelligence Layer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-20 border-t border-brand-100 text-center">
        <div className="flex flex-col items-center gap-12">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-900 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm">P</div>
            <span className="text-xl font-display font-bold text-brand-900 tracking-tighter">PawVeda</span>
          </div>
          <div className="flex gap-12 text-sm font-bold text-brand-800/40 uppercase tracking-widest">
            <a href="#" className="hover:text-brand-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-brand-500 transition-colors">Terms</a>
            <a href="#" className="hover:text-brand-500 transition-colors">Safety</a>
            <a href="#" className="hover:text-brand-500 transition-colors">Support</a>
          </div>
          <p className="text-brand-800/20 text-xs font-medium">
            © 2024 PawVeda Intelligence. Built for the modern Indian pet parent.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes reveal {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-reveal {
          animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes scale-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .scale-animate {
          animation: scale-pulse 3s infinite ease-in-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s infinite ease-in-out;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s infinite ease-in-out;
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
