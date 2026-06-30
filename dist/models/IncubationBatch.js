"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncubationBatchModel = void 0;
const mongoose_1 = require("mongoose");
const incubationBatchSchema = new mongoose_1.Schema({
    farmId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    species: { type: String, required: true, trim: true },
    eggCount: { type: Number, required: true, min: 1 },
    incubatorName: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    expectedHatchDate: { type: Date, required: true },
    hatchedOk: { type: Number, min: 0 },
    hatchedNok: { type: Number, min: 0 },
    notes: { type: String }
}, { timestamps: true });
exports.IncubationBatchModel = (0, mongoose_1.model)("IncubationBatch", incubationBatchSchema);
