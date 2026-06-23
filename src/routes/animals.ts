import { Router } from "express";
import mongoose from "mongoose";
import { AnimalModel } from "../models/Animal";
import { getFarmIdFromRequest } from "../utils/farmContext";

export const animalsRouter = Router();

animalsRouter.get("/", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const animals = await AnimalModel.find({ farmId }).sort({ createdAt: -1 }).lean();
    res.json(animals);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

animalsRouter.get("/:id", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
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
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const created = await AnimalModel.create({ ...req.body, farmId });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid animal payload", error });
  }
});

animalsRouter.put("/:id", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const { _id, farmId: _farmId, createdAt, updatedAt, ...safeBody } = req.body;

  try {
    const updated = await AnimalModel.findOneAndUpdate(
      { _id: req.params.id, farmId },
      safeBody,
      { returnDocument: "after", runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Animal not found" });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: "Invalid update payload", error });
  }
});

animalsRouter.delete("/:id", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
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
  const farmId = getFarmIdFromRequest(req, res);
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
    const tree = await buildTree(req.params.id);
    if (!tree) return res.status(404).json({ message: "Animal not found" });
    return res.json(tree);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});
