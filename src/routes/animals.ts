import { Router } from "express";
import mongoose from "mongoose";
import { AnimalModel } from "../models/Animal";
import { getFarmIdFromRequest } from "../utils/farmContext";
import { serverError, stripImmutableFields } from "../utils/http";
import { farmExists, validateAnimalParents } from "../utils/validation";

export const animalsRouter = Router();

animalsRouter.get("/", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const animals = await AnimalModel.find({ farmId }).sort({ createdAt: -1 }).lean();
    return res.json(animals);
  } catch (error) {
    return serverError(res);
  }
});

animalsRouter.get("/:id", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const animal = await AnimalModel.findOne({ _id: req.params.id, farmId }).lean();
    if (!animal) return res.status(404).json({ message: "Animal not found" });
    return res.json(animal);
  } catch (error) {
    return res.status(404).json({ message: "Animal not found" });
  }
});

animalsRouter.post("/", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    if (!(await farmExists(farmId))) return res.status(404).json({ message: "Farm not found" });

    const { fatherId, motherId, ...rest } = req.body ?? {};
    const parents = await validateAnimalParents({ fatherId, motherId }, farmId, undefined, rest.designation);

    const created = await AnimalModel.create({ ...rest, ...parents.resolved, farmId });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid animal payload" });
  }
});

animalsRouter.put("/:id", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const { fatherId, motherId, ...rest } = stripImmutableFields(req.body);

  try {
    // The offspring's type may come from the update body, or fall back to the
    // stored designation when only the parents are being changed.
    let childDesignation = rest.designation as string | undefined;
    if ((fatherId || motherId) && childDesignation === undefined) {
      const existing = await AnimalModel.findOne({ _id: req.params.id, farmId }).lean();
      childDesignation = existing?.designation;
    }

    const parents = await validateAnimalParents({ fatherId, motherId }, farmId, req.params.id, childDesignation);

    const safeBody = { ...rest, ...parents.resolved };
    const updated = await AnimalModel.findOneAndUpdate(
      { _id: req.params.id, farmId },
      safeBody,
      { returnDocument: "after", runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Animal not found" });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: "Invalid update payload" });
  }
});

animalsRouter.delete("/:id", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const deleted = await AnimalModel.findOneAndDelete({ _id: req.params.id, farmId });
    if (!deleted) return res.status(404).json({ message: "Animal not found" });
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ message: "Animal not found" });
  }
});

animalsRouter.get("/:id/tree", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const visited = new Set<string>();

  async function buildTree(animalId: string, depth = 0): Promise<unknown> {
    if (!mongoose.isValidObjectId(animalId) || visited.has(animalId) || depth > 4) {
      return null;
    }

    visited.add(animalId);
    const animal = await AnimalModel.findOne({ _id: animalId, farmId }).lean();
    if (!animal) return null;

    const [father, mother] = await Promise.all([
      animal.fatherId ? buildTree(String(animal.fatherId), depth + 1) : Promise.resolve(null),
      animal.motherId ? buildTree(String(animal.motherId), depth + 1) : Promise.resolve(null)
    ]);

    return { ...animal, father, mother };
  }

  try {
    // The root may be given as an ObjectId or as a ring number (anilha).
    let rootId = req.params.id;
    if (!mongoose.isValidObjectId(rootId)) {
      const byRing = await AnimalModel.findOne({ farmId, ringNumber: rootId }).lean();
      if (!byRing) return res.status(404).json({ message: "Animal not found" });
      rootId = String(byRing._id);
    }

    const tree = await buildTree(rootId);
    if (!tree) return res.status(404).json({ message: "Animal not found" });
    return res.json(tree);
  } catch (error) {
    return serverError(res);
  }
});
