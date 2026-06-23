import { Router } from "express";
import { IncubationBatchModel } from "../models/IncubationBatch";
import { getFarmIdFromRequest } from "../utils/farmContext";

export const incubationRouter = Router();

incubationRouter.get("/", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const batches = await IncubationBatchModel.find({ farmId }).sort({ startDate: -1 }).lean();
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

incubationRouter.post("/", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const created = await IncubationBatchModel.create({ ...req.body, farmId });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid incubation payload", error });
  }
});

incubationRouter.put("/:id", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const { _id, farmId: _farmId, createdAt, updatedAt, ...safeBody } = req.body;

  try {
    const updated = await IncubationBatchModel.findOneAndUpdate(
      { _id: req.params.id, farmId },
      safeBody,
      { returnDocument: "after", runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Batch not found" });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: "Invalid update payload", error });
  }
});

incubationRouter.delete("/:id", async (req, res) => {
  const farmId = getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const deleted = await IncubationBatchModel.findOneAndDelete({ _id: req.params.id, farmId });
    if (!deleted) return res.status(404).json({ message: "Batch not found" });
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ message: "Batch not found" });
  }
});
