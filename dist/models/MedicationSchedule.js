"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicationScheduleModel = void 0;
const mongoose_1 = require("mongoose");
const medicationScheduleSchema = new mongoose_1.Schema({
    farmId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
    animalId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Animal", required: true },
    medicineName: { type: String, required: true, trim: true },
    dose: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    notes: { type: String }
}, { timestamps: true });
exports.MedicationScheduleModel = (0, mongoose_1.model)("MedicationSchedule", medicationScheduleSchema);
