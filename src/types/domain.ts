export const SEXES = ["male", "female"] as const;
export type Sex = (typeof SEXES)[number];

export const ANIMAL_CATEGORIES = ["oviparous", "viviparous"] as const;
export type AnimalCategory = (typeof ANIMAL_CATEGORIES)[number];

export const ANIMAL_STATUSES = ["active", "sold", "deceased"] as const;
export type AnimalStatus = (typeof ANIMAL_STATUSES)[number];

/**
 * Farm access roles. `owner` is implicit (the farm's creator) and has full
 * control including member management and deletion; `worker` can read and write
 * farm data; `vet` is read-only. Only `worker` and `vet` are assignable to
 * members — ownership is not transferable through the membership API.
 */
export const FARM_ROLES = ["owner", "worker", "vet"] as const;
export type FarmRole = (typeof FARM_ROLES)[number];

export const ASSIGNABLE_FARM_ROLES = ["worker", "vet"] as const;
export type AssignableFarmRole = (typeof ASSIGNABLE_FARM_ROLES)[number];

/**
 * How often a medication/treatment repeats. "once" is a single dose (the
 * default and the historical behaviour); the others repeat every `interval`
 * units from the start `date` until the optional `endDate`.
 */
export const MEDICATION_FREQUENCIES = ["once", "daily", "weekly", "monthly"] as const;
export type MedicationFrequency = (typeof MEDICATION_FREQUENCIES)[number];

/**
 * Kinds of entry in an animal's health/history timeline. `weight` carries a
 * numeric `value` (kg); the others are described by a free-text `note`.
 */
export const HEALTH_EVENT_TYPES = ["weight", "health", "breeding", "note"] as const;
export type HealthEventType = (typeof HEALTH_EVENT_TYPES)[number];
