import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { Animal, AnimalCategory, AnimalType, AnimalStatus, IncubationBatch, MedicationSchedule } from "./types";
import { CalEvent } from "./calendar";

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
 * Best-effort local notification. Date-triggered notifications are not supported
 * on web, and scheduling can fail for permission reasons, so this must never
 * throw — it should not block the action that triggered it.
 */
export const scheduleLocalNotification = async (title: string, body: string, date: Date): Promise<void> => {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch {
    // ignore — notifications are a non-critical enhancement
  }
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
  for (const m of medicationList) {
    const d = toIsoDateOnly(m.date);
    const who = typeof m.animalId === "string" ? m.animalId : m.animalId?.name ?? "";
    if (d) evts.push({ date: d, kind: "medication", title: m.medicineName, subtitle: who });
  }
  return evts;
};
