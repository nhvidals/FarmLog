import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useApp } from "../context";
import { expandOccurrences, toIsoDateOnly } from "../helpers";
import { fmt } from "../i18n";
import { useIncubation, useMedication } from "../queries";

// How far ahead to arm reminders, and a global cap to stay under the platform
// limit on pending local notifications (iOS allows ~64).
const HORIZON_DAYS = 60;
const MAX_NOTIFICATIONS = 60;

/**
 * Renders nothing. Owns all of the app's scheduled local notifications: whenever
 * the active farm's medication or incubation data changes (including on cold
 * start, once queries resolve), it cancels everything and re-schedules upcoming
 * reminders from the stored schedules. This is what makes reminders survive an
 * app relaunch/reinstall — they are re-derived from data, not only set once at
 * creation time. Best-effort and never throws; a no-op on web.
 */
export function ReminderScheduler() {
  const { t, api, farmId, token } = useApp();
  const { data: meds = [] } = useMedication(api, farmId, token);
  const { data: batches = [] } = useIncubation(api, farmId, token);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let cancelled = false;

    (async () => {
      try {
        const now = new Date();
        const to = new Date(now);
        to.setDate(to.getDate() + HORIZON_DAYS);

        const reqs: { date: Date; title: string; body: string }[] = [];

        // Recurring medications → one reminder per upcoming dose.
        for (const m of meds) {
          for (const day of expandOccurrences(m, { from: now, to, cap: 30 })) {
            const when = new Date(`${day}T09:00:00`);
            if (when > now) {
              reqs.push({
                date: when,
                title: t.notifMedicationTitle,
                body: fmt(t.notifMedicationBody, { name: m.medicineName, dose: m.dose }),
              });
            }
          }
        }

        // Incubation batches still awaiting a result → hatch-day reminder.
        for (const b of batches) {
          if (b.hatchedOk !== undefined || b.hatchedNok !== undefined) continue;
          const day = toIsoDateOnly(b.expectedHatchDate);
          if (!day) continue;
          const when = new Date(`${day}T09:00:00`);
          if (when > now) {
            reqs.push({
              date: when,
              title: t.notifIncubationTitle,
              body: fmt(t.notifIncubationBody, { name: b.incubatorName }),
            });
          }
        }

        reqs.sort((a, b) => a.date.getTime() - b.date.getTime());
        const scheduled = reqs.slice(0, MAX_NOTIFICATIONS);

        await Notifications.cancelAllScheduledNotificationsAsync();
        if (cancelled) return;

        for (const r of scheduled) {
          await Notifications.scheduleNotificationAsync({
            content: { title: r.title, body: r.body },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date },
          });
        }
      } catch {
        // Best-effort: notifications are a non-critical enhancement.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [meds, batches, t]);

  return null;
}
