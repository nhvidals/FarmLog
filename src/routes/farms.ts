import { Router } from "express";
import { FarmModel } from "../models/Farm";
import { AnimalModel } from "../models/Animal";
import { AnimalTypeModel } from "../models/AnimalType";
import { IncubationBatchModel } from "../models/IncubationBatch";
import { MedicationScheduleModel } from "../models/MedicationSchedule";
import { serverError } from "../utils/http";

export const farmsRouter = Router();

farmsRouter.get("/", async (req, res) => {
  try {
    const farms = await FarmModel.find({ ownerId: req.userId }).sort({ createdAt: -1 }).lean();
    return res.json(farms);
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
    const farm = await FarmModel.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const farmId = req.params.id;
    await Promise.all([
      AnimalModel.deleteMany({ farmId }),
      AnimalTypeModel.deleteMany({ farmId }),
      IncubationBatchModel.deleteMany({ farmId }),
      MedicationScheduleModel.deleteMany({ farmId }),
    ]);

    return res.status(204).send();
  } catch (error) {
    return serverError(res);
  }
});
