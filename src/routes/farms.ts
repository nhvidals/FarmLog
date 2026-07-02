import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { FarmModel } from "../models/Farm";
import { FarmMembershipModel } from "../models/FarmMembership";
import { UserModel } from "../models/User";
import { AnimalModel } from "../models/Animal";
import { AnimalTypeModel } from "../models/AnimalType";
import { HealthEventModel } from "../models/HealthEvent";
import { IncubationBatchModel } from "../models/IncubationBatch";
import { LogEntryModel } from "../models/LogEntry";
import { MedicationScheduleModel } from "../models/MedicationSchedule";
import { serverError } from "../utils/http";
import { resolveFarmRole } from "../utils/farmAccess";
import { ASSIGNABLE_FARM_ROLES, type AssignableFarmRole, type FarmRole } from "../types/domain";

export const farmsRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isAssignableRole = (value: unknown): value is AssignableFarmRole =>
  typeof value === "string" && (ASSIGNABLE_FARM_ROLES as readonly string[]).includes(value);

farmsRouter.get("/", async (req, res) => {
  try {
    // Farms the caller owns, plus farms they've been added to as a member.
    const memberships = await FarmMembershipModel.find({ userId: req.userId }).lean();
    const roleByFarm = new Map<string, FarmRole>(memberships.map((m) => [String(m.farmId), m.role]));

    const farms = await FarmModel.find({
      $or: [{ ownerId: req.userId }, { _id: { $in: memberships.map((m) => m.farmId) } }]
    })
      .sort({ createdAt: -1 })
      .lean();

    // Annotate each farm with the caller's role so the client can gate actions.
    const withRole = farms.map((farm) => ({
      ...farm,
      role: (String(farm.ownerId) === String(req.userId)
        ? "owner"
        : roleByFarm.get(String(farm._id))) as FarmRole | undefined,
    }));

    return res.json(withRole);
  } catch (error) {
    return serverError(res);
  }
});

farmsRouter.post("/", async (req, res) => {
  try {
    const created = await FarmModel.create({
      ownerId: req.userId,
      name: req.body?.name,
      location: req.body?.location
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid farm payload" });
  }
});

farmsRouter.delete("/:id", async (req, res) => {
  try {
    // Only the owner may delete a farm.
    const farm = await FarmModel.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const farmId = req.params.id;
    await Promise.all([
      AnimalModel.deleteMany({ farmId }),
      AnimalTypeModel.deleteMany({ farmId }),
      IncubationBatchModel.deleteMany({ farmId }),
      MedicationScheduleModel.deleteMany({ farmId }),
      HealthEventModel.deleteMany({ farmId }),
      LogEntryModel.deleteMany({ farmId }),
      FarmMembershipModel.deleteMany({ farmId }),
    ]);

    return res.status(204).send();
  } catch (error) {
    return serverError(res);
  }
});

// ── Member management ───────────────────────────────────────────────────────

/** Any member may view the roster; only the owner may change it. */
farmsRouter.get("/:id/members", async (req, res) => {
  const farmId = req.params.id;
  if (!isValidObjectId(farmId)) return res.status(400).json({ message: "farmId is not a valid id" });

  try {
    const role = await resolveFarmRole(req.userId as string, farmId);
    if (!role) return res.status(404).json({ message: "Farm not found" });

    const farm = await FarmModel.findById(farmId).select("ownerId").lean();
    const owner = farm ? await UserModel.findById(farm.ownerId).select("email").lean() : null;

    const memberships = await FarmMembershipModel.find({ farmId })
      .populate<{ userId: { _id: unknown; email: string } }>("userId", "email")
      .lean();

    const members = [
      ...(owner ? [{ userId: String(farm!.ownerId), email: owner.email, role: "owner" as const }] : []),
      ...memberships.map((m) => ({
        userId: String((m.userId as { _id: unknown })._id),
        email: (m.userId as { email: string }).email,
        role: m.role,
      })),
    ];

    return res.json(members);
  } catch (error) {
    return serverError(res);
  }
});

/** Owner-only: add an existing user (by email) as a member. */
farmsRouter.post("/:id/members", async (req, res) => {
  const farmId = req.params.id;
  if (!isValidObjectId(farmId)) return res.status(400).json({ message: "farmId is not a valid id" });

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const role = req.body?.role;
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "A valid email is required" });
  if (!isAssignableRole(role)) return res.status(400).json({ message: "role must be worker or vet" });

  try {
    const farm = await FarmModel.findOne({ _id: farmId, ownerId: req.userId }).select("ownerId").lean();
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const user = await UserModel.findOne({ email }).select("_id").lean();
    if (!user) return res.status(404).json({ message: "No user with that email" });
    if (String(user._id) === String(farm.ownerId)) {
      return res.status(400).json({ message: "The owner is already a member" });
    }

    const membership = await FarmMembershipModel.findOneAndUpdate(
      { farmId, userId: user._id },
      { role },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    return res.status(201).json({ userId: String(user._id), email, role: membership.role });
  } catch (error) {
    return serverError(res);
  }
});

/** Owner-only: change a member's role. */
farmsRouter.put("/:id/members/:userId", async (req, res) => {
  const { id: farmId, userId } = req.params;
  if (!isValidObjectId(farmId) || !isValidObjectId(userId)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  const role = req.body?.role;
  if (!isAssignableRole(role)) return res.status(400).json({ message: "role must be worker or vet" });

  try {
    const owns = await FarmModel.exists({ _id: farmId, ownerId: req.userId });
    if (!owns) return res.status(404).json({ message: "Farm not found" });

    const updated = await FarmMembershipModel.findOneAndUpdate(
      { farmId, userId },
      { role },
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ message: "Member not found" });
    return res.json({ userId, role: updated.role });
  } catch (error) {
    return serverError(res);
  }
});

/** Owner-only: remove a member. */
farmsRouter.delete("/:id/members/:userId", async (req, res) => {
  const { id: farmId, userId } = req.params;
  if (!isValidObjectId(farmId) || !isValidObjectId(userId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const owns = await FarmModel.exists({ _id: farmId, ownerId: req.userId });
    if (!owns) return res.status(404).json({ message: "Farm not found" });

    const deleted = await FarmMembershipModel.findOneAndDelete({ farmId, userId });
    if (!deleted) return res.status(404).json({ message: "Member not found" });
    return res.status(204).send();
  } catch (error) {
    return serverError(res);
  }
});
