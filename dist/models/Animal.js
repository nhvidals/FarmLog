"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimalModel = void 0;
const mongoose_1 = require("mongoose");
const animalSchema = new mongoose_1.Schema({
    farmId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    name: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    category: { type: String, enum: ["oviparous", "viviparous"], required: true },
    photoUrl: { type: String },
    birthDate: { type: Date, required: true },
    sex: { type: String, enum: ["male", "female"], required: true },
    ringNumber: { type: String, required: true, trim: true },
    fatherId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Animal" },
    motherId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Animal" },
    notes: { type: String }
}, { timestamps: true });
animalSchema.index({ farmId: 1, ringNumber: 1 }, { unique: true });
exports.AnimalModel = (0, mongoose_1.model)("Animal", animalSchema);
