export const SEXES = ["male", "female"] as const;
export type Sex = (typeof SEXES)[number];

export const ANIMAL_CATEGORIES = ["oviparous", "viviparous"] as const;
export type AnimalCategory = (typeof ANIMAL_CATEGORIES)[number];
