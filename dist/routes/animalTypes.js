"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.animalTypesRouter = void 0;
const express_1 = require("express");
const AnimalType_1 = require("../models/AnimalType");
const farmContext_1 = require("../utils/farmContext");
const http_1 = require("../utils/http");
const validation_1 = require("../utils/validation");
exports.animalTypesRouter = (0, express_1.Router)();
exports.animalTypesRouter.get("/", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const types = await AnimalType_1.AnimalTypeModel.find({ farmId }).sort({ name: 1 }).lean();
        return res.json(types);
    }
    catch (error) {
        return (0, http_1.serverError)(res);
    }
});
exports.animalTypesRouter.post("/", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        if (!(await (0, validation_1.farmExists)(farmId)))
            return res.status(404).json({ message: "Farm not found" });
        const created = await AnimalType_1.AnimalTypeModel.create({
            name: req.body?.name,
            category: req.body?.category,
            farmId
        });
        return res.status(201).json(created);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid animal type payload" });
    }
});
exports.animalTypesRouter.delete("/:id", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const deleted = await AnimalType_1.AnimalTypeModel.findOneAndDelete({ _id: req.params.id, farmId });
        if (!deleted)
            return res.status(404).json({ message: "Animal type not found" });
        return res.status(204).send();
    }
    catch (error) {
        return res.status(404).json({ message: "Animal type not found" });
    }
});
