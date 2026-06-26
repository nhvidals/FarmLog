import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { animalsRouter } from "./routes/animals";
import { animalTypesRouter } from "./routes/animalTypes";
import { incubationRouter } from "./routes/incubation";
import { medicationRouter } from "./routes/medication";
import { importExportRouter } from "./routes/importExport";
import { farmsRouter } from "./routes/farms";
import { authRouter } from "./routes/auth";
import { authRequired } from "./middleware/auth";

export const app = express();

// Security headers.
app.use(helmet());

// CORS: lock to a comma-separated allowlist in CORS_ORIGIN; defaults to "*"
// (kept open for local dev — set CORS_ORIGIN in production).
const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : "*" }));

// Basic rate limiting to blunt brute force / scraping / DoS.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX ?? 1000),
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

// Request logging (skipped during tests to keep output clean).
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("tiny"));
}

app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  // readyState 1 === connected. Report DB connectivity so this works as a real probe.
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({ ok: dbConnected, db: dbConnected ? "up" : "down" });
});

// Public auth endpoints.
app.use("/auth", authRouter);

// Everything below requires a valid bearer token.
app.use("/farms", authRequired, farmsRouter);
app.use("/animal-types", authRequired, animalTypesRouter);
app.use("/animals", authRequired, animalsRouter);
app.use("/incubation", authRequired, incubationRouter);
app.use("/medication", authRequired, medicationRouter);
app.use("/data", authRequired, importExportRouter);
