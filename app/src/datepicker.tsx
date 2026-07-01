import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { T } from "./i18n";
import { C } from "./theme";

// ── Date helpers (local time, no timezone surprises) ──
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeek = (d: Date) => addDays(d, -d.getDay());

/** Parses a YYYY-MM-DD string into a local Date, or null if invalid/empty. */
const parseIso = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Human-friendly display of a YYYY-MM-DD value using the active locale. */
export function formatDisplayDate(value: string, t: T): string {
  const d = parseIso(value);
  if (!d) return value;
  return `${d.getDate()} ${t.months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * A dependency-free date field: renders the current value as a tappable button
 * and opens a month-grid picker in a modal. Works identically on web and native
 * (no native module / rebuild required), and keeps the value as a YYYY-MM-DD
 * string to match the rest of the app.
 */
export function DatePickerField({
  value,
  onChange,
  t,
  optional,
  minValue,
}: {
  value: string;
  onChange: (next: string) => void;
  t: T;
  /** When true, shows a "clear" affordance and allows an empty value. */
  optional?: boolean;
  /** Optional lower bound (YYYY-MM-DD); earlier days are disabled. */
  minValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [cursor, setCursor] = useState<Date>(selected ?? new Date());
  const minDate = minValue ? parseIso(minValue) : null;

  const cells = useMemo(() => {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor]);

  const openPicker = () => {
    setCursor(selected ?? new Date());
    setOpen(true);
  };

  const pick = (d: Date) => {
    onChange(iso(d));
    setOpen(false);
  };

  const todayIso = iso(new Date());

  return (
    <>
      <Pressable style={styles.field} onPress={openPicker}>
        <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]}>
          {value ? formatDisplayDate(value, t) : t.pickDate}
        </Text>
        <Text style={styles.fieldIcon}>📅</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            {/* Month navigation */}
            <View style={styles.navRow}>
              <Pressable
                style={styles.navBtn}
                onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                <Text style={styles.navBtnText}>‹</Text>
              </Pressable>
              <Text style={styles.monthLabel}>
                {t.months[cursor.getMonth()]} {cursor.getFullYear()}
              </Text>
              <Pressable
                style={styles.navBtn}
                onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                <Text style={styles.navBtnText}>›</Text>
              </Pressable>
            </View>

            {/* Weekday header */}
            <View style={styles.weekHeader}>
              {t.weekdaysShort.map((w) => (
                <Text key={w} style={styles.weekHeaderText}>{w}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.grid}>
              {cells.map((d) => {
                const dIso = iso(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const isSelected = dIso === value;
                const isToday = dIso === todayIso;
                const disabled = !!minDate && d < minDate;
                return (
                  <Pressable
                    key={dIso}
                    style={styles.cell}
                    disabled={disabled}
                    onPress={() => pick(d)}
                  >
                    <View style={[styles.cellInner, isSelected && styles.cellSelected, !isSelected && isToday && styles.cellToday]}>
                      <Text
                        style={[
                          styles.cellText,
                          !inMonth && styles.cellTextMuted,
                          disabled && styles.cellTextDisabled,
                          isSelected && styles.cellTextSelected,
                        ]}
                      >
                        {d.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.actionBtn} onPress={() => pick(new Date())}>
                <Text style={styles.actionBtnText}>{t.calToday}</Text>
              </Pressable>
              {optional && (
                <Pressable style={styles.actionBtn} onPress={() => { onChange(""); setOpen(false); }}>
                  <Text style={styles.actionBtnText}>{t.clear}</Text>
                </Pressable>
              )}
              <Pressable style={[styles.actionBtn, styles.actionBtnCancel]} onPress={() => setOpen(false)}>
                <Text style={styles.actionBtnText}>{t.cancel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldText: {
    fontSize: 14,
    color: C.text,
  },
  fieldPlaceholder: {
    color: C.textMuted,
  },
  fieldIcon: {
    fontSize: 15,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
  },

  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
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
  monthLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
  },

  weekHeader: {
    flexDirection: "row",
    marginBottom: 4,
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
    padding: 2,
  },
  cellInner: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cellSelected: {
    backgroundColor: C.primary,
  },
  cellToday: {
    backgroundColor: C.primaryLight,
  },
  cellText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  cellTextMuted: {
    color: C.textMuted,
    opacity: 0.5,
  },
  cellTextDisabled: {
    color: C.textMuted,
    opacity: 0.3,
  },
  cellTextSelected: {
    color: "#fff",
    fontWeight: "800",
  },

  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionBtnCancel: {
    backgroundColor: C.dangerBg,
    borderColor: C.danger,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSub,
  },
});
