"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const animals_1 = require("./routes/animals");
const incubation_1 = require("./routes/incubation");
const medication_1 = require("./routes/medication");
const importExport_1 = require("./routes/importExport");
const farms_1 = require("./routes/farms");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json({ limit: "10mb" }));
exports.app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
exports.app.use("/farms", farms_1.farmsRouter);
exports.app.use("/animals", animals_1.animalsRouter);
exports.app.use("/incubation", incubation_1.incubationRouter);
exports.app.use("/medication", medication_1.medicationRouter);
exports.app.use("/data", importExport_1.importExportRouter);
