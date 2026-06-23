import { Schema, model, Types } from "mongoose";
import type { AnimalCategory, Sex } from "../types/domain";

export interface Animal {
  _id: Types.ObjectId;
  farmId: Types.ObjectId;
  name: string;
  designation: string;
  category: AnimalCategory;
  photoUrl?: string;
  birthDate: Date;
  sex: Sex;
  ringNumber: string;
  fatherId?: Types.ObjectId;
  motherId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const animalSchema = new Schema<Animal>(
  {
    farmId: { type: Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    name: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    category: { type: String, enum: ["oviparous", "viviparous"], required: true },
    photoUrl: { type: String },
    birthDate: { type: Date, required: true },
    sex: { type: String, enum: ["male", "female"], required: true },
    ringNumber: { type: String, required: true, trim: true },
    fatherId: { type: Schema.Types.ObjectId, ref: "Animal" },
    motherId: { type: Schema.Types.ObjectId, ref: "Animal" },
    notes: { type: String }
  },
  { timestamps: true }
);

animalSchema.index({ farmId: 1, ringNumber: 1 }, { unique: true });

export const AnimalModel = model<Animal>("Animal", animalSchema);
