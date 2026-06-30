"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importExportRouter = void 0;
const express_1 = require("express");
const Animal_1 = require("../models/Animal");
const AnimalType_1 = require("../models/AnimalType");
const IncubationBatch_1 = require("../models/IncubationBatch");
const MedicationSchedule_1 = require("../models/MedicationSchedule");
const farmContext_1 = require("../utils/farmContext");
const http_1 = require("../utils/http");
exports.importExportRouter = (0, express_1.Router)();
function isValidDateValue(value) {
    if (typeof value !== "string" && !(value instanceof Date) && typeof value !== "number") {
        return false;
    }
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
}
exports.importExportRouter.get("/export", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const [animalTypes, animals, incubation, medication] = await Promise.all([
            AnimalType_1.AnimalTypeModel.find({ farmId }).lean(),
            Animal_1.AnimalModel.find({ farmId }).lean(),
            IncubationBatch_1.IncubationBatchModel.find({ farmId }).lean(),
            MedicationSchedule_1.MedicationScheduleModel.find({ farmId }).lean()
        ]);
        return res.json({ exportedAt: new Date().toISOString(), farmId, animalTypes, animals, incubation, medication });
    }
    catch (error) {
        return (0, http_1.serverError)(res);
    }
});
exports.importExportRouter.post("/import", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
        return res.status(400).json({ message: "Invalid import payload" });
    }
    const strip = (entry) => ({ ...(0, http_1.stripImmutableFields)(entry), farmId });
    const animalTypes = Array.isArray(payload.animalTypes) ? payload.animalTypes.map(strip) : [];
    const animals = Array.isArray(payload.animals) ? payload.animals.map(strip) : [];
    const incubation = Array.isArray(payload.incubation) ? payload.incubation.map(strip) : [];
    const medication = Array.isArray(payload.medication) ? payload.medication.map(strip) : [];
    const hasInvalidAnimalDates = animals.some((entry) => !isValidDateValue(entry.birthDate));
    const hasInvalidIncubationDates = incubation.some((entry) => {
        const data = entry;
        return !isValidDateValue(data.startDate) || !isValidDateValue(data.expectedHatchDate);
    });
    const hasInvalidMedicationDates = medication.some((entry) => !isValidDateValue(entry.date));
    if (hasInvalidAnimalDates || hasInvalidIncubationDates || hasInvalidMedicationDates) {
        return res.status(400).json({ message: "Invalid import payload" });
    }
    try {
        await Promise.all([
            animalTypes.length > 0 ? AnimalType_1.AnimalTypeModel.insertMany(animalTypes, { ordered: false }) : Promise.resolve(),
            animals.length > 0 ? Animal_1.AnimalModel.insertMany(animals, { ordered: false }) : Promise.resolve(),
            incubation.length > 0 ? IncubationBatch_1.IncubationBatchModel.insertMany(incubation, { ordered: false }) : Promise.resolve(),
            medication.length > 0 ? MedicationSchedule_1.MedicationScheduleModel.insertMany(medication, { ordered: false }) : Promise.resolve()
        ]);
    }
    catch (error) {
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
