import { Schema, model, Types } from "mongoose";

export interface Farm {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const farmSchema = new Schema<Farm>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true }
  },
  { timestamps: true }
);

export const FarmModel = model<Farm>("Farm", farmSchema);
