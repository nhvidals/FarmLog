"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importExportRouter = void 0;
const express_1 = require("express");
const Animal_1 = require("../models/Animal");
const IncubationBatch_1 = require("../models/IncubationBatch");
const MedicationSchedule_1 = require("../models/MedicationSchedule");
const farmContext_1 = require("../utils/farmContext");
exports.importExportRouter = (0, express_1.Router)();
exports.importExportRouter.get("/export", async (req, res) => {
    const farmId = (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const [animals, incubation, medication] = await Promise.all([
            Animal_1.AnimalModel.find({ farmId }).lean(),
            IncubationBatch_1.IncubationBatchModel.find({ farmId }).lean(),
            MedicationSchedule_1.MedicationScheduleModel.find({ farmId }).lean()
        ]);
        res.json({ exportedAt: new Date().toISOString(), farmId, animals, incubation, medication });
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.importExportRouter.post("/import", async (req, res) => {
    const farmId = (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
        return res.status(400).json({ message: "Invalid import payload" });
    }
    const strip = (entry) => {
        const { _id, farmId: _f, createdAt, updatedAt, ...rest } = entry;
        return { ...rest, farmId };
    };
    const animals = Array.isArray(payload.animals) ? payload.animals.map(strip) : [];
    const incubation = Array.isArray(payload.incubation) ? payload.incubation.map(strip) : [];
    const medication = Array.isArray(payload.medication) ? payload.medication.map(strip) : [];
    try {
        await Promise.all([
            animals.length > 0 ? Animal_1.AnimalModel.insertMany(animals, { ordered: false }) : Promise.resolve(),
            incubation.length > 0 ? IncubationBatch_1.IncubationBatchModel.insertMany(incubation, { ordered: false }) : Promise.resolve(),
            medication.length > 0 ? MedicationSchedule_1.MedicationScheduleModel.insertMany(medication, { ordered: false }) : Promise.resolve()
        ]);
    }
    catch (error) {
        return res.status(400).json({ message: "Import failed", error });
    }
    return res.status(201).json({
        imported: { animals: animals.length, incubation: incubation.length, medication: medication.length }
    });
});
