import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { FieldLabel } from "../components";
import { useApp } from "../context";
import { DatePickerField } from "../datepicker";
import { todayIso } from "../helpers";
import { qk } from "../queries";
import { styles } from "../styles";
import { C } from "../theme";
import { ADMIN_STATUSES, AdminStatus, MedicationSchedule } from "../types";

/** Records a dose of a medication schedule as given/skipped into the append-only log. */
export function LogDoseModal({ schedule, onClose }: { schedule: MedicationSchedule | null; onClose: () => void }) {
  const { t, api, farmId, showToast } = useApp();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState<AdminStatus>("given");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!schedule) return;
    setBusy(true);
    try {
      const animalName = typeof schedule.animalId === "string" ? undefined : schedule.animalId?.name;
      const animalId = typeof schedule.animalId === "string" ? schedule.animalId : schedule.animalId?._id;
      await api.post("/log", {
        kind: "medication",
        date,
        status,
        sourceId: schedule._id,
        animalId,
        animalName,
        medicineName: schedule.medicineName,
        dose: schedule.dose,
        note: note.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: qk.log(farmId) });
      showToast("success", t.successDoseLogged);
      setNote("");
      setDate(todayIso());
      setStatus("given");
      onClose();
    } catch {
      showToast("error", t.errLogDose);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!schedule} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.membersHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {t.logDoseTitle}{schedule ? ` · ${schedule.medicineName}` : ""}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.membersClose}>✕</Text>
            </Pressable>
          </View>

          <FieldLabel text={t.datePlaceholder} />
          <DatePickerField value={date} onChange={setDate} t={t} />

          <FieldLabel text={t.statusLabel} />
          <View style={styles.segmentRow}>
            {ADMIN_STATUSES.map((st) => (
              <Pressable
                key={st}
                style={[styles.segment, status === st && styles.segmentActive]}
                onPress={() => setStatus(st)}
              >
                <Text style={[styles.segmentText, status === st && styles.segmentTextActive]}>
                  {t.adminStatusLabels[st]}
                </Text>
              </Pressable>
            ))}
          </View>

          <FieldLabel text={t.eventNoteLabel} />
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder={t.eventNoteLabel}
            placeholderTextColor={C.textMuted}
          />

          <Pressable style={[styles.primaryBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={save}>
            <Text style={styles.primaryBtnText}>{t.logDose}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
