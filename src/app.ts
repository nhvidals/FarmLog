import cors from "cors";
import express from "express";
import { animalsRouter } from "./routes/animals";
import { animalTypesRouter } from "./routes/animalTypes";
import { incubationRouter } from "./routes/incubation";
import { medicationRouter } from "./routes/medication";
import { importExportRouter } from "./routes/importExport";
import { farmsRouter } from "./routes/farms";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/farms", farmsRouter);
app.use("/animal-types", animalTypesRouter);
app.use("/animals", animalsRouter);
app.use("/incubation", incubationRouter);
app.use("/medication", medicationRouter);
app.use("/data", importExportRouter);
