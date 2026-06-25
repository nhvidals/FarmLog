import { Schema, model, Types } from "mongoose";

export interface IncubationBatch {
  _id: Types.ObjectId;
  farmId: Types.ObjectId;
  species: string;
  eggCount: number;
  incubatorName: string;
  startDate: Date;
  expectedHatchDate: Date;
  hatchedOk?: number;
  hatchedNok?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const incubationBatchSchema = new Schema<IncubationBatch>(
  {
    farmId: { type: Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    species: { type: String, required: true, trim: true },
    eggCount: { type: Number, required: true, min: 1 },
    incubatorName: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    expectedHatchDate: { type: Date, required: true },
    hatchedOk: { type: Number, min: 0 },
    hatchedNok: { type: Number, min: 0 },
    notes: { type: String }
  },
  { timestamps: true }
);

export const IncubationBatchModel = model<IncubationBatch>(
  "IncubationBatch",
  incubationBatchSchema
);
