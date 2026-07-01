import { Schema, model, Types } from "mongoose";
import { ASSIGNABLE_FARM_ROLES, type AssignableFarmRole } from "../types/domain";

/**
 * A membership grants a non-owner user access to a farm with a specific role.
 * The farm's owner is never represented here — ownership lives on `Farm.ownerId`
 * and is resolved implicitly (see `resolveFarmRole`).
 */
export interface FarmMembership {
  _id: Types.ObjectId;
  farmId: Types.ObjectId;
  userId: Types.ObjectId;
  role: AssignableFarmRole;
  createdAt: Date;
  updatedAt: Date;
}

const farmMembershipSchema = new Schema<FarmMembership>(
  {
    farmId: { type: Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ASSIGNABLE_FARM_ROLES, required: true }
  },
  { timestamps: true }
);

// A user has at most one membership per farm.
farmMembershipSchema.index({ farmId: 1, userId: 1 }, { unique: true });

export const FarmMembershipModel = model<FarmMembership>("FarmMembership", farmMembershipSchema);
