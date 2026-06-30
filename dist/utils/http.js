"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripImmutableFields = stripImmutableFields;
exports.serverError = serverError;
/** Fields a client must never set directly — server-managed ids and timestamps. */
const IMMUTABLE_FIELDS = ["_id", "farmId", "createdAt", "updatedAt"];
/**
 * Returns a shallow copy of a request body without the server-managed fields,
 * ready to be used as an update payload.
 */
function stripImmutableFields(body) {
    const result = { ...(body ?? {}) };
    for (const field of IMMUTABLE_FIELDS)
        delete result[field];
    return result;
}
/** Standard 500 response for unexpected errors. */
function serverError(res) {
    return res.status(500).json({ message: "Internal server error" });
}
