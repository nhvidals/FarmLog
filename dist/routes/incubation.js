"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incubationRouter = void 0;
const express_1 = require("express");
const IncubationBatch_1 = require("../models/IncubationBatch");
const farmContext_1 = require("../utils/farmContext");
const http_1 = require("../utils/http");
const validation_1 = require("../utils/validation");
exports.incubationRouter = (0, express_1.Router)();
exports.incubationRouter.get("/", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const batches = await IncubationBatch_1.IncubationBatchModel.find({ farmId }).sort({ startDate: -1 }).lean();
        return res.json(batches);
    }
    catch (error) {
        return (0, http_1.serverError)(res);
    }
});
exports.incubationRouter.post("/", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        if (!(await (0, validation_1.farmExists)(farmId)))
            return res.status(404).json({ message: "Farm not found" });
        const dateError = (0, validation_1.validateHatchOrder)(req.body?.startDate, req.body?.expectedHatchDate);
        if (dateError)
            return res.status(400).json({ message: dateError.message });
        const created = await IncubationBatch_1.IncubationBatchModel.create({ ...req.body, farmId });
        return res.status(201).json(created);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid incubation payload" });
    }
});
exports.incubationRouter.put("/:id", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    const safeBody = (0, http_1.stripImmutableFields)(req.body);
    try {
        if (safeBody.startDate !== undefined || safeBody.expectedHatchDate !== undefined) {
            const existing = await IncubationBatch_1.IncubationBatchModel.findOne({ _id: req.params.id, farmId }).lean();
            if (existing) {
                const start = safeBody.startDate ?? existing.startDate;
                const hatch = safeBody.expectedHatchDate ?? existing.expectedHatchDate;
                const dateError = (0, validation_1.validateHatchOrder)(start, hatch);
                if (dateError)
                    return res.status(400).json({ message: dateError.message });
            }
        }
        const updated = await IncubationBatch_1.IncubationBatchModel.findOneAndUpdate({ _id: req.params.id, farmId }, safeBody, { returnDocument: "after", runValidators: true });
        if (!updated)
            return res.status(404).json({ message: "Batch not found" });
        return res.json(updated);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid update payload" });
    }
});
exports.incubationRouter.delete("/:id", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
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
