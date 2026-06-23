"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.farmsRouter = void 0;
const express_1 = require("express");
const Farm_1 = require("../models/Farm");
const Animal_1 = require("../models/Animal");
const IncubationBatch_1 = require("../models/IncubationBatch");
const MedicationSchedule_1 = require("../models/MedicationSchedule");
exports.farmsRouter = (0, express_1.Router)();
exports.farmsRouter.get("/", async (_req, res) => {
    try {
        const farms = await Farm_1.FarmModel.find().sort({ createdAt: -1 }).lean();
        res.json(farms);
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.farmsRouter.post("/", async (req, res) => {
    try {
        const created = await Farm_1.FarmModel.create({
            name: req.body?.name,
            location: req.body?.location
        });
        return res.status(201).json(created);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid farm payload", error });
    }
});
exports.farmsRouter.delete("/:id", async (req, res) => {
    try {
        const farm = await Farm_1.FarmModel.findByIdAndDelete(req.params.id);
        if (!farm)
            return res.status(404).json({ message: "Farm not found" });
        const farmId = req.params.id;
        await Promise.all([
            Animal_1.AnimalModel.deleteMany({ farmId }),
            IncubationBatch_1.IncubationBatchModel.deleteMany({ farmId }),
            MedicationSchedule_1.MedicationScheduleModel.deleteMany({ farmId }),
        ]);
        return res.status(204).send();
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});
