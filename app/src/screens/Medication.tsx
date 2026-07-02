import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Badge, EmptyState, FieldError, FieldLabel, SectionHeader } from "../components";
import { useApp } from "../context";
import { DatePickerField } from "../datepicker";
import { useUndoableDelete } from "../hooks";
import { fmt } from "../i18n";
import { isDate, todayIso, toIsoDateOnly } from "../helpers";
import { qk, useAnimals, useInvalidateFarmData, useLog, useMedication } from "../queries";
import { LogDoseModal } from "./LogDose";
import { styles } from "../styles";
import { C } from "../theme";
import { MEDICATION_FREQUENCIES, MedicationFrequency, MedicationSchedule } from "../types";

export function MedicationScreen() {
  const { t, api, farmId, token, showToast, canWrite } = useApp();
  const invalidate = useInvalidateFarmData(farmId);
  const undoDelete = useUndoableDelete();

  const { data: medicationList = [] } = useMedication(api, farmId, token);
  const { data: animals = [] } = useAnimals(api, farmId, token);
  const { data: log = [] } = useLog(api, farmId, token);

  const [logSchedule, setLogSchedule] = useState<MedicationSchedule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [animalId, setAnimalId] = useState("");
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [date, setDate] = useState(todayIso());
  const [frequency, setFrequency] = useState<MedicationFrequency>("once");
  const [interval, setInterval] = useState("1");
  const [endDate, setEndDate] = useState("");

  type FieldErrors = { animalId?: string; name?: string; dose?: string; date?: string };
  const [errors, setErrors] = useState<FieldErrors>({});
  const clearErr = (k: keyof FieldErrors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  const resetForm = () => {
    setEditingId(null);
    setAnimalId("");
    setName("");
    setDose("");
    setDate(todayIso());
    setFrequency("once");
    setInterval("1");
    setEndDate("");
    setErrors({});
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
    setErrors({});
    setShowForm(true);
  };

  const save = async () => {
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
    const next: FieldErrors = {};
    if (!animalId) next.animalId = t.fieldSelectRequired;
    if (!name.trim()) next.name = t.fieldRequired;
    if (!dose.trim()) next.dose = t.fieldRequired;
    if (!isDate(date)) next.date = t.fieldInvalidDate;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
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

  const remove = (entry: MedicationSchedule) =>
    undoDelete({
      queryKey: qk.medication(farmId),
      item: entry,
      url: `/medication/${entry._id}`,
      onCommitted: invalidate,
    });

  // How many administrations have been logged for a schedule.
  const loggedCount = (id: string) =>
    log.filter((l) => l.kind === "medication" && l.sourceId === id).length;

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
                onPress={() => { setAnimalId(animal._id); clearErr("animalId"); }}
              >
                <Text style={[styles.chipText, animalId === animal._id && styles.chipTextActive]}>
                  {animal.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <FieldError text={errors.animalId} />

          <FieldLabel text={t.medicinePlaceholder} />
          <TextInput style={[styles.input, errors.name && styles.inputError]} value={name}
            onChangeText={(v) => { setName(v); clearErr("name"); }}
            placeholder={t.medicinePlaceholder} placeholderTextColor={C.textMuted} />
          <FieldError text={errors.name} />

          <FieldLabel text={t.dosePlaceholder} />
          <TextInput style={[styles.input, errors.dose && styles.inputError]} value={dose}
            onChangeText={(v) => { setDose(v); clearErr("dose"); }}
            placeholder={t.dosePlaceholder} placeholderTextColor={C.textMuted} />
          <FieldError text={errors.dose} />

          <FieldLabel text={t.datePlaceholder} />
          <DatePickerField value={date} onChange={(v) => { setDate(v); clearErr("date"); }} t={t} />
          <FieldError text={errors.date} />

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
              {loggedCount(entry._id) > 0 && (
                <Text style={styles.cardMetaText}>🗒 {fmt(t.dosesLogged, { n: String(loggedCount(entry._id)) })}</Text>
              )}
            </View>
            {canWrite && (
              <>
                <View style={styles.cardActions}>
                  <Pressable style={[styles.cardActionBtn, { backgroundColor: C.primaryLight, borderColor: C.primary }]} onPress={() => setLogSchedule(entry)}>
                    <Text style={[styles.cardActionBtnText, { color: C.primary }]}>🗒 {t.logDose}</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <Pressable style={styles.cardActionBtn} onPress={() => startEdit(entry)}>
                    <Text style={styles.cardActionBtnText}>✏️ {t.edit}</Text>
                  </Pressable>
                  <Pressable style={[styles.cardActionBtn, styles.cardActionBtnDanger]} onPress={() => remove(entry)} accessibilityLabel={t.delete}>
                    <Text style={[styles.cardActionBtnText, styles.cardActionBtnTextDanger]}>🗑 {t.delete}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ))
      )}

      <LogDoseModal schedule={logSchedule} onClose={() => setLogSchedule(null)} />
    </View>
  );
}
