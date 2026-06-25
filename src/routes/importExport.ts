import { Router } from "express";
import { AnimalModel } from "../models/Animal";
import { AnimalTypeModel } from "../models/AnimalType";
import { IncubationBatchModel } from "../models/IncubationBatch";
import { MedicationScheduleModel } from "../models/MedicationSchedule";
import { getFarmIdFromRequest } from "../utils/farmContext";
import { serverError, stripImmutableFields } from "../utils/http";

export const importExportRouter = Router();

function isValidDateValue(value: unknown): boolean {
  if (typeof value !== "string" && !(value instanceof Date) && typeof value !== "number") {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

importExportRouter.get("/export", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const [animalTypes, animals, incubation, medication] = await Promise.all([
      AnimalTypeModel.find({ farmId }).lean(),
      AnimalModel.find({ farmId }).lean(),
      IncubationBatchModel.find({ farmId }).lean(),
      MedicationScheduleModel.find({ farmId }).lean()
    ]);

    return res.json({ exportedAt: new Date().toISOString(), farmId, animalTypes, animals, incubation, medication });
  } catch (error) {
    return serverError(res);
  }
});

importExportRouter.post("/import", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const payload = req.body as {
    animalTypes?: unknown[];
    animals?: unknown[];
    incubation?: unknown[];
    medication?: unknown[];
  };

  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ message: "Invalid import payload" });
  }

  const strip = (entry: unknown) => ({ ...stripImmutableFields(entry), farmId });

  const animalTypes = Array.isArray(payload.animalTypes) ? payload.animalTypes.map(strip) : [];
  const animals = Array.isArray(payload.animals) ? payload.animals.map(strip) : [];
  const incubation = Array.isArray(payload.incubation) ? payload.incubation.map(strip) : [];
  const medication = Array.isArray(payload.medication) ? payload.medication.map(strip) : [];

  const hasInvalidAnimalDates = animals.some((entry) => !isValidDateValue((entry as { birthDate?: unknown }).birthDate));
  const hasInvalidIncubationDates = incubation.some((entry) => {
    const data = entry as { startDate?: unknown; expectedHatchDate?: unknown };
    return !isValidDateValue(data.startDate) || !isValidDateValue(data.expectedHatchDate);
  });
  const hasInvalidMedicationDates = medication.some((entry) => !isValidDateValue((entry as { date?: unknown }).date));

  if (hasInvalidAnimalDates || hasInvalidIncubationDates || hasInvalidMedicationDates) {
    return res.status(400).json({ message: "Invalid import payload" });
  }

  try {
    await Promise.all([
      animalTypes.length > 0 ? AnimalTypeModel.insertMany(animalTypes, { ordered: false }) : Promise.resolve(),
      animals.length > 0 ? AnimalModel.insertMany(animals, { ordered: false }) : Promise.resolve(),
      incubation.length > 0 ? IncubationBatchModel.insertMany(incubation, { ordered: false }) : Promise.resolve(),
      medication.length > 0 ? MedicationScheduleModel.insertMany(medication, { ordered: false }) : Promise.resolve()
    ]);
  } catch (error) {
    return res.status(400).json({ message: "Import failed" });
  }

  return res.status(201).json({
    imported: {
      animalTypes: animalTypes.length,
      animals: animals.length,
      incubation: incubation.length,
      medication: medication.length
    }
  });
});
