"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.animalsRouter = void 0;
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const Animal_1 = require("../models/Animal");
const farmContext_1 = require("../utils/farmContext");
const http_1 = require("../utils/http");
const validation_1 = require("../utils/validation");
exports.animalsRouter = (0, express_1.Router)();
exports.animalsRouter.get("/", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const animals = await Animal_1.AnimalModel.find({ farmId }).sort({ createdAt: -1 }).lean();
        return res.json(animals);
    }
    catch (error) {
        return (0, http_1.serverError)(res);
    }
});
exports.animalsRouter.get("/:id", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const animal = await Animal_1.AnimalModel.findOne({ _id: req.params.id, farmId }).lean();
        if (!animal)
            return res.status(404).json({ message: "Animal not found" });
        return res.json(animal);
    }
    catch (error) {
        return res.status(404).json({ message: "Animal not found" });
    }
});
exports.animalsRouter.post("/", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        if (!(await (0, validation_1.farmExists)(farmId)))
            return res.status(404).json({ message: "Farm not found" });
        const { fatherId, motherId, ...rest } = req.body ?? {};
        const parents = await (0, validation_1.validateAnimalParents)({ fatherId, motherId }, farmId, undefined, rest.designation);
        const created = await Animal_1.AnimalModel.create({ ...rest, ...parents.resolved, farmId });
        return res.status(201).json(created);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid animal payload" });
    }
});
exports.animalsRouter.put("/:id", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    const { fatherId, motherId, ...rest } = (0, http_1.stripImmutableFields)(req.body);
    try {
        // The offspring's type may come from the update body, or fall back to the
        // stored designation when only the parents are being changed.
        let childDesignation = rest.designation;
        if ((fatherId || motherId) && childDesignation === undefined) {
            const existing = await Animal_1.AnimalModel.findOne({ _id: req.params.id, farmId }).lean();
            childDesignation = existing?.designation;
        }
        const parents = await (0, validation_1.validateAnimalParents)({ fatherId, motherId }, farmId, req.params.id, childDesignation);
        const safeBody = { ...rest, ...parents.resolved };
        const updated = await Animal_1.AnimalModel.findOneAndUpdate({ _id: req.params.id, farmId }, safeBody, { returnDocument: "after", runValidators: true });
        if (!updated)
            return res.status(404).json({ message: "Animal not found" });
        return res.json(updated);
    }
    catch (error) {
        return res.status(400).json({ message: "Invalid update payload" });
    }
});
exports.animalsRouter.delete("/:id", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    try {
        const deleted = await Animal_1.AnimalModel.findOneAndDelete({ _id: req.params.id, farmId });
        if (!deleted)
            return res.status(404).json({ message: "Animal not found" });
        return res.status(204).send();
    }
    catch (error) {
        return res.status(404).json({ message: "Animal not found" });
    }
});
exports.animalsRouter.get("/:id/tree", async (req, res) => {
    const farmId = await (0, farmContext_1.getFarmIdFromRequest)(req, res);
    if (!farmId)
        return;
    const visited = new Set();
    async function buildTree(animalId, depth = 0) {
        if (!mongoose_1.default.isValidObjectId(animalId) || visited.has(animalId) || depth > 4) {
            return null;
        }
        visited.add(animalId);
        const animal = await Animal_1.AnimalModel.findOne({ _id: animalId, farmId }).lean();
        if (!animal)
            return null;
        const [father, mother] = await Promise.all([
            animal.fatherId ? buildTree(String(animal.fatherId), depth + 1) : Promise.resolve(null),
            animal.motherId ? buildTree(String(animal.motherId), depth + 1) : Promise.resolve(null)
        ]);
        return { ...animal, father, mother };
    }
    try {
        // The root may be given as an ObjectId or as a ring number (anilha).
        let rootId = req.params.id;
        if (!mongoose_1.default.isValidObjectId(rootId)) {
            const byRing = await Animal_1.AnimalModel.findOne({ farmId, ringNumber: rootId }).lean();
            if (!byRing)
                return res.status(404).json({ message: "Animal not found" });
            rootId = String(byRing._id);
        }
        const tree = await buildTree(rootId);
        if (!tree)
            return res.status(404).json({ message: "Animal not found" });
        return res.json(tree);
    }
    catch (error) {
        return (0, http_1.serverError)(res);
    }
});
