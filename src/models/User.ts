import { Schema, model, Types } from "mongoose";

export interface User {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

export const UserModel = model<User>("User", userSchema);
