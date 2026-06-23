import { Router } from "express";
import { FarmModel } from "../models/Farm";
import { AnimalModel } from "../models/Animal";
import { IncubationBatchModel } from "../models/IncubationBatch";
import { MedicationScheduleModel } from "../models/MedicationSchedule";

export const farmsRouter = Router();

farmsRouter.get("/", async (_req, res) => {
  try {
    const farms = await FarmModel.find().sort({ createdAt: -1 }).lean();
    res.json(farms);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

farmsRouter.post("/", async (req, res) => {
  try {
    const created = await FarmModel.create({
      name: req.body?.name,
      location: req.body?.location
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid farm payload", error });
  }
});

farmsRouter.delete("/:id", async (req, res) => {
  try {
    const farm = await FarmModel.findByIdAndDelete(req.params.id);
    if (!farm) return res.status(404).json({ message: "Farm not found" });

    const farmId = req.params.id;
    await Promise.all([
      AnimalModel.deleteMany({ farmId }),
      IncubationBatchModel.deleteMany({ farmId }),
      MedicationScheduleModel.deleteMany({ farmId }),
    ]);

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});
