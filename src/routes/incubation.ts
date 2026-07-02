import { Router } from "express";
import { IncubationBatchModel } from "../models/IncubationBatch";
import { LogEntryModel } from "../models/LogEntry";
import { getFarmIdFromRequest } from "../utils/farmContext";
import { serverError, stripImmutableFields } from "../utils/http";
import { validateHatchOrder } from "../utils/validation";

export const incubationRouter = Router();

incubationRouter.get("/", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const batches = await IncubationBatchModel.find({ farmId }).sort({ startDate: -1 }).lean();
    return res.json(batches);
  } catch (error) {
    return serverError(res);
  }
});

incubationRouter.post("/", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const dateError = validateHatchOrder(req.body?.startDate, req.body?.expectedHatchDate);
    if (dateError) return res.status(400).json({ message: dateError.message });

    const created = await IncubationBatchModel.create({ ...req.body, farmId });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid incubation payload" });
  }
});

incubationRouter.put("/:id", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const safeBody = stripImmutableFields(req.body);

  try {
    if (safeBody.startDate !== undefined || safeBody.expectedHatchDate !== undefined) {
      const existing = await IncubationBatchModel.findOne({ _id: req.params.id, farmId }).lean();
      if (existing) {
        const start = safeBody.startDate ?? existing.startDate;
        const hatch = safeBody.expectedHatchDate ?? existing.expectedHatchDate;
        const dateError = validateHatchOrder(start, hatch);
        if (dateError) return res.status(400).json({ message: dateError.message });
      }
    }

    const updated = await IncubationBatchModel.findOneAndUpdate(
      { _id: req.params.id, farmId },
      safeBody,
      { returnDocument: "after", runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Batch not found" });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: "Invalid update payload" });
  }
});

incubationRouter.delete("/:id", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const deleted = await IncubationBatchModel.findOneAndDelete({ _id: req.params.id, farmId });
    if (!deleted) return res.status(404).json({ message: "Batch not found" });

    // Archive a completed batch's outcome to the append-only log so results are
    // never lost when the batch is removed.
    if (deleted.hatchedOk !== undefined || deleted.hatchedNok !== undefined) {
      await LogEntryModel.create({
        farmId,
        kind: "incubation",
        date: deleted.expectedHatchDate,
        sourceId: deleted._id,
        incubatorName: deleted.incubatorName,
        species: deleted.species,
        eggCount: deleted.eggCount,
        hatchedOk: deleted.hatchedOk,
        hatchedNok: deleted.hatchedNok
      });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ message: "Batch not found" });
  }
});
