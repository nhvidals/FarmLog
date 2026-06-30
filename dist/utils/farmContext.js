"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFarmIdFromRequest = getFarmIdFromRequest;
const mongoose_1 = require("mongoose");
const Farm_1 = require("../models/Farm");
/**
 * Resolves the target farm id from the request and verifies the authenticated
 * user owns it. Returns the farmId on success, or null after sending the
 * appropriate error response (400 missing/malformed, 401 unauthenticated,
 * 404 when the farm doesn't exist OR belongs to another user — we don't
 * disclose the difference).
 */
async function getFarmIdFromRequest(req, res) {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ message: "Authentication required" });
        return null;
    }
    const farmId = req.header("x-farm-id") ??
        (typeof req.query.farmId === "string" ? req.query.farmId : undefined);
    if (!farmId) {
        res.status(400).json({ message: "farmId is required (x-farm-id header or farmId query param)" });
        return null;
    }
    if (!(0, mongoose_1.isValidObjectId)(farmId)) {
        res.status(400).json({ message: "farmId is not a valid id" });
        return null;
    }
    const owned = await Farm_1.FarmModel.exists({ _id: farmId, ownerId: userId });
    if (!owned) {
        res.status(404).json({ message: "Farm not found" });
        return null;
    }
    return farmId;
}
