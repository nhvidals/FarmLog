import { Router } from "express";
import { AnimalModel } from "../models/Animal";
import { MedicationScheduleModel } from "../models/MedicationSchedule";
import { getFarmIdFromRequest } from "../utils/farmContext";
import { serverError, stripImmutableFields } from "../utils/http";
import { validateRecurrenceRange } from "../utils/validation";

export const medicationRouter = Router();

medicationRouter.get("/", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const entries = await MedicationScheduleModel.find({ farmId })
      .populate("animalId", "name designation ringNumber")
      .sort({ date: 1 })
      .lean();
    return res.json(entries);
  } catch (error) {
    return serverError(res);
  }
});

medicationRouter.post("/", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const animal = await AnimalModel.findOne({ _id: req.body?.animalId, farmId }).lean();
    if (!animal) return res.status(400).json({ message: "Animal does not exist in this farm" });

    const recurrenceError = validateRecurrenceRange(req.body?.date, req.body?.endDate);
    if (recurrenceError) return res.status(400).json({ message: recurrenceError.message });

    const created = await MedicationScheduleModel.create({ ...req.body, farmId });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid medication payload" });
  }
});

medicationRouter.put("/:id", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const safeBody = stripImmutableFields(req.body);

  try {
    if (safeBody.animalId) {
      const animal = await AnimalModel.findOne({ _id: safeBody.animalId, farmId }).lean();
      if (!animal) return res.status(400).json({ message: "Animal does not exist in this farm" });
    }

    // Validate the recurrence range against the effective start date (the one
    // in the update, or the stored one when only endDate is being changed).
    if (safeBody.endDate !== undefined) {
      let startDate = safeBody.date;
      if (startDate === undefined) {
        const existing = await MedicationScheduleModel.findOne({ _id: req.params.id, farmId }).select("date").lean();
        startDate = existing?.date;
      }
      const recurrenceError = validateRecurrenceRange(startDate, safeBody.endDate);
      if (recurrenceError) return res.status(400).json({ message: recurrenceError.message });
    }

    const updated = await MedicationScheduleModel.findOneAndUpdate(
      { _id: req.params.id, farmId },
      safeBody,
      { returnDocument: "after", runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Schedule not found" });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: "Invalid update payload" });
  }
});

medicationRouter.delete("/:id", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const deleted = await MedicationScheduleModel.findOneAndDelete({ _id: req.params.id, farmId });
    if (!deleted) return res.status(404).json({ message: "Schedule not found" });
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ message: "Schedule not found" });
  }
});
