import { Types } from "mongoose";
import { AnimalModel } from "../models/Animal";

export type ValidationError = { message: string };

export type ParentResolution = {
  /** Resolved parent object ids, keyed only for parents that were provided. */
  resolved: { fatherId?: Types.ObjectId; motherId?: Types.ObjectId };
};

/**
 * Validates and resolves the optional father / mother references on an animal
 * payload. Parents are referenced by ring number (anilha) — the farm-unique,
 * user-chosen identifier. Parent fields are optional; when a provided value is
 * invalid (missing animal, wrong sex, self-reference), it is ignored.
 *
 * Returns only successfully resolved parent ObjectIds (used internally as the
 * stored relationship).
 */
export async function validateAnimalParents(
  body: { fatherId?: unknown; motherId?: unknown },
  farmId: string,
  selfId?: string,
  childDesignation?: string
): Promise<ParentResolution> {
  const parents = [
    { field: "fatherId" as const, sex: "male" as const },
    { field: "motherId" as const, sex: "female" as const },
  ];
  const resolved: { fatherId?: Types.ObjectId; motherId?: Types.ObjectId } = {};

  for (const { field, sex } of parents) {
    const raw = body[field];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    const ringNumber = String(raw).trim();

    const parent = await AnimalModel.findOne({ farmId, ringNumber }).lean();
    if (!parent) continue;
    if (selfId && String(parent._id) === selfId) continue;
    if (parent.sex !== sex) continue;
    // Parents must be the same type (designation) as the offspring — no links
    // between animals of different types.
    if (childDesignation && parent.designation !== childDesignation) continue;
    resolved[field] = parent._id as Types.ObjectId;
  }

  return { resolved };
}

/**
 * Validates that an incubation batch's expected hatch date is not before its
 * start date. Invalid/missing dates are ignored here and left to schema
 * validation. Returns null when valid, or a ValidationError otherwise.
 */
export function validateHatchOrder(
  startDate: unknown,
  expectedHatchDate: unknown
): ValidationError | null {
  const start = new Date(startDate as string);
  const hatch = new Date(expectedHatchDate as string);
  if (Number.isNaN(start.getTime()) || Number.isNaN(hatch.getTime())) {
    return null;
  }
  if (hatch.getTime() < start.getTime()) {
    return { message: "expectedHatchDate cannot be before startDate" };
  }
  return null;
}
