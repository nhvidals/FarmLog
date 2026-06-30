"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRequired = authRequired;
const token_1 = require("../utils/token");
/**
 * Requires a valid `Authorization: Bearer <jwt>` header. On success sets
 * `req.userId`; otherwise responds 401 and stops the chain.
 */
function authRequired(req, res, next) {
    const header = req.header("authorization") ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Authentication required" });
    }
    const userId = (0, token_1.verifyToken)(token);
    if (!userId) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
    req.userId = userId;
    next();
}
