"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incubationRouter = void 0;
const express_1 = require("express");
const IncubationBatch_1 = require("../models/IncubationBatch");
const farmContext_1 = require("../utils/farmContext");
exports.incubationRouter = (0, express_1.Router)();
exports.incubationRouter.get("/", async (req, res) => {
    const farmId = (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const batches = await IncubationBatch_1.IncubationBatchModel.find({ farmId }).sort({ startDate: -1 }).lean();
        res.json(batches);
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.incubationRouter.post("/", async (req, res) => {
    const farmId = (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const created = await IncubationBatch_1.IncubationBatchModel.create({ ...req.body, farmId });
        return res.status(201).json(created);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid incubation payload", error });
    }
});
exports.incubationRouter.put("/:id", async (req, res) => {
    const farmId = (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    const { _id, farmId: _farmId, createdAt, updatedAt, ...safeBody } = req.body;
    try {
        const updated = await IncubationBatch_1.IncubationBatchModel.findOneAndUpdate({ _id: req.params.id, farmId }, safeBody, { returnDocument: "after", runValidators: true });
        if (!updated)
            return res.status(404).json({ message: "Batch not found" });
        return res.json(updated);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid update payload", error });
    }
});
exports.incubationRouter.delete("/:id", async (req, res) => {
    const farmId = (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const deleted = await IncubationBatch_1.IncubationBatchModel.findOneAndDelete({ _id: req.params.id, farmId });
        if (!deleted)
            return res.status(404).json({ message: "Batch not found" });
        return res.status(204).send();
    }
    catch (error) {
        return res.status(404).json({ message: "Batch not found" });
    }
});
