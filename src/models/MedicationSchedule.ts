import { Schema, model, Types } from "mongoose";
import { MEDICATION_FREQUENCIES, type MedicationFrequency } from "../types/domain";

export interface MedicationSchedule {
  _id: Types.ObjectId;
  farmId: Types.ObjectId;
  animalId: Types.ObjectId;
  medicineName: string;
  dose: string;
  date: Date;
  frequency: MedicationFrequency;
  interval: number;
  endDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const medicationScheduleSchema = new Schema<MedicationSchedule>(
  {
    farmId: { type: Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    animalId: { type: Schema.Types.ObjectId, ref: "Animal", required: true },
    medicineName: { type: String, required: true, trim: true },
    dose: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    // Recurrence: "once" (default) is a single dose; otherwise repeats every
    // `interval` units of `frequency` from `date` until the optional `endDate`.
    frequency: { type: String, enum: MEDICATION_FREQUENCIES, default: "once" },
    interval: { type: Number, default: 1, min: 1 },
    endDate: { type: Date },
    notes: { type: String }
  },
  { timestamps: true }
);

export const MedicationScheduleModel = model<MedicationSchedule>(
  "MedicationSchedule",
  medicationScheduleSchema
);
