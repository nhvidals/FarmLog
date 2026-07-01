import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Badge, EmptyState, FieldLabel, SectionHeader } from "../components";
import { useApp } from "../context";
import { DatePickerField } from "../datepicker";
import { fmt } from "../i18n";
import { isDate, scheduleLocalNotification, toIsoDateOnly } from "../helpers";
import { useAnimalTypes, useIncubation, useInvalidateFarmData } from "../queries";
import { styles } from "../styles";
import { C } from "../theme";
import { IncubationBatch } from "../types";

export function IncubationScreen() {
  const { t, api, farmId, token, showToast, setTab, setAnimalSubTab, canWrite } = useApp();
  const invalidate = useInvalidateFarmData(farmId);

  const { data: incubationList = [] } = useIncubation(api, farmId, token);
  const { data: animalTypes = [] } = useAnimalTypes(api, farmId, token);

  const [showForm, setShowForm] = useState(false);
  const [species, setSpecies] = useState("");
  const [eggCount, setEggCount] = useState("12");
  const [incubatorName, setIncubatorName] = useState("Incubadora A");
  const [startDate, setStartDate] = useState("2026-06-23");
  const [expectedDate, setExpectedDate] = useState("2026-07-14");
  const [resultBatchId, setResultBatchId] = useState<string | null>(null);
  const [resultOk, setResultOk] = useState("");
  const [resultNok, setResultNok] = useState("");

  const create = async () => {
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
    if (!isDate(startDate) || !isDate(expectedDate)) { showToast("warning", t.valDates); return; }
    if (!species.trim() || !incubatorName.trim() || Number(eggCount) < 1 || Number.isNaN(Number(eggCount))) {
      showToast("warning", t.valIncubationFields);
      return;
    }
    try {
      await api.post("/incubation", {
        species,
        eggCount: Number(eggCount),
        incubatorName: incubatorName.trim(),
        startDate,
        expectedHatchDate: expectedDate,
      });
      const notifBody = fmt(t.notifIncubationBody, { name: incubatorName });
      await scheduleLocalNotification(t.notifIncubationTitle, notifBody, new Date(expectedDate + "T09:00:00"));
      setShowForm(false);
      invalidate();
      showToast("success", t.successIncubationCreated);
    } catch {
      showToast("error", t.errCreateIncubation);
    }
  };

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
        onAdd={farmId && canWrite ? () => setShowForm(!showForm) : undefined}
        open={showForm}
      />

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>{t.registerIncubation}</Text>

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
                  onPress={() => setSpecies(type.name)}
                >
                  <Text style={[styles.chipText, species === type.name && styles.chipTextActive]}>{type.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <FieldLabel text={t.eggCountPlaceholder} />
          <TextInput style={styles.input} value={eggCount} onChangeText={setEggCount}
            placeholder={t.eggCountPlaceholder} keyboardType="numeric" placeholderTextColor={C.textMuted} />

          <FieldLabel text={t.incubatorPlaceholder} />
          <TextInput style={styles.input} value={incubatorName} onChangeText={setIncubatorName}
            placeholder={t.incubatorPlaceholder} placeholderTextColor={C.textMuted} />

          <FieldLabel text={t.startDatePlaceholder} />
          <DatePickerField value={startDate} onChange={setStartDate} t={t} />

          <FieldLabel text={t.hatchDatePlaceholder} />
          <DatePickerField value={expectedDate} onChange={setExpectedDate} t={t} minValue={startDate} />

          <Pressable style={styles.primaryBtn} onPress={create}>
            <Text style={styles.primaryBtnText}>{t.saveIncubation}</Text>
          </Pressable>
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
              <View style={styles.cardActions}>
                <Pressable style={styles.cardActionBtn} onPress={() => openResultForm(batch)}>
                  <Text style={styles.cardActionBtnText}>
                    {(batch.hatchedOk !== undefined || batch.hatchedNok !== undefined) ? `✏️ ${t.editResult}` : `🐣 ${t.registerResult}`}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
