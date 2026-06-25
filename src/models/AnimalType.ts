import { Schema, model, Types } from "mongoose";
import type { AnimalCategory } from "../types/domain";

export interface AnimalType {
  _id: Types.ObjectId;
  farmId: Types.ObjectId;
  name: string;
  category: AnimalCategory;
  createdAt: Date;
  updatedAt: Date;
}

const animalTypeSchema = new Schema<AnimalType>(
  {
    farmId: { type: Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ["oviparous", "viviparous"], required: true }
  },
  { timestamps: true }
);

animalTypeSchema.index({ farmId: 1, name: 1 }, { unique: true });

export const AnimalTypeModel = model<AnimalType>("AnimalType", animalTypeSchema);
