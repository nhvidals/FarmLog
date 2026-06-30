"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Reads the JWT secret lazily so tests/processes can set it before first use.
 * Throws if unset — we never want to sign or verify with a missing/empty secret.
 */
function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not set");
    }
    return secret;
}
const TOKEN_TTL = process.env.JWT_TTL ?? "30d";
function signToken(userId) {
    return jsonwebtoken_1.default.sign({ sub: userId }, getSecret(), { expiresIn: TOKEN_TTL });
}
/** Returns the user id (sub) from a valid token, or null if invalid/expired. */
function verifyToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, getSecret());
        if (typeof payload === "object" && payload.sub) {
            return String(payload.sub);
        }
        return null;
    }
    catch {
        return null;
    }
}
