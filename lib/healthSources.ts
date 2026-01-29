export type SourceRef = {
  id: string;
  label: string;
  url: string;
};

const SOURCE_MAP: Record<string, SourceRef> = {
  aspca_foods: {
    id: 'aspca_foods',
    label: 'ASPCA Toxic Foods',
    url: 'https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets'
  },
  aspca_heat: {
    id: 'aspca_heat',
    label: 'ASPCA Heat Safety',
    url: 'https://www.aspca.org/pet-care/general-pet-care/hot-weather-safety-tips'
  },
  wsava_nutrition: {
    id: 'wsava_nutrition',
    label: 'WSAVA Nutrition',
    url: 'https://wsava.org/global-guidelines/global-nutrition-guidelines/'
  },
  vca_exercise_dog: {
    id: 'vca_exercise_dog',
    label: 'VCA Exercise for Dogs',
    url: 'https://vcahospitals.com/know-your-pet/exercise-for-dogs'
  },
  vca_exercise_cat: {
    id: 'vca_exercise_cat',
    label: 'VCA Exercising Cats',
    url: 'https://vcahospitals.com/know-your-pet/exercising-your-cat'
  },
  capc_parasites: {
    id: 'capc_parasites',
    label: 'CAPC Parasite Guidelines',
    url: 'https://capcvet.org/guidelines/'
  },
  rspca_grooming_dog: {
    id: 'rspca_grooming_dog',
    label: 'RSPCA Dog Grooming',
    url: 'https://www.rspca.org.uk/adviceandwelfare/pets/dogs/health/grooming'
  },
  rspca_grooming_cat: {
    id: 'rspca_grooming_cat',
    label: 'RSPCA Cat Grooming',
    url: 'https://www.rspca.org.uk/adviceandwelfare/pets/cats/health/grooming'
  },
  acvs_brachy: {
    id: 'acvs_brachy',
    label: 'ACVS Brachycephalic Syndrome',
    url: 'https://www.acvs.org/small-animal/brachycephalic-syndrome/'
  },
  vca_senior_dog: {
    id: 'vca_senior_dog',
    label: 'VCA Senior Dog Care',
    url: 'https://vcahospitals.com/know-your-pet/senior-dog-care'
  },
  vca_senior_cat: {
    id: 'vca_senior_cat',
    label: 'VCA Senior Cat Care',
    url: 'https://vcahospitals.com/know-your-pet/senior-cat-care'
  },
  icatcare_water: {
    id: 'icatcare_water',
    label: 'International Cat Care: Water',
    url: 'https://icatcare.org/advice/water-and-your-cat/'
  }
};

export const getSources = (ids: string[]): SourceRef[] =>
  ids
    .map(id => SOURCE_MAP[id])
    .filter((value): value is SourceRef => Boolean(value));
