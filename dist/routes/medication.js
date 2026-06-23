"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicationRouter = void 0;
const express_1 = require("express");
const Animal_1 = require("../models/Animal");
const MedicationSchedule_1 = require("../models/MedicationSchedule");
const farmContext_1 = require("../utils/farmContext");
exports.medicationRouter = (0, express_1.Router)();
exports.medicationRouter.get("/", async (req, res) => {
    const farmId = (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const entries = await MedicationSchedule_1.MedicationScheduleModel.find({ farmId })
            .populate("animalId", "name designation category ringNumber")
            .sort({ date: 1 })
            .lean();
        res.json(entries);
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.medicationRouter.post("/", async (req, res) => {
    const farmId = (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const animal = await Animal_1.AnimalModel.findOne({ _id: req.body?.animalId, farmId }).lean();
        if (!animal)
            return res.status(400).json({ message: "Animal does not exist in this farm" });
        const created = await MedicationSchedule_1.MedicationScheduleModel.create({ ...req.body, farmId });
        return res.status(201).json(created);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid medication payload", error });
    }
});
exports.medicationRouter.put("/:id", async (req, res) => {
    const farmId = (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    const { _id, farmId: _farmId, createdAt, updatedAt, ...safeBody } = req.body;
    try {
        if (safeBody.animalId) {
            const animal = await Animal_1.AnimalModel.findOne({ _id: safeBody.animalId, farmId }).lean();
            if (!animal)
                return res.status(400).json({ message: "Animal does not exist in this farm" });
        }
        const updated = await MedicationSchedule_1.MedicationScheduleModel.findOneAndUpdate({ _id: req.params.id, farmId }, safeBody, { returnDocument: "after", runValidators: true });
        if (!updated)
            return res.status(404).json({ message: "Schedule not found" });
        return res.json(updated);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid update payload", error });
    }
});
exports.medicationRouter.delete("/:id", async (req, res) => {
    const farmId = (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const deleted = await MedicationSchedule_1.MedicationScheduleModel.findOneAndDelete({ _id: req.params.id, farmId });
        if (!deleted)
            return res.status(404).json({ message: "Schedule not found" });
        return res.status(204).send();
    }
    catch (error) {
        return res.status(404).json({ message: "Schedule not found" });
    }
});
