"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimalTypeModel = void 0;
const mongoose_1 = require("mongoose");
const animalTypeSchema = new mongoose_1.Schema({
    farmId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ["oviparous", "viviparous"], required: true }
}, { timestamps: true });
animalTypeSchema.index({ farmId: 1, name: 1 }, { unique: true });
exports.AnimalTypeModel = (0, mongoose_1.model)("AnimalType", animalTypeSchema);
