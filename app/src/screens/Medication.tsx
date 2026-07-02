import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Badge, EmptyState, FieldLabel, SectionHeader } from "../components";
import { useApp } from "../context";
import { DatePickerField } from "../datepicker";
import { fmt } from "../i18n";
import { isDate, toIsoDateOnly } from "../helpers";
import { useAnimals, useInvalidateFarmData, useMedication } from "../queries";
import { styles } from "../styles";
import { C } from "../theme";
import { MEDICATION_FREQUENCIES, MedicationFrequency, MedicationSchedule } from "../types";

export function MedicationScreen() {
  const { t, api, farmId, token, showToast, confirm, canWrite } = useApp();
  const invalidate = useInvalidateFarmData(farmId);

  const { data: medicationList = [] } = useMedication(api, farmId, token);
  const { data: animals = [] } = useAnimals(api, farmId, token);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [animalId, setAnimalId] = useState("");
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [date, setDate] = useState("2026-06-24");
  const [frequency, setFrequency] = useState<MedicationFrequency>("once");
  const [interval, setInterval] = useState("1");
  const [endDate, setEndDate] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setAnimalId("");
    setName("");
    setDose("");
    setDate("2026-06-24");
    setFrequency("once");
    setInterval("1");
    setEndDate("");
  };

  const startEdit = (entry: MedicationSchedule) => {
    setEditingId(entry._id);
    setAnimalId(typeof entry.animalId === "string" ? entry.animalId : entry.animalId._id);
    setName(entry.medicineName);
    setDose(entry.dose);
    setDate(toIsoDateOnly(entry.date));
    setFrequency(entry.frequency ?? "once");
    setInterval(String(entry.interval ?? 1));
    setEndDate(toIsoDateOnly(entry.endDate));
    setShowForm(true);
  };

  const save = async () => {
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
    if (!animalId || !name.trim() || !dose.trim()) { showToast("warning", t.valMedicationFields); return; }
    if (!isDate(date)) { showToast("warning", t.valDate); return; }
    const recurring = frequency !== "once";
    const payload = {
      animalId,
      medicineName: name.trim(),
      dose: dose.trim(),
      date,
      frequency,
      interval: recurring ? Math.max(1, Number(interval) || 1) : 1,
      endDate: recurring && endDate ? endDate : undefined,
    };
    try {
      // Notifications are (re)scheduled centrally by ReminderScheduler from the
      // stored schedules, so this only persists the record.
      if (editingId) {
        await api.put(`/medication/${editingId}`, payload);
      } else {
        await api.post("/medication", payload);
      }
      resetForm();
      setShowForm(false);
      invalidate();
      showToast("success", editingId ? t.successUpdated : t.successMedicationCreated);
    } catch {
      showToast("error", editingId ? t.errUpdate : t.errCreateMedication);
    }
  };

  const remove = (id: string) => {
    confirm({
      title: t.confirmDeleteRecordTitle,
      message: t.confirmDeleteRecordMsg,
      confirmLabel: t.delete,
      onConfirm: async () => {
        try {
          await api.delete(`/medication/${id}`);
          invalidate();
          showToast("success", t.successDeleted);
        } catch {
          showToast("error", t.errDelete);
        }
      },
    });
  };

  // Human-readable recurrence label for a schedule, or null when one-off.
  const recurrenceLabel = (m: MedicationSchedule): string | null => {
    const f = m.frequency ?? "once";
    if (f === "once") return null;
    const n = m.interval ?? 1;
    return n === 1 ? t.freqLabels[f] : fmt(t.recurringEvery, { n: String(n), unit: t.unitLabels[f] });
  };

  return (
    <View>
      <SectionHeader
        title={t.records}
        count={medicationList.length}
        onAdd={farmId && canWrite ? () => { if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } } : undefined}
        open={showForm}
      />

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>{editingId ? t.editRecord : t.medicationPlan}</Text>

          <FieldLabel text={t.animalLabel} />
          <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
            {animals.map((animal) => (
              <Pressable
                key={animal._id}
                style={[styles.chip, animalId === animal._id && styles.chipActive]}
                onPress={() => setAnimalId(animal._id)}
              >
                <Text style={[styles.chipText, animalId === animal._id && styles.chipTextActive]}>
                  {animal.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <FieldLabel text={t.medicinePlaceholder} />
          <TextInput style={styles.input} value={name} onChangeText={setName}
            placeholder={t.medicinePlaceholder} placeholderTextColor={C.textMuted} />

          <FieldLabel text={t.dosePlaceholder} />
          <TextInput style={styles.input} value={dose} onChangeText={setDose}
            placeholder={t.dosePlaceholder} placeholderTextColor={C.textMuted} />

          <FieldLabel text={t.datePlaceholder} />
          <DatePickerField value={date} onChange={setDate} t={t} />

          <FieldLabel text={t.freqLabel} />
          <View style={styles.segmentRow}>
            {MEDICATION_FREQUENCIES.map((f) => (
              <Pressable
                key={f}
                style={[styles.segment, frequency === f && styles.segmentActive]}
                onPress={() => setFrequency(f)}
              >
                <Text style={[styles.segmentText, frequency === f && styles.segmentTextActive]}>
                  {t.freqLabels[f]}
                </Text>
              </Pressable>
            ))}
          </View>

          {frequency !== "once" && (
            <>
              <FieldLabel text={t.repeatEvery} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TextInput
                  style={[styles.input, { width: 80, marginBottom: 0 }]}
                  value={interval}
                  onChangeText={setInterval}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={C.textMuted}
                />
                <Text style={styles.cardSub}>{t.unitLabels[frequency]}</Text>
              </View>

              <FieldLabel text={t.endDateLabel} />
              <DatePickerField value={endDate} onChange={setEndDate} t={t} optional minValue={date} />
            </>
          )}

          <Pressable style={styles.primaryBtn} onPress={save}>
            <Text style={styles.primaryBtnText}>{editingId ? t.saveChanges : t.saveMedication}</Text>
          </Pressable>
          {editingId && (
            <Pressable style={styles.outlineBtn} onPress={() => { resetForm(); setShowForm(false); }}>
              <Text style={styles.outlineBtnText}>{t.cancelEdit}</Text>
            </Pressable>
          )}
        </View>
      )}

      {medicationList.length === 0 ? (
        <EmptyState icon="💊" text={t.noMedication} />
      ) : (
        medicationList.map((entry) => (
          <View key={entry._id} style={[styles.card, { borderLeftColor: C.danger }]}>
            <View style={styles.cardTop}>
              <View style={styles.cardTopLeft}>
                <Text style={styles.cardName}>{entry.medicineName}</Text>
                <Text style={styles.cardSub}>
                  🐾 {typeof entry.animalId === "string" ? entry.animalId : entry.animalId.name ?? entry.animalId._id}
                </Text>
              </View>
              <Badge label={entry.dose} color={C.danger} bg={C.dangerBg} />
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaText}>📅 {toIsoDateOnly(entry.date)}</Text>
              {recurrenceLabel(entry) && (
                <Text style={styles.cardMetaText}>🔁 {recurrenceLabel(entry)}</Text>
              )}
            </View>
            {canWrite && (
              <View style={styles.cardActions}>
                <Pressable style={styles.cardActionBtn} onPress={() => startEdit(entry)}>
                  <Text style={styles.cardActionBtnText}>✏️ {t.edit}</Text>
                </Pressable>
                <Pressable style={[styles.cardActionBtn, styles.cardActionBtnDanger]} onPress={() => remove(entry._id)}>
                  <Text style={[styles.cardActionBtnText, styles.cardActionBtnTextDanger]}>🗑 {t.delete}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}
