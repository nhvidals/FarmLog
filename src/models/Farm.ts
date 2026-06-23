import { Schema, model, Types } from "mongoose";

export interface Farm {
  _id: Types.ObjectId;
  name: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const farmSchema = new Schema<Farm>(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true }
  },
  { timestamps: true }
);

export const FarmModel = model<Farm>("Farm", farmSchema);
