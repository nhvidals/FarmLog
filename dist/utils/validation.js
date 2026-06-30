"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.farmExists = farmExists;
exports.validateAnimalParents = validateAnimalParents;
exports.validateHatchOrder = validateHatchOrder;
const Farm_1 = require("../models/Farm");
const Animal_1 = require("../models/Animal");
/** True when a farm document with the given id exists. */
async function farmExists(farmId) {
    return Boolean(await Farm_1.FarmModel.exists({ _id: farmId }));
}
/**
 * Validates and resolves the optional father / mother references on an animal
 * payload. Parents are referenced by ring number (anilha) — the farm-unique,
 * user-chosen identifier. Parent fields are optional; when a provided value is
 * invalid (missing animal, wrong sex, self-reference), it is ignored.
 *
 * Returns only successfully resolved parent ObjectIds (used internally as the
 * stored relationship).
 */
async function validateAnimalParents(body, farmId, selfId, childDesignation) {
    const parents = [
        { field: "fatherId", sex: "male" },
        { field: "motherId", sex: "female" },
    ];
    const resolved = {};
    for (const { field, sex } of parents) {
        const raw = body[field];
        if (raw === undefined || raw === null || String(raw).trim() === "")
            continue;
        const ringNumber = String(raw).trim();
        const parent = await Animal_1.AnimalModel.findOne({ farmId, ringNumber }).lean();
        if (!parent)
            continue;
        if (selfId && String(parent._id) === selfId)
            continue;
        if (parent.sex !== sex)
            continue;
        // Parents must be the same type (designation) as the offspring — no links
        // between animals of different types.
        if (childDesignation && parent.designation !== childDesignation)
            continue;
        resolved[field] = parent._id;
    }
    return { resolved };
}
/**
 * Validates that an incubation batch's expected hatch date is not before its
 * start date. Invalid/missing dates are ignored here and left to schema
 * validation. Returns null when valid, or a ValidationError otherwise.
 */
function validateHatchOrder(startDate, expectedHatchDate) {
    const start = new Date(startDate);
    const hatch = new Date(expectedHatchDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(hatch.getTime())) {
        return null;
    }
    if (hatch.getTime() < start.getTime()) {
        return { message: "expectedHatchDate cannot be before startDate" };
    }
    return null;
}
