import { Schema, model, Types } from "mongoose";

export interface MedicationSchedule {
  _id: Types.ObjectId;
  farmId: Types.ObjectId;
  animalId: Types.ObjectId;
  medicineName: string;
  dose: string;
  date: Date;
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
    notes: { type: String }
  },
  { timestamps: true }
);

export const MedicationScheduleModel = model<MedicationSchedule>(
  "MedicationSchedule",
  medicationScheduleSchema
);
