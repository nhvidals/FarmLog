import { Router } from "express";
import { AnimalModel } from "../models/Animal";
import { IncubationBatchModel } from "../models/IncubationBatch";
import { MedicationScheduleModel } from "../models/MedicationSchedule";
import { getFarmIdFromRequest } from "../utils/farmContext";

export const importExportRouter = Router();

importExportRouter.get("/export", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const [animals, incubation, medication] = await Promise.all([
      AnimalModel.find({ farmId }).lean(),
      IncubationBatchModel.find({ farmId }).lean(),
      MedicationScheduleModel.find({ farmId }).lean()
    ]);

    res.json({ exportedAt: new Date().toISOString(), farmId, animals, incubation, medication });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

importExportRouter.post("/import", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const payload = req.body as {
    animals?: unknown[];
    incubation?: unknown[];
    medication?: unknown[];
  };

  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ message: "Invalid import payload" });
  }

  const strip = (entry: unknown) => {
    const { _id, farmId: _f, createdAt, updatedAt, ...rest } = entry as Record<string, unknown>;
    return { ...rest, farmId };
  };

  const animals = Array.isArray(payload.animals) ? payload.animals.map(strip) : [];
  const incubation = Array.isArray(payload.incubation) ? payload.incubation.map(strip) : [];
  const medication = Array.isArray(payload.medication) ? payload.medication.map(strip) : [];

  try {
    await Promise.all([
      animals.length > 0 ? AnimalModel.insertMany(animals, { ordered: false }) : Promise.resolve(),
      incubation.length > 0 ? IncubationBatchModel.insertMany(incubation, { ordered: false }) : Promise.resolve(),
      medication.length > 0 ? MedicationScheduleModel.insertMany(medication, { ordered: false }) : Promise.resolve()
    ]);
  } catch (error) {
    return res.status(400).json({ message: "Import failed", error });
  }

  return res.status(201).json({
    imported: { animals: animals.length, incubation: incubation.length, medication: medication.length }
  });
});
