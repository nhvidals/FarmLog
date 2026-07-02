import { Schema, model, Types } from "mongoose";
import { ADMIN_STATUSES, LOG_KINDS, type AdminStatus, type LogKind } from "../types/domain";

/**
 * An append-only history entry. Fields are denormalized on purpose: an entry
 * copies the medicine/animal/incubator names it needs so it survives edits or
 * deletions of the source schedule/batch. `sourceId` is a soft link back to the
 * originating record (which may no longer exist).
 */
export interface LogEntry {
  _id: Types.ObjectId;
  farmId: Types.ObjectId;
  kind: LogKind;
  date: Date;
  sourceId?: Types.ObjectId;
  note?: string;
  // medication
  animalId?: Types.ObjectId;
  animalName?: string;
  medicineName?: string;
  dose?: string;
  status?: AdminStatus;
  // incubation
  incubatorName?: string;
  species?: string;
  eggCount?: number;
  hatchedOk?: number;
  hatchedNok?: number;
  createdAt: Date;
  updatedAt: Date;
}

const logEntrySchema = new Schema<LogEntry>(
  {
    farmId: { type: Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    kind: { type: String, enum: LOG_KINDS, required: true, index: true },
    date: { type: Date, required: true },
    sourceId: { type: Schema.Types.ObjectId },
    note: { type: String, trim: true },
    animalId: { type: Schema.Types.ObjectId, ref: "Animal" },
    animalName: { type: String, trim: true },
    medicineName: { type: String, trim: true },
    dose: { type: String, trim: true },
    status: { type: String, enum: ADMIN_STATUSES },
    incubatorName: { type: String, trim: true },
    species: { type: String, trim: true },
    eggCount: { type: Number },
    hatchedOk: { type: Number },
    hatchedNok: { type: Number }
  },
  { timestamps: true }
);

export const LogEntryModel = model<LogEntry>("LogEntry", logEntrySchema);
