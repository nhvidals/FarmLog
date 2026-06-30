export const SEXES = ["male", "female"] as const;
export type Sex = (typeof SEXES)[number];

export const ANIMAL_CATEGORIES = ["oviparous", "viviparous"] as const;
export type AnimalCategory = (typeof ANIMAL_CATEGORIES)[number];

export interface Farm {
  _id: string;
  name: string;
  location?: string;
}

export interface AnimalType {
  _id: string;
  farmId: string;
  name: string;
  category: AnimalCategory;
}

export interface Animal {
  _id: string;
  farmId: string;
  name: string;
  designation: string;
  photoUrl?: string;
  birthDate: string;
  sex: Sex;
  ringNumber: string;
  fatherId?: string;
  motherId?: string;
  notes?: string;
}

export interface IncubationBatch {
  _id: string;
  farmId: string;
  species: string;
  eggCount: number;
  incubatorName: string;
  startDate: string;
  expectedHatchDate: string;
  hatchedOk?: number;
  hatchedNok?: number;
  notes?: string;
}

export interface MedicationSchedule {
  _id: string;
  farmId: string;
  animalId: string | { _id: string; name?: string; designation?: string; ringNumber?: string };
  medicineName: string;
  dose: string;
  date: string;
  notes?: string;
}
