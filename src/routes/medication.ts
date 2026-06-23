import { Router } from "express";
import { AnimalModel } from "../models/Animal";
import { MedicationScheduleModel } from "../models/MedicationSchedule";
import { getFarmIdFromRequest } from "../utils/farmContext";

export const medicationRouter = Router();

medicationRouter.get("/", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const entries = await MedicationScheduleModel.find({ farmId })
      .populate("animalId", "name designation category ringNumber")
      .sort({ date: 1 })
      .lean();
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

medicationRouter.post("/", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const animal = await AnimalModel.findOne({ _id: req.body?.animalId, farmId }).lean();
    if (!animal) return res.status(400).json({ message: "Animal does not exist in this farm" });

    const created = await MedicationScheduleModel.create({ ...req.body, farmId });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid medication payload", error });
  }
});

medicationRouter.put("/:id", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const { _id, farmId: _farmId, createdAt, updatedAt, ...safeBody } = req.body;

  try {
    if (safeBody.animalId) {
      const animal = await AnimalModel.findOne({ _id: safeBody.animalId, farmId }).lean();
      if (!animal) return res.status(400).json({ message: "Animal does not exist in this farm" });
    }

    const updated = await MedicationScheduleModel.findOneAndUpdate(
      { _id: req.params.id, farmId },
      safeBody,
      { returnDocument: "after", runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Schedule not found" });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: "Invalid update payload", error });
  }
});

medicationRouter.delete("/:id", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const deleted = await MedicationScheduleModel.findOneAndDelete({ _id: req.params.id, farmId });
    if (!deleted) return res.status(404).json({ message: "Schedule not found" });
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ message: "Schedule not found" });
  }
});
