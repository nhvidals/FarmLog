import { FarmModel } from "../models/Farm";
import { FarmMembershipModel } from "../models/FarmMembership";
import type { FarmRole } from "../types/domain";

/**
 * Resolves a user's role on a farm, or null when they have no access.
 * Ownership (Farm.ownerId) takes precedence and is treated as the "owner" role
 * without needing a membership row — so farms created before memberships
 * existed keep working. Otherwise the role comes from a FarmMembership.
 */
export async function resolveFarmRole(userId: string, farmId: string): Promise<FarmRole | null> {
  const farm = await FarmModel.findById(farmId).select("ownerId").lean();
  if (!farm) return null;
  if (String(farm.ownerId) === String(userId)) return "owner";

  const membership = await FarmMembershipModel.findOne({ farmId, userId }).select("role").lean();
  return membership?.role ?? null;
}

/** Roles allowed to modify farm data (create/update/delete records). */
export function roleCanWrite(role: FarmRole): boolean {
  return role === "owner" || role === "worker";
}

/** Roles allowed to manage members and delete the farm. */
export function roleCanManage(role: FarmRole): boolean {
  return role === "owner";
}
