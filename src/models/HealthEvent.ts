import { Schema, model, Types } from "mongoose";
import { HEALTH_EVENT_TYPES, type HealthEventType } from "../types/domain";

/**
 * A single entry in an animal's health/history timeline. `weight` events carry a
 * numeric `value` (kg); the others use `note` for a description.
 */
export interface HealthEvent {
  _id: Types.ObjectId;
  farmId: Types.ObjectId;
  animalId: Types.ObjectId;
  type: HealthEventType;
  date: Date;
  value?: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const healthEventSchema = new Schema<HealthEvent>(
  {
    farmId: { type: Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    animalId: { type: Schema.Types.ObjectId, ref: "Animal", required: true, index: true },
    type: { type: String, enum: HEALTH_EVENT_TYPES, required: true },
    date: { type: Date, required: true },
    value: { type: Number },
    note: { type: String, trim: true }
  },
  { timestamps: true }
);

export const HealthEventModel = model<HealthEvent>("HealthEvent", healthEventSchema);
