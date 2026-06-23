"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFarmIdFromRequest = getFarmIdFromRequest;
function getFarmIdFromRequest(req, res) {
    const farmId = req.header("x-farm-id") ??
        (typeof req.query.farmId === "string" ? req.query.farmId : undefined);
    if (!farmId) {
        res.status(400).json({ message: "farmId is required (x-farm-id header or farmId query param)" });
        return null;
    }
    return farmId;
}
