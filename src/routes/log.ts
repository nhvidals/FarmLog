import { Router } from "express";
import { LogEntryModel } from "../models/LogEntry";
import { getFarmIdFromRequest } from "../utils/farmContext";
import { serverError } from "../utils/http";
import { ADMIN_STATUSES, LOG_KINDS } from "../types/domain";

export const logRouter = Router();

logRouter.get("/", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const filter: Record<string, unknown> = { farmId };
  const kind = req.query.kind;
  if (typeof kind === "string" && (LOG_KINDS as readonly string[]).includes(kind)) {
    filter.kind = kind;
  }

  try {
    const entries = await LogEntryModel.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    return res.json(entries);
  } catch (error) {
    return serverError(res);
  }
});

logRouter.post("/", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  const b = req.body ?? {};
  if (!(LOG_KINDS as readonly string[]).includes(b.kind)) {
    return res.status(400).json({ message: "Invalid log kind" });
  }
  if (!b.date) {
    return res.status(400).json({ message: "date is required" });
  }
  if (b.kind === "medication" && !(ADMIN_STATUSES as readonly string[]).includes(b.status)) {
    return res.status(400).json({ message: "status must be given or skipped" });
  }

  try {
    // Whitelist the fields a client may set (farmId comes from the request).
    const created = await LogEntryModel.create({
      farmId,
      kind: b.kind,
      date: b.date,
      sourceId: b.sourceId,
      note: b.note,
      animalId: b.animalId,
      animalName: b.animalName,
      medicineName: b.medicineName,
      dose: b.dose,
      status: b.status,
      incubatorName: b.incubatorName,
      species: b.species,
      eggCount: b.eggCount,
      hatchedOk: b.hatchedOk,
      hatchedNok: b.hatchedNok
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: "Invalid log payload" });
  }
});

logRouter.delete("/:id", async (req, res) => {
  const farmId = await getFarmIdFromRequest(req, res);
  if (!farmId) return;

  try {
    const deleted = await LogEntryModel.findOneAndDelete({ _id: req.params.id, farmId });
    if (!deleted) return res.status(404).json({ message: "Log entry not found" });
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ message: "Log entry not found" });
  }
});
