"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmModel = void 0;
const mongoose_1 = require("mongoose");
const farmSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true }
}, { timestamps: true });
exports.FarmModel = (0, mongoose_1.model)("Farm", farmSchema);
