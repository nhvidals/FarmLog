export const SEXES = ["male", "female"] as const;
export type Sex = (typeof SEXES)[number];

export const ANIMAL_CATEGORIES = ["oviparous", "viviparous"] as const;
export type AnimalCategory = (typeof ANIMAL_CATEGORIES)[number];

export const ANIMAL_STATUSES = ["active", "sold", "deceased"] as const;
export type AnimalStatus = (typeof ANIMAL_STATUSES)[number];

export const FARM_ROLES = ["owner", "worker", "vet"] as const;
export type FarmRole = (typeof FARM_ROLES)[number];

export const ASSIGNABLE_FARM_ROLES = ["worker", "vet"] as const;
export type AssignableFarmRole = (typeof ASSIGNABLE_FARM_ROLES)[number];

export const MEDICATION_FREQUENCIES = ["once", "daily", "weekly", "monthly"] as const;
export type MedicationFrequency = (typeof MEDICATION_FREQUENCIES)[number];

export const HEALTH_EVENT_TYPES = ["weight", "health", "breeding", "note"] as const;
export type HealthEventType = (typeof HEALTH_EVENT_TYPES)[number];

export const LOG_KINDS = ["medication", "incubation"] as const;
export type LogKind = (typeof LOG_KINDS)[number];

export const ADMIN_STATUSES = ["given", "skipped"] as const;
export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export interface LogEntry {
  _id: string;
  farmId: string;
  kind: LogKind;
  date: string;
  sourceId?: string;
  note?: string;
  animalId?: string;
  animalName?: string;
  medicineName?: string;
  dose?: string;
  status?: AdminStatus;
  incubatorName?: string;
  species?: string;
  eggCount?: number;
  hatchedOk?: number;
  hatchedNok?: number;
}

export interface HealthEvent {
  _id: string;
  farmId: string;
  animalId: string;
  type: HealthEventType;
  date: string;
  value?: number;
  note?: string;
}

export interface Farm {
  _id: string;
  name: string;
  location?: string;
  role?: FarmRole;
}

export interface FarmMember {
  userId: string;
  email: string;
  role: FarmRole;
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
  status?: AnimalStatus;
  statusDate?: string;
  statusReason?: string;
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
  frequency?: MedicationFrequency;
  interval?: number;
  endDate?: string;
  notes?: string;
}
