import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { T } from "./i18n";
import { C } from "./theme";

export type CalEventKind = "birth" | "hatch" | "incubationStart" | "medication";

export type CalEvent = {
  date: string; // YYYY-MM-DD
  kind: CalEventKind;
  title: string;
  subtitle?: string;
};

const KIND_META: Record<CalEventKind, { icon: string; color: string; bg: string; labelKey: keyof T }> = {
  birth: { icon: "🍼", color: C.primary, bg: C.primaryLight, labelKey: "evtBirth" },
  hatch: { icon: "🐣", color: C.warning, bg: C.warningBg, labelKey: "evtHatch" },
  incubationStart: { icon: "🥚", color: C.ovi, bg: C.oviBg, labelKey: "evtIncubationStart" },
  medication: { icon: "💊", color: C.danger, bg: C.dangerBg, labelKey: "evtMedication" },
};

// ── Date helpers (local time, no timezone surprises) ──
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeek = (d: Date) => addDays(d, -d.getDay()); // week starts Sunday
const todayIso = () => iso(new Date());

type CalView = "dia" | "semana" | "mes";

export function CalendarView({ events, t }: { events: CalEvent[]; t: T }) {
  const [view, setView] = useState<CalView>("mes");
  const [cursor, setCursor] = useState<Date>(new Date());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      if (!e.date) continue;
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const step = (dir: number) => {
    if (view === "dia") setCursor((c) => addDays(c, dir));
    else if (view === "semana") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  };

  const periodLabel = () => {
    if (view === "dia") return `${cursor.getDate()} ${t.months[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === "semana") {
      const ws = startOfWeek(cursor);
      const we = addDays(ws, 6);
      return `${ws.getDate()}/${ws.getMonth() + 1} – ${we.getDate()}/${we.getMonth() + 1}`;
    }
    return `${t.months[cursor.getMonth()]} ${cursor.getFullYear()}`;
  };

  return (
    <View style={styles.root}>
      {/* View switcher */}
      <View style={styles.switcher}>
        {(["dia", "semana", "mes"] as CalView[]).map((v) => (
          <Pressable
            key={v}
            style={[styles.switchBtn, view === v && styles.switchBtnActive]}
            onPress={() => setView(v)}
          >
            <Text style={[styles.switchText, view === v && styles.switchTextActive]}>
              {v === "dia" ? t.calDay : v === "semana" ? t.calWeek : t.calMonth}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Period navigation */}
      <View style={styles.navRow}>
        <Pressable style={styles.navBtn} onPress={() => step(-1)}>
          <Text style={styles.navBtnText}>‹</Text>
        </Pressable>
        <Pressable style={styles.todayBtn} onPress={() => setCursor(new Date())}>
          <Text style={styles.periodLabel}>{periodLabel()}</Text>
          <Text style={styles.todayText}>{t.calToday}</Text>
        </Pressable>
        <Pressable style={styles.navBtn} onPress={() => step(1)}>
          <Text style={styles.navBtnText}>›</Text>
        </Pressable>
      </View>

      {view === "mes" && (
        <MonthView
          cursor={cursor}
          eventsByDate={eventsByDate}
          t={t}
          onPickDay={(d) => { setCursor(d); setView("dia"); }}
        />
      )}
      {view === "semana" && <WeekView cursor={cursor} eventsByDate={eventsByDate} t={t} />}
      {view === "dia" && <DayView dayIso={iso(cursor)} eventsByDate={eventsByDate} t={t} />}
    </View>
  );
}

function MonthView({
  cursor,
  eventsByDate,
  t,
  onPickDay,
}: {
  cursor: Date;
  eventsByDate: Map<string, CalEvent[]>;
  t: T;
  onPickDay: (d: Date) => void;
}) {
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = todayIso();

  return (
    <View style={styles.card}>
      <View style={styles.weekHeader}>
        {t.weekdaysShort.map((w) => (
          <Text key={w} style={styles.weekHeaderText}>{w}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d) => {
          const dIso = iso(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = dIso === today;
          const dayEvents = eventsByDate.get(dIso) ?? [];
          const kinds = Array.from(new Set(dayEvents.map((e) => e.kind))).slice(0, 4);
          return (
            <Pressable
              key={dIso}
              style={[styles.cell, isToday && styles.cellToday]}
              onPress={() => onPickDay(d)}
            >
              <Text style={[styles.cellDay, !inMonth && styles.cellDayMuted, isToday && styles.cellDayToday]}>
                {d.getDate()}
              </Text>
              <View style={styles.dotRow}>
                {kinds.map((k) => (
                  <View key={k} style={[styles.dot, { backgroundColor: KIND_META[k].color }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function WeekView({ cursor, eventsByDate, t }: { cursor: Date; eventsByDate: Map<string, CalEvent[]>; t: T }) {
  const ws = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const today = todayIso();

  return (
    <View style={{ gap: 8 }}>
      {days.map((d) => {
        const dIso = iso(d);
        const dayEvents = eventsByDate.get(dIso) ?? [];
        return (
          <View key={dIso} style={[styles.card, dIso === today && styles.cardToday]}>
            <Text style={styles.weekDayTitle}>
              {t.weekdaysShort[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}
            </Text>
            {dayEvents.length === 0 ? (
              <Text style={styles.dash}>—</Text>
            ) : (
              dayEvents.map((e, i) => <EventRow key={i} event={e} t={t} />)
            )}
          </View>
        );
      })}
    </View>
  );
}

function DayView({ dayIso, eventsByDate, t }: { dayIso: string; eventsByDate: Map<string, CalEvent[]>; t: T }) {
  const dayEvents = eventsByDate.get(dayIso) ?? [];
  if (dayEvents.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>{t.calNoEvents}</Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      {dayEvents.map((e, i) => <EventRow key={i} event={e} t={t} />)}
    </View>
  );
}

function EventRow({ event, t }: { event: CalEvent; t: T }) {
  const meta = KIND_META[event.kind];
  return (
    <View style={[styles.eventRow, { borderLeftColor: meta.color }]}>
      <Text style={styles.eventIcon}>{meta.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        {event.subtitle ? <Text style={styles.eventSubtitle} numberOfLines={1}>{event.subtitle}</Text> : null}
      </View>
      <View style={[styles.kindTag, { backgroundColor: meta.bg }]}>
        <Text style={[styles.kindTagText, { color: meta.color }]}>{t[meta.labelKey] as string}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: C.divider,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 12,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  switchBtnActive: {
    backgroundColor: C.surface,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    elevation: 1,
  },
  switchText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textSub,
  },
  switchTextActive: {
    color: C.primary,
  },

  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnText: {
    fontSize: 22,
    fontWeight: "800",
    color: C.primary,
    lineHeight: 24,
  },
  todayBtn: {
    flex: 1,
    alignItems: "center",
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
  },
  todayText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 4,
  },
  cardToday: {
    borderColor: C.accent,
  },

  weekHeader: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 10,
  },
  cellToday: {
    backgroundColor: C.primaryLight,
  },
  cellDay: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  cellDayMuted: {
    color: C.textMuted,
    opacity: 0.5,
  },
  cellDayToday: {
    color: C.primary,
    fontWeight: "800",
  },
  dotRow: {
    flexDirection: "row",
    gap: 2,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  weekDayTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.textSub,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dash: {
    fontSize: 13,
    color: C.textMuted,
  },
  empty: {
    fontSize: 14,
    color: C.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },

  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: C.bg,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 6,
  },
  eventIcon: {
    fontSize: 20,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  eventSubtitle: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 1,
  },
  kindTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  kindTagText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
