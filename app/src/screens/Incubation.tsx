import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Badge, EmptyState, FieldError, FieldLabel, SectionHeader } from "../components";
import { useApp } from "../context";
import { DatePickerField } from "../datepicker";
import { useUndoableDelete } from "../hooks";
import { addDaysIso, daysBetweenIso, isDate, todayIso, toIsoDateOnly } from "../helpers";
import { qk, useAnimalTypes, useIncubation, useInvalidateFarmData } from "../queries";
import { styles } from "../styles";
import { C } from "../theme";
import { IncubationBatch } from "../types";

// Typical avian incubation (chicken); a sensible default the user can adjust.
const INCUBATION_DEFAULT_DAYS = 21;

export function IncubationScreen() {
  const { t, api, farmId, token, showToast, setTab, setAnimalSubTab, canWrite } = useApp();
  const invalidate = useInvalidateFarmData(farmId);
  const undoDelete = useUndoableDelete();

  const { data: incubationList = [] } = useIncubation(api, farmId, token);
  const { data: animalTypes = [] } = useAnimalTypes(api, farmId, token);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [species, setSpecies] = useState("");
  const [eggCount, setEggCount] = useState("");
  const [incubatorName, setIncubatorName] = useState("");
  const [startDate, setStartDate] = useState(todayIso);
  const [expectedDate, setExpectedDate] = useState(() => addDaysIso(todayIso(), INCUBATION_DEFAULT_DAYS));
  const [resultBatchId, setResultBatchId] = useState<string | null>(null);
  const [resultOk, setResultOk] = useState("");
  const [resultNok, setResultNok] = useState("");

  type FieldErrors = { species?: string; incubatorName?: string; eggCount?: string; startDate?: string; expectedDate?: string };
  const [errors, setErrors] = useState<FieldErrors>({});
  const clearErr = (k: keyof FieldErrors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  const resetForm = () => {
    setEditingId(null);
    setSpecies("");
    setEggCount("");
    setIncubatorName("");
    setStartDate(todayIso());
    setExpectedDate(addDaysIso(todayIso(), INCUBATION_DEFAULT_DAYS));
    setErrors({});
  };

  // Moving the start date shifts the hatch date by the same amount, preserving
  // the incubation duration the user has set instead of silently overwriting it.
  const onStartChange = (next: string) => {
    const gap = daysBetweenIso(startDate, expectedDate);
    setStartDate(next);
    clearErr("startDate");
    if (gap !== null && gap >= 0) setExpectedDate(addDaysIso(next, gap));
  };

  const startEdit = (batch: IncubationBatch) => {
    setEditingId(batch._id);
    setSpecies(batch.species);
    setEggCount(String(batch.eggCount));
    setIncubatorName(batch.incubatorName);
    setStartDate(toIsoDateOnly(batch.startDate));
    setExpectedDate(toIsoDateOnly(batch.expectedHatchDate));
    setResultBatchId(null);
    setErrors({});
    setShowForm(true);
  };

  const save = async () => {
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
    const eggs = Number(eggCount);
    const next: FieldErrors = {};
    if (!species.trim()) next.species = t.fieldSelectRequired;
    if (!incubatorName.trim()) next.incubatorName = t.fieldRequired;
    if (!eggCount.trim() || Number.isNaN(eggs) || eggs < 1) next.eggCount = t.fieldInvalidNumber;
    if (!isDate(startDate)) next.startDate = t.fieldInvalidDate;
    if (!isDate(expectedDate)) next.expectedDate = t.fieldInvalidDate;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const payload = {
      species,
      eggCount: Number(eggCount),
      incubatorName: incubatorName.trim(),
      startDate,
      expectedHatchDate: expectedDate,
    };
    try {
      // Notifications are (re)scheduled centrally by ReminderScheduler.
      if (editingId) {
        await api.put(`/incubation/${editingId}`, payload);
      } else {
        await api.post("/incubation", payload);
      }
      resetForm();
      setShowForm(false);
      invalidate();
      showToast("success", editingId ? t.successUpdated : t.successIncubationCreated);
    } catch {
      showToast("error", editingId ? t.errUpdate : t.errCreateIncubation);
    }
  };

  const remove = (batch: IncubationBatch) =>
    undoDelete({
      queryKey: qk.incubation(farmId),
      item: batch,
      url: `/incubation/${batch._id}`,
      onCommitted: invalidate,
    });

  const openResultForm = (batch: IncubationBatch) => {
    setResultBatchId(batch._id);
    setResultOk(batch.hatchedOk !== undefined ? String(batch.hatchedOk) : "");
    setResultNok(batch.hatchedNok !== undefined ? String(batch.hatchedNok) : "");
  };

  const saveResult = async (batchId: string) => {
    const ok = Number(resultOk);
    const nok = Number(resultNok);
    if ((resultOk !== "" && (Number.isNaN(ok) || ok < 0)) || (resultNok !== "" && (Number.isNaN(nok) || nok < 0))) {
      showToast("warning", t.errSaveResult);
      return;
    }
    try {
      await api.put(`/incubation/${batchId}`, {
        hatchedOk: resultOk === "" ? undefined : ok,
        hatchedNok: resultNok === "" ? undefined : nok,
      });
      setResultBatchId(null);
      invalidate();
      showToast("success", t.successResult);
    } catch {
      showToast("error", t.errSaveResult);
    }
  };

  return (
    <View>
      <SectionHeader
        title={t.batches}
        count={incubationList.length}
        onAdd={farmId && canWrite ? () => { if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } } : undefined}
        open={showForm}
      />

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>{editingId ? t.editRecord : t.registerIncubation}</Text>

          <FieldLabel text={t.animalTypeLabel} />
          {animalTypes.length === 0 ? (
            <Pressable onPress={() => { setTab("animais"); setAnimalSubTab("tipos"); }}>
              <Text style={styles.linkHint}>➕ {t.createTypeFirst}</Text>
            </Pressable>
          ) : (
            <ScrollView horizontal contentContainerStyle={styles.chipRow} showsHorizontalScrollIndicator={false}>
              {animalTypes.map((type) => (
                <Pressable key={type._id}
                  style={[styles.chip, species === type.name && styles.chipActive]}
                  onPress={() => { setSpecies(type.name); clearErr("species"); }}
                >
                  <Text style={[styles.chipText, species === type.name && styles.chipTextActive]}>{type.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <FieldError text={errors.species} />

          <FieldLabel text={t.eggCountPlaceholder} />
          <TextInput style={[styles.input, errors.eggCount && styles.inputError]} value={eggCount}
            onChangeText={(v) => { setEggCount(v); clearErr("eggCount"); }}
            placeholder={t.eggCountPlaceholder} keyboardType="numeric" placeholderTextColor={C.textMuted} />
          <FieldError text={errors.eggCount} />

          <FieldLabel text={t.incubatorPlaceholder} />
          <TextInput style={[styles.input, errors.incubatorName && styles.inputError]} value={incubatorName}
            onChangeText={(v) => { setIncubatorName(v); clearErr("incubatorName"); }}
            placeholder={t.incubatorPlaceholder} placeholderTextColor={C.textMuted} />
          <FieldError text={errors.incubatorName} />

          <FieldLabel text={t.startDatePlaceholder} />
          <DatePickerField value={startDate} onChange={onStartChange} t={t} />
          <FieldError text={errors.startDate} />

          <FieldLabel text={t.hatchDatePlaceholder} />
          <DatePickerField value={expectedDate} onChange={(v) => { setExpectedDate(v); clearErr("expectedDate"); }} t={t} minValue={startDate} />
          <FieldError text={errors.expectedDate} />

          <Pressable style={styles.primaryBtn} onPress={save}>
            <Text style={styles.primaryBtnText}>{editingId ? t.saveChanges : t.saveIncubation}</Text>
          </Pressable>
          {editingId && (
            <Pressable style={styles.outlineBtn} onPress={() => { resetForm(); setShowForm(false); }}>
              <Text style={styles.outlineBtnText}>{t.cancelEdit}</Text>
            </Pressable>
          )}
        </View>
      )}

      {incubationList.length === 0 ? (
        <EmptyState icon="🥚" text={t.noBatches} />
      ) : (
        incubationList.map((batch) => (
          <View key={batch._id} style={[styles.card, { borderLeftColor: C.accent }]}>
            <View style={styles.cardTop}>
              <View style={styles.cardTopLeft}>
                <Text style={styles.cardName}>{batch.incubatorName}</Text>
                <Text style={styles.cardSub}>{t.speciesLabel} {batch.species}</Text>
              </View>
              <Badge label={`${batch.eggCount} 🥚`} color={C.ovi} bg={C.oviBg} />
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.cardMetaText}>📅 {t.startLabel} {toIsoDateOnly(batch.startDate)}</Text>
              <Text style={styles.cardMetaText}>🐣 {t.hatchLabel} {toIsoDateOnly(batch.expectedHatchDate)}</Text>
            </View>

            {(batch.hatchedOk !== undefined || batch.hatchedNok !== undefined) && (
              <View style={styles.cardMeta}>
                <Text style={[styles.cardMetaText, { color: C.vivi, fontWeight: "700" }]}>✅ {batch.hatchedOk ?? 0} OK</Text>
                <Text style={[styles.cardMetaText, { color: C.danger, fontWeight: "700" }]}>❌ {batch.hatchedNok ?? 0} NOK</Text>
              </View>
            )}

            {resultBatchId === batch._id ? (
              <View style={styles.resultForm}>
                <Text style={styles.formCardTitle}>{t.incResultTitle}</Text>
                <View style={styles.resultRow}>
                  <View style={styles.resultField}>
                    <FieldLabel text={t.incOkPlaceholder} />
                    <TextInput style={styles.input} value={resultOk} onChangeText={setResultOk}
                      keyboardType="numeric" placeholder="0" placeholderTextColor={C.textMuted} />
                  </View>
                  <View style={styles.resultField}>
                    <FieldLabel text={t.incNokPlaceholder} />
                    <TextInput style={styles.input} value={resultNok} onChangeText={setResultNok}
                      keyboardType="numeric" placeholder="0" placeholderTextColor={C.textMuted} />
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Pressable style={styles.cardActionBtn} onPress={() => setResultBatchId(null)}>
                    <Text style={styles.cardActionBtnText}>{t.cancel}</Text>
                  </Pressable>
                  <Pressable style={[styles.cardActionBtn, { backgroundColor: C.primary, borderColor: C.primary }]} onPress={() => saveResult(batch._id)}>
                    <Text style={[styles.cardActionBtnText, { color: "#fff" }]}>{t.saveResult}</Text>
                  </Pressable>
                </View>
              </View>
            ) : canWrite ? (
              <>
                <View style={styles.cardActions}>
                  <Pressable style={styles.cardActionBtn} onPress={() => openResultForm(batch)}>
                    <Text style={styles.cardActionBtnText}>
                      {(batch.hatchedOk !== undefined || batch.hatchedNok !== undefined) ? `✏️ ${t.editResult}` : `🐣 ${t.registerResult}`}
                    </Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <Pressable style={styles.cardActionBtn} onPress={() => startEdit(batch)}>
                    <Text style={styles.cardActionBtnText}>✏️ {t.edit}</Text>
                  </Pressable>
                  <Pressable style={[styles.cardActionBtn, styles.cardActionBtnDanger]} onPress={() => remove(batch)} accessibilityLabel={t.delete}>
                    <Text style={[styles.cardActionBtnText, styles.cardActionBtnTextDanger]}>🗑 {t.delete}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
