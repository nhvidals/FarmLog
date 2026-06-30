"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const mongoose_1 = __importDefault(require("mongoose"));
const animals_1 = require("./routes/animals");
const animalTypes_1 = require("./routes/animalTypes");
const incubation_1 = require("./routes/incubation");
const medication_1 = require("./routes/medication");
const importExport_1 = require("./routes/importExport");
const farms_1 = require("./routes/farms");
const auth_1 = require("./routes/auth");
const auth_2 = require("./middleware/auth");
exports.app = (0, express_1.default)();
// Security headers.
exports.app.use((0, helmet_1.default)());
// CORS: lock to a comma-separated allowlist in CORS_ORIGIN; defaults to "*"
// (kept open for local dev — set CORS_ORIGIN in production).
const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
exports.app.use((0, cors_1.default)({ origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : "*" }));
// Basic rate limiting to blunt brute force / scraping / DoS.
exports.app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX ?? 1000),
    standardHeaders: "draft-7",
    legacyHeaders: false
}));
// Request logging (skipped during tests to keep output clean).
if (process.env.NODE_ENV !== "test") {
    exports.app.use((0, morgan_1.default)("tiny"));
}
exports.app.use(express_1.default.json({ limit: "10mb" }));
exports.app.get("/health", (_req, res) => {
    // readyState 1 === connected. Report DB connectivity so this works as a real probe.
    const dbConnected = mongoose_1.default.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({ ok: dbConnected, db: dbConnected ? "up" : "down" });
});
// Public auth endpoints.
exports.app.use("/auth", auth_1.authRouter);
// Everything below requires a valid bearer token.
exports.app.use("/farms", auth_2.authRequired, farms_1.farmsRouter);
exports.app.use("/animal-types", auth_2.authRequired, animalTypes_1.animalTypesRouter);
exports.app.use("/animals", auth_2.authRequired, animals_1.animalsRouter);
exports.app.use("/incubation", auth_2.authRequired, incubation_1.incubationRouter);
exports.app.use("/medication", auth_2.authRequired, medication_1.medicationRouter);
exports.app.use("/data", auth_2.authRequired, importExport_1.importExportRouter);
