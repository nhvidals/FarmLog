import { Router } from "express";
import { AnimalTypeModel } from "../models/AnimalType";
import { getFarmIdFromRequest } from "../utils/farmContext";
import { farmExists } from "../utils/validation";

export const animalTypesRouter = Router();

animalTypesRouter.get("/", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const types = await AnimalTypeModel.find({ farmId }).sort({ name: 1 }).lean();
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

animalTypesRouter.post("/", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    if (!(await farmExists(farmId))) return res.status(404).json({ message: "Farm not found" });

    const created = await AnimalTypeModel.create({
      name: req.body?.name,
      category: req.body?.category,
      farmId
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid animal type payload", error });
  }
});

animalTypesRouter.delete("/:id", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const deleted = await AnimalTypeModel.findOneAndDelete({ _id: req.params.id, farmId });
    if (!deleted) return res.status(404).json({ message: "Animal type not found" });
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ message: "Animal type not found" });
  }
});
