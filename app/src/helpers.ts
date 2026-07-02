import { Animal, AnimalCategory, AnimalType, AnimalStatus, IncubationBatch, MedicationSchedule } from "./types";
import { CalEvent } from "./calendar";

// ── Local-time date helpers ──
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  const daysInMonth = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, daysInMonth));
  return x;
};
/** Parses any date-ish value to a local-midnight Date, or null. */
const parseLocalDate = (value: unknown): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toIsoDateOnly(value));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

/** Normalizes any date-ish value to a YYYY-MM-DD string (empty when absent). */
export const toIsoDateOnly = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

/** True when the string is a strict YYYY-MM-DD date. */
export const isDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Lifecycle status of an animal, defaulting legacy records to "active". */
export const statusOf = (a: Animal): AnimalStatus => a.status ?? "active";

/** Category lives on the animal type; resolve it from an animal's designation. */
export const categoryOf = (types: AnimalType[], designation?: string): AnimalCategory | undefined =>
  types.find((ty) => ty.name === designation)?.category;

/** Maps an internal animal id back to its ring number (the UI-facing id). */
export const ringOf = (animals: Animal[], animalId?: string): string =>
  animals.find((a) => a._id === animalId)?.ringNumber ?? "";

/**
 * Expands a (possibly recurring) medication schedule into individual occurrence
 * dates (YYYY-MM-DD) within an optional window. One-off schedules yield a single
 * date. Recurring ones step by `interval` units of `frequency` from `date` until
 * `endDate`, the window's `to` bound, or the `cap` — whichever comes first.
 */
export const expandOccurrences = (
  schedule: Pick<MedicationSchedule, "date" | "frequency" | "interval" | "endDate">,
  opts: { from?: Date; to: Date; cap?: number }
): string[] => {
  const start = parseLocalDate(schedule.date);
  if (!start) return [];
  const freq = schedule.frequency ?? "once";
  const interval = Math.max(1, schedule.interval ?? 1);
  const cap = opts.cap ?? 120;
  const endDate = schedule.endDate ? parseLocalDate(schedule.endDate) : null;
  const upper = endDate && endDate < opts.to ? endDate : opts.to;

  const within = (d: Date) => !opts.from || d >= opts.from;
  const out: string[] = [];

  if (freq === "once") {
    if (within(start) && start <= opts.to) out.push(isoOf(start));
    return out;
  }

  let cur = start;
  let guard = 0;
  while (cur <= upper && out.length < cap && guard < 4000) {
    guard++;
    if (within(cur)) out.push(isoOf(cur));
    cur = freq === "daily" ? addDays(cur, interval)
      : freq === "weekly" ? addDays(cur, interval * 7)
      : addMonths(cur, interval);
  }
  return out;
};

/** Aggregates all farm milestones (births, incubation, medication) for the calendar. */
export const buildCalendarEvents = (
  animals: Animal[],
  incubationList: IncubationBatch[],
  medicationList: MedicationSchedule[]
): CalEvent[] => {
  const evts: CalEvent[] = [];
  for (const a of animals) {
    const d = toIsoDateOnly(a.birthDate);
    if (d) evts.push({ date: d, kind: "birth", title: a.name, subtitle: a.designation });
  }
  for (const b of incubationList) {
    const s = toIsoDateOnly(b.startDate);
    if (s) evts.push({ date: s, kind: "incubationStart", title: b.incubatorName, subtitle: b.species });
    const h = toIsoDateOnly(b.expectedHatchDate);
    if (h) evts.push({ date: h, kind: "hatch", title: b.incubatorName, subtitle: b.species });
  }
  // Recurring medications are expanded to individual doses across a window that
  // covers recent past + a year ahead so the calendar shows every occurrence.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = addDays(today, -45);
  const to = addDays(today, 365);
  for (const m of medicationList) {
    const who = typeof m.animalId === "string" ? m.animalId : m.animalId?.name ?? "";
    for (const d of expandOccurrences(m, { from, to })) {
      evts.push({ date: d, kind: "medication", title: m.medicineName, subtitle: who });
    }
  }
  return evts;
};
