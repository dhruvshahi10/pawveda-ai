import React, { useEffect, useMemo, useState } from 'react';
import { AdoptionApplication, AdoptionOrg, AdoptionPet, AdoptionStatus } from '../types';
import { createAdoptionApplication, fetchAdoptionOrgs, fetchAdoptionPets } from '../services/adoptionService';

interface Props {
  city?: string;
}

const STATUS_FLOW: AdoptionStatus[] = ['submitted', 'review', 'interview', 'home-visit', 'approved', 'adopted'];

const Adoption: React.FC<Props> = ({ city }) => {
  const [view, setView] = useState<'list' | 'detail' | 'apply' | 'status'>('list');
  const [selectedPet, setSelectedPet] = useState<AdoptionPet | null>(null);
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState<'All' | AdoptionPet['species']>('All');
  const [size, setSize] = useState<'All' | AdoptionPet['size']>('All');
  const [application, setApplication] = useState<AdoptionApplication | null>(null);
  const [pets, setPets] = useState<AdoptionPet[]>([]);
  const [orgs, setOrgs] = useState<AdoptionOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [orgData, petData] = await Promise.all([fetchAdoptionOrgs(), fetchAdoptionPets()]);
        if (!active) return;
        setOrgs(orgData);
        setPets(petData);
      } catch {
        if (!active) return;
        setLoadError('Unable to load adoption listings right now.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const filteredPets = useMemo(() => {
    return pets.filter(pet => {
      const matchesCity = city ? pet.city.toLowerCase() === city.toLowerCase() : true;
      const matchesSearch = search ? pet.name.toLowerCase().includes(search.toLowerCase()) || pet.breed.toLowerCase().includes(search.toLowerCase()) : true;
      const matchesSpecies = species === 'All' ? true : pet.species === species;
      const matchesSize = size === 'All' ? true : pet.size === size;
      return matchesCity && matchesSearch && matchesSpecies && matchesSize;
    });
  }, [city, pets, search, size, species]);

  const org = selectedPet ? orgs.find(item => item.id === selectedPet.orgId) : null;

  const handleApply = () => {
    setView('apply');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet) return;
    setSubmitError('');
    try {
      const payload = {
        petId: selectedPet.id,
        applicantName: (e.target as HTMLFormElement).applicantName.value,
        email: (e.target as HTMLFormElement).email.value,
        phone: (e.target as HTMLFormElement).phone.value,
        city: (e.target as HTMLFormElement).city.value,
        housingType: (e.target as HTMLFormElement).housingType.value,
        petExperience: (e.target as HTMLFormElement).petExperience.value,
        timeAvailability: (e.target as HTMLFormElement).timeAvailability.value,
        reason: (e.target as HTMLFormElement).reason.value
      };
      const newApplication = await createAdoptionApplication(payload);
      setApplication(newApplication);
      setView('status');
    } catch {
      setSubmitError('Unable to submit your application right now.');
    }
  };

  if (view === 'detail' && selectedPet) {
    return (
      <div className="space-y-8 animate-reveal">
        <button onClick={() => setView('list')} className="text-[10px] font-black uppercase tracking-widest text-brand-500">← Back to Adoption Hub</button>
        <div className="bg-white rounded-[3rem] border border-brand-50 shadow-sm overflow-hidden">
          <img src={selectedPet.photoUrl} alt={selectedPet.name} className="w-full h-64 object-cover" />
          <div className="p-8 space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-3xl font-display font-black text-brand-900">{selectedPet.name}</h2>
              <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{selectedPet.species}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-400">{selectedPet.city}</span>
            </div>
            <p className="text-brand-800/70">{selectedPet.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm text-brand-800/70">
              <div>Breed: <span className="font-bold text-brand-900">{selectedPet.breed}</span></div>
              <div>Age: <span className="font-bold text-brand-900">{Math.round(selectedPet.ageMonths / 12)} yrs</span></div>
              <div>Gender: <span className="font-bold text-brand-900">{selectedPet.gender}</span></div>
              <div>Size: <span className="font-bold text-brand-900">{selectedPet.size}</span></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedPet.temperamentTags.map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full bg-brand-50 text-[10px] font-black uppercase tracking-widest text-brand-500">{tag}</span>
              ))}
            </div>
            <div className="bg-brand-50/60 p-6 rounded-[2rem]">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-3">Adoption Checklist</p>
              <ul className="space-y-2 text-sm text-brand-800/70">
                <li>✓ Home visit readiness</li>
                <li>✓ Daily routine plan</li>
                <li>✓ Vet access within 5 km</li>
                <li>✓ Family consent and time availability</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleApply} className="w-full bg-brand-900 text-white py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest">Apply to Adopt</button>
              {org?.whatsapp && (
                <a href={org.whatsapp} target="_blank" className="w-full text-center border-2 border-brand-500 text-brand-500 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest">Chat with Rescue</a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'apply' && selectedPet) {
    return (
      <div className="space-y-8 animate-reveal">
        <button onClick={() => setView('detail')} className="text-[10px] font-black uppercase tracking-widest text-brand-500">← Back to Pet Details</button>
        <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] border border-brand-50 shadow-sm p-8 space-y-6">
          <h3 className="text-2xl font-display font-black text-brand-900">Adoption Application</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <input name="applicantName" required placeholder="Full Name" className="bg-brand-50 rounded-2xl px-4 py-3 text-sm" />
            <input name="email" required type="email" placeholder="Email" className="bg-brand-50 rounded-2xl px-4 py-3 text-sm" />
            <input name="phone" required placeholder="Phone" className="bg-brand-50 rounded-2xl px-4 py-3 text-sm" />
            <input name="city" required defaultValue={city || ''} placeholder="City" className="bg-brand-50 rounded-2xl px-4 py-3 text-sm" />
            <select name="housingType" className="bg-brand-50 rounded-2xl px-4 py-3 text-sm">
              <option>Apartment</option>
              <option>Independent House</option>
              <option>Farm / Villa</option>
            </select>
            <select name="petExperience" className="bg-brand-50 rounded-2xl px-4 py-3 text-sm">
              <option>First-time</option>
              <option>Experienced</option>
            </select>
            <select name="timeAvailability" className="bg-brand-50 rounded-2xl px-4 py-3 text-sm">
              <option>Limited</option>
              <option>Moderate</option>
              <option>Flexible</option>
            </select>
          </div>
          <textarea name="reason" required placeholder="Why do you want to adopt?" className="w-full bg-brand-50 rounded-2xl px-4 py-4 text-sm h-28" />
          <label className="flex items-center gap-3 text-xs text-brand-800/60">
            <input type="checkbox" required className="accent-brand-500" />
            I understand the adoption process may include a home visit and follow-up.
          </label>
          {submitError && (
            <p className="text-sm text-red-500 font-bold">{submitError}</p>
          )}
          <button type="submit" className="w-full bg-brand-900 text-white py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest">Submit Application</button>
        </form>
      </div>
    );
  }

  if (view === 'status' && selectedPet && application) {
    return (
      <div className="space-y-8 animate-reveal">
        <button onClick={() => setView('list')} className="text-[10px] font-black uppercase tracking-widest text-brand-500">← Back to Adoption Hub</button>
        <div className="bg-white rounded-[3rem] border border-brand-50 shadow-sm p-8 space-y-6">
          <h3 className="text-2xl font-display font-black text-brand-900">Application Status</h3>
          <p className="text-sm text-brand-800/60">Applied for {selectedPet.name}. We will notify you as the rescue reviews your request.</p>
          <div className="space-y-4">
            {STATUS_FLOW.map(stage => (
              <div key={stage} className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${stage === application.status ? 'bg-brand-500' : 'bg-brand-200'}`} />
                <span className={`text-sm font-bold ${stage === application.status ? 'text-brand-900' : 'text-brand-400'}`}>{stage.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
          {org && (
            <div className="bg-brand-50/60 p-6 rounded-[2rem] space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">Rescue Contact</p>
              <p className="text-sm font-bold text-brand-900">{org.name}</p>
              <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest text-brand-500">
                <a href={`mailto:${org.contactEmail}`} className="underline">Email</a>
                <a href={`tel:${org.contactPhone}`} className="underline">Call</a>
                {org.whatsapp && <a href={org.whatsapp} className="underline">WhatsApp</a>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-reveal">
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="space-y-2">
          <h2 className="text-4xl font-display font-black text-brand-900">Adoption Hub</h2>
          <p className="text-brand-800/50 text-sm italic">Verified rescues and pets ready for a new home.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or breed"
            className="bg-brand-50 rounded-full px-4 py-2 text-sm"
          />
          <select value={species} onChange={(e) => setSpecies(e.target.value as any)} className="bg-brand-50 rounded-full px-4 py-2 text-sm">
            <option value="All">All Species</option>
            <option value="Dog">Dog</option>
            <option value="Cat">Cat</option>
            <option value="Other">Other</option>
          </select>
          <select value={size} onChange={(e) => setSize(e.target.value as any)} className="bg-brand-50 rounded-full px-4 py-2 text-sm">
            <option value="All">All Sizes</option>
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Large">Large</option>
          </select>
        </div>
      </div>

      {loadError && (
        <div className="bg-brand-50 p-6 rounded-[2rem] text-sm text-brand-800/70">{loadError}</div>
      )}
      {loading ? (
        <div className="bg-brand-50 p-8 rounded-[3rem] text-center text-brand-800/50 font-medium">
          Loading verified adoption listings...
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredPets.map(pet => (
            <div key={pet.id} className="bg-white rounded-[3rem] border border-brand-50 shadow-sm overflow-hidden">
              <img src={pet.photoUrl} alt={pet.name} className="w-full h-48 object-cover" />
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-display font-black text-brand-900">{pet.name}</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-500">{pet.city}</span>
                </div>
                <p className="text-sm text-brand-800/60">{pet.breed} · {pet.size} · {Math.round(pet.ageMonths / 12)} yrs</p>
                <div className="flex flex-wrap gap-2">
                  {pet.temperamentTags.map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-brand-50 text-[9px] font-black uppercase tracking-widest text-brand-500">{tag}</span>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSelectedPet(pet);
                    setView('detail');
                  }}
                  className="w-full bg-brand-900 text-white py-3 rounded-[2rem] font-black text-[10px] uppercase tracking-widest"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
          {!filteredPets.length && (
            <div className="bg-brand-50 p-8 rounded-[3rem] text-center text-brand-800/50 font-medium">
              No pets found for this city. Try another filter or check back soon.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Adoption;
