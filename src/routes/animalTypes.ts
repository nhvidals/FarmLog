import { Router } from "express";
import { AnimalTypeModel } from "../models/AnimalType";
import { getFarmIdFromRequest } from "../utils/farmContext";
import { serverError } from "../utils/http";

export const animalTypesRouter = Router();

animalTypesRouter.get("/", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const types = await AnimalTypeModel.find({ farmId }).sort({ name: 1 }).lean();
    return res.json(types);
  } catch (error) {
    return serverError(res);
  }
});

animalTypesRouter.post("/", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const created = await AnimalTypeModel.create({
      name: req.body?.name,
      category: req.body?.category,
      farmId
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid animal type payload" });
  }
});

animalTypesRouter.delete("/:id", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const deleted = await AnimalTypeModel.findOneAndDelete({ _id: req.params.id, farmId });
    if (!deleted) return res.status(404).json({ message: "Animal type not found" });
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ message: "Animal type not found" });
  }
});
