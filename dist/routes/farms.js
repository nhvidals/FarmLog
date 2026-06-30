"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.farmsRouter = void 0;
const express_1 = require("express");
const Farm_1 = require("../models/Farm");
const Animal_1 = require("../models/Animal");
const AnimalType_1 = require("../models/AnimalType");
const IncubationBatch_1 = require("../models/IncubationBatch");
const MedicationSchedule_1 = require("../models/MedicationSchedule");
const http_1 = require("../utils/http");
exports.farmsRouter = (0, express_1.Router)();
exports.farmsRouter.get("/", async (req, res) => {
    try {
        const farms = await Farm_1.FarmModel.find({ ownerId: req.userId }).sort({ createdAt: -1 }).lean();
        return res.json(farms);
    }
    catch (error) {
        return (0, http_1.serverError)(res);
    }
});
exports.farmsRouter.post("/", async (req, res) => {
    try {
        const created = await Farm_1.FarmModel.create({
            ownerId: req.userId,
            name: req.body?.name,
            location: req.body?.location
        });
        return res.status(201).json(created);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid farm payload" });
    }
});
exports.farmsRouter.delete("/:id", async (req, res) => {
    try {
        const farm = await Farm_1.FarmModel.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
        if (!farm)
            return res.status(404).json({ message: "Farm not found" });
        const farmId = req.params.id;
        await Promise.all([
            Animal_1.AnimalModel.deleteMany({ farmId }),
            AnimalType_1.AnimalTypeModel.deleteMany({ farmId }),
            IncubationBatch_1.IncubationBatchModel.deleteMany({ farmId }),
            MedicationSchedule_1.MedicationScheduleModel.deleteMany({ farmId }),
        ]);
        return res.status(204).send();
    }
    catch (error) {
        return (0, http_1.serverError)(res);
    }
});
