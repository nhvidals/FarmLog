import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { FieldLabel } from "../components";
import { useApp } from "../context";
import { DatePickerField } from "../datepicker";
import { useConfirmDelete } from "../hooks";
import { toIsoDateOnly } from "../helpers";
import { fmt } from "../i18n";
import { qk, useAnimalEvents } from "../queries";
import { styles } from "../styles";
import { C } from "../theme";
import { Animal, HEALTH_EVENT_TYPES, HealthEvent, HealthEventType } from "../types";

const TYPE_ICONS: Record<HealthEventType, string> = {
  weight: "⚖️",
  health: "🩺",
  breeding: "❤️",
  note: "📝",
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function AnimalHistoryModal({ animal, onClose }: { animal: Animal | null; onClose: () => void }) {
  const { t, api, farmId, showToast, canWrite } = useApp();
  const queryClient = useQueryClient();
  const confirmDelete = useConfirmDelete();
  const animalId = animal?._id ?? "";

  const eventsQuery = useAnimalEvents(api, farmId, animalId, !!animal);
  const events = eventsQuery.data ?? [];

  const [type, setType] = useState<HealthEventType>("weight");
  const [date, setDate] = useState(todayIso());
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.events(farmId, animalId) });

  const latestWeight = events.find((e) => e.type === "weight" && e.value !== undefined);

  const reset = () => { setValue(""); setNote(""); setDate(todayIso()); };

  const add = async () => {
    const weight = Number(value);
    if (type === "weight" ? !(weight > 0) : !note.trim()) {
      showToast("warning", t.valEventFields);
      return;
    }
    setBusy(true);
    try {
      await api.post(`/animals/${animalId}/events`, {
        type,
        date,
        value: type === "weight" ? weight : undefined,
        note: note.trim() || undefined,
      });
      reset();
      refresh();
      showToast("success", t.successEventAdded);
    } catch {
      showToast("error", t.errAddEvent);
    } finally {
      setBusy(false);
    }
  };

  const remove = (ev: HealthEvent) =>
    confirmDelete({
      url: `/animals/${animalId}/events/${ev._id}`,
      onDeleted: refresh,
      title: t.confirmRemoveEventTitle,
      message: t.confirmRemoveEventMsg,
      successMsg: t.successEventRemoved,
      errorMsg: t.errRemoveEvent,
    });

  const describe = (ev: HealthEvent): string => {
    if (ev.type === "weight" && ev.value !== undefined) {
      return ev.note ? `${ev.value} kg · ${ev.note}` : `${ev.value} kg`;
    }
    return ev.note ?? "";
  };

  return (
    <Modal visible={!!animal} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { maxHeight: "88%" }]} onPress={() => {}}>
          <View style={styles.membersHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {animal ? fmt(t.historyTitle, { name: animal.name }) : ""}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.membersClose}>✕</Text>
            </Pressable>
          </View>

          {latestWeight && (
            <View style={styles.weightSummary}>
              <Text style={styles.weightSummaryLabel}>{t.latestWeight}</Text>
              <Text style={styles.weightSummaryValue}>{latestWeight.value} kg</Text>
              <Text style={styles.weightSummaryDate}>{toIsoDateOnly(latestWeight.date)}</Text>
            </View>
          )}

          {/* Add-entry form */}
          {canWrite && (
            <View style={styles.eventForm}>
              <FieldLabel text={t.eventTypeLabel} />
              <View style={styles.chipWrapRow}>
                {HEALTH_EVENT_TYPES.map((ty) => (
                  <Pressable
                    key={ty}
                    style={[styles.chip, type === ty && styles.chipActive]}
                    onPress={() => setType(ty)}
                  >
                    <Text style={[styles.chipText, type === ty && styles.chipTextActive]}>
                      {TYPE_ICONS[ty]} {t.eventTypeLabels[ty]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FieldLabel text={t.datePlaceholder} />
                  <DatePickerField value={date} onChange={setDate} t={t} />
                </View>
                {type === "weight" && (
                  <View style={{ width: 110 }}>
                    <FieldLabel text={t.weightValueLabel} />
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={setValue}
                      keyboardType="numeric"
                      placeholder="0.0"
                      placeholderTextColor={C.textMuted}
                    />
                  </View>
                )}
              </View>

              <FieldLabel text={t.eventNoteLabel} />
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder={t.eventNoteLabel}
                placeholderTextColor={C.textMuted}
              />

              <Pressable style={[styles.primaryBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={add}>
                <Text style={styles.primaryBtnText}>{t.saveEvent}</Text>
              </Pressable>
            </View>
          )}

          {/* Timeline */}
          <ScrollView style={{ maxHeight: 300, marginTop: 8 }} contentContainerStyle={{ gap: 8 }}>
            {eventsQuery.isLoading ? (
              <ActivityIndicator color={C.primary} style={{ paddingVertical: 20 }} />
            ) : events.length === 0 ? (
              <Text style={styles.treeHint}>{t.noEvents}</Text>
            ) : (
              events.map((ev) => (
                <View key={ev._id} style={styles.eventRow}>
                  <Text style={styles.eventRowIcon}>{TYPE_ICONS[ev.type]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventRowType}>{t.eventTypeLabels[ev.type]}</Text>
                    <Text style={styles.eventRowDesc}>{describe(ev)}</Text>
                  </View>
                  <Text style={styles.eventRowDate}>{toIsoDateOnly(ev.date)}</Text>
                  {canWrite && (
                    <Pressable onPress={() => remove(ev)} hitSlop={6} style={styles.eventRemoveBtn}>
                      <Text style={styles.eventRemoveText}>🗑</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
