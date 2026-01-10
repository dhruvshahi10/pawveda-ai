import { AdoptionApplication, AdoptionOrg, AdoptionPet } from '../types';
import { apiClient } from './apiClient';

const FALLBACK_ORGS: AdoptionOrg[] = [
  {
    id: 'org-1',
    name: 'Pawveda Rescue Network',
    verified: true,
    city: 'Delhi',
    contactEmail: 'adopt@pawveda.in',
    contactPhone: '+91 99999 00001',
    whatsapp: 'https://wa.me/919999900001'
  },
  {
    id: 'org-2',
    name: 'City Animal Aid',
    verified: true,
    city: 'Mumbai',
    contactEmail: 'adoptions@cityaid.org',
    contactPhone: '+91 99999 00002',
    whatsapp: 'https://wa.me/919999900002'
  },
  {
    id: 'org-3',
    name: 'Bengaluru Paws Collective',
    verified: true,
    city: 'Bengaluru',
    contactEmail: 'hello@pawscollective.org',
    contactPhone: '+91 99999 00003',
    whatsapp: 'https://wa.me/919999900003'
  }
];

const FALLBACK_PETS: AdoptionPet[] = [
  {
    id: 'pet-1',
    name: 'Bruno',
    species: 'Dog',
    breed: 'Indie / Pariah',
    ageMonths: 18,
    gender: 'Male',
    size: 'Medium',
    city: 'Delhi',
    vaccinated: true,
    sterilized: true,
    temperamentTags: ['Calm', 'Good with kids'],
    description: 'Friendly indie boy who loves morning walks and cuddles.',
    photoUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=900',
    orgId: 'org-1'
  },
  {
    id: 'pet-2',
    name: 'Miso',
    species: 'Cat',
    breed: 'Indie Cat',
    ageMonths: 10,
    gender: 'Female',
    size: 'Small',
    city: 'Mumbai',
    vaccinated: true,
    sterilized: false,
    temperamentTags: ['Playful', 'Affectionate'],
    description: 'Curious kitten who loves window views and soft blankets.',
    photoUrl: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&q=80&w=900',
    orgId: 'org-2'
  },
  {
    id: 'pet-3',
    name: 'Luna',
    species: 'Dog',
    breed: 'Golden Retriever',
    ageMonths: 30,
    gender: 'Female',
    size: 'Large',
    city: 'Bengaluru',
    vaccinated: true,
    sterilized: true,
    temperamentTags: ['Gentle', 'Trained'],
    description: 'Trained retriever with great leash manners and calm energy.',
    photoUrl: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&q=80&w=900',
    orgId: 'org-3'
  },
  {
    id: 'pet-4',
    name: 'Simba',
    species: 'Dog',
    breed: 'Indie / Pariah',
    ageMonths: 8,
    gender: 'Male',
    size: 'Small',
    city: 'Pune',
    vaccinated: true,
    sterilized: false,
    temperamentTags: ['Energetic', 'Social'],
    description: 'Young pup ready for training and a playful household.',
    photoUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=900',
    orgId: 'org-1'
  },
  {
    id: 'pet-5',
    name: 'Nora',
    species: 'Cat',
    breed: 'Persian Cat',
    ageMonths: 24,
    gender: 'Female',
    size: 'Small',
    city: 'Delhi',
    vaccinated: true,
    sterilized: true,
    temperamentTags: ['Quiet', 'Indoor friendly'],
    description: 'Soft-spoken Persian who prefers quiet homes and gentle care.',
    photoUrl: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&q=80&w=900',
    orgId: 'org-1'
  }
];

export const fetchAdoptionOrgs = async (): Promise<AdoptionOrg[]> => {
  try {
    const data = await apiClient.get<{ orgs?: AdoptionOrg[] }>('/api/adoption/orgs');
    if (Array.isArray(data?.orgs) && data.orgs.length) {
      return data.orgs;
    }
  } catch {
    // ignore
  }
  return FALLBACK_ORGS;
};

export const fetchAdoptionPets = async (params?: {
  city?: string;
  species?: string;
  size?: string;
  search?: string;
}): Promise<AdoptionPet[]> => {
  const searchParams = new URLSearchParams();
  if (params?.city) searchParams.set('city', params.city);
  if (params?.species) searchParams.set('species', params.species);
  if (params?.size) searchParams.set('size', params.size);
  if (params?.search) searchParams.set('search', params.search);
  const query = searchParams.toString();
  const endpoint = query ? `/api/adoption/pets?${query}` : '/api/adoption/pets';

  try {
    const data = await apiClient.get<{ pets?: AdoptionPet[] }>(endpoint);
    if (Array.isArray(data?.pets) && data.pets.length) {
      return data.pets;
    }
  } catch {
    // ignore
  }
  return FALLBACK_PETS;
};

export const createAdoptionApplication = async (payload: {
  petId: string;
  applicantName: string;
  email: string;
  phone: string;
  city: string;
  housingType: string;
  petExperience: string;
  timeAvailability: string;
  reason: string;
}): Promise<AdoptionApplication> => {
  return apiClient.post<AdoptionApplication>('/api/adoption/applications', payload);
};

export const adoptionFallback = {
  orgs: FALLBACK_ORGS,
  pets: FALLBACK_PETS
};
