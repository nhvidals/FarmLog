import { toIsoDateOnly } from "./helpers";
import { T } from "./i18n";
import { Animal, IncubationBatch, LogEntry, MedicationSchedule } from "./types";

/** Escapes one CSV field: quote it when it contains a comma, quote or newline. */
const escapeField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * Serializes rows to CSV text. Prepends a UTF-8 BOM so spreadsheet apps (Excel)
 * render accented characters correctly.
 */
export const toCsv = (rows: string[][]): string =>
  "﻿" + rows.map((row) => row.map((f) => escapeField(f ?? "")).join(",")).join("\r\n");

/** Animal inventory: one row per animal with identity, type and lifecycle status. */
export const buildInventoryCsv = (animals: Animal[], t: T): string => {
  const header = [
    t.namePlaceholder,
    t.ringNumberPlaceholder,
    t.animalTypeLabel,
    t.sexPlaceholder,
    t.birthDatePlaceholder,
    t.statusLabel,
    t.statusDateLabel,
  ];
  const rows = animals.map((a) => [
    a.name,
    a.ringNumber,
    a.designation,
    t.sexLabels[a.sex],
    toIsoDateOnly(a.birthDate),
    t.statusLabels[a.status ?? "active"],
    toIsoDateOnly(a.statusDate),
  ]);
  return toCsv([header, ...rows]);
};

/** Treatment log: one row per medication schedule, including recurrence. */
export const buildTreatmentCsv = (medication: MedicationSchedule[], t: T): string => {
  const header = [
    t.animalLabel,
    t.medicinePlaceholder,
    t.dosePlaceholder,
    t.datePlaceholder,
    t.freqLabel,
    t.repeatEvery,
    t.endDateLabel,
  ];
  const rows = medication.map((m) => {
    const who = typeof m.animalId === "string" ? m.animalId : m.animalId?.name ?? "";
    const freq = m.frequency ?? "once";
    return [
      who,
      m.medicineName,
      m.dose,
      toIsoDateOnly(m.date),
      t.freqLabels[freq],
      freq === "once" ? "" : String(m.interval ?? 1),
      toIsoDateOnly(m.endDate),
    ];
  });
  return toCsv([header, ...rows]);
};

/** Activity log: the append-only history of administrations and outcomes. */
export const buildLogCsv = (log: LogEntry[], t: T): string => {
  const header = [
    t.datePlaceholder,
    t.eventTypeLabel,
    t.animalLabel,
    t.medicinePlaceholder,
    t.dosePlaceholder,
    t.statusLabel,
    "OK",
    "NOK",
    t.eventNoteLabel,
  ];
  const rows = log.map((e) => [
    toIsoDateOnly(e.date),
    e.kind === "medication" ? t.tabMedication : t.tabIncubation,
    e.animalName ?? e.incubatorName ?? "",
    e.medicineName ?? e.species ?? "",
    e.dose ?? (e.eggCount !== undefined ? String(e.eggCount) : ""),
    e.status ? t.adminStatusLabels[e.status] : "",
    e.hatchedOk !== undefined ? String(e.hatchedOk) : "",
    e.hatchedNok !== undefined ? String(e.hatchedNok) : "",
    e.note ?? "",
  ]);
  return toCsv([header, ...rows]);
};

/** Incubation results: one row per batch with hatched counts and success rate. */
export const buildIncubationCsv = (batches: IncubationBatch[], t: T): string => {
  const header = [
    t.incubatorPlaceholder,
    t.animalTypeLabel,
    t.eggCountPlaceholder,
    t.startLabel,
    t.hatchLabel,
    "OK",
    "NOK",
    "%",
  ];
  const rows = batches.map((b) => {
    const ok = b.hatchedOk;
    const nok = b.hatchedNok;
    const total = (ok ?? 0) + (nok ?? 0);
    const rate = ok !== undefined && total > 0 ? `${Math.round((ok / total) * 100)}` : "";
    return [
      b.incubatorName,
      b.species,
      String(b.eggCount),
      toIsoDateOnly(b.startDate),
      toIsoDateOnly(b.expectedHatchDate),
      ok !== undefined ? String(ok) : "",
      nok !== undefined ? String(nok) : "",
      rate,
    ];
  });
  return toCsv([header, ...rows]);
};
