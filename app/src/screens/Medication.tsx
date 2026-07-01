import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Badge, EmptyState, FieldLabel, SectionHeader } from "../components";
import { useApp } from "../context";
import { DatePickerField } from "../datepicker";
import { fmt } from "../i18n";
import { isDate, scheduleLocalNotification, toIsoDateOnly } from "../helpers";
import { useAnimals, useInvalidateFarmData, useMedication } from "../queries";
import { styles } from "../styles";
import { C } from "../theme";

export function MedicationScreen() {
  const { t, api, farmId, token, showToast, canWrite } = useApp();
  const invalidate = useInvalidateFarmData(farmId);

  const { data: medicationList = [] } = useMedication(api, farmId, token);
  const { data: animals = [] } = useAnimals(api, farmId, token);

  const [showForm, setShowForm] = useState(false);
  const [animalId, setAnimalId] = useState("");
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [date, setDate] = useState("2026-06-24");

  const create = async () => {
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
    if (!animalId || !name.trim() || !dose.trim()) { showToast("warning", t.valMedicationFields); return; }
    if (!isDate(date)) { showToast("warning", t.valDate); return; }
    try {
      await api.post("/medication", {
        animalId,
        medicineName: name.trim(),
        dose: dose.trim(),
        date,
      });
      const notifBody = fmt(t.notifMedicationBody, { name, dose });
      await scheduleLocalNotification(t.notifMedicationTitle, notifBody, new Date(date + "T09:00:00"));
      setName("");
      setDose("");
      setShowForm(false);
      invalidate();
      showToast("success", t.successMedicationCreated);
    } catch {
      showToast("error", t.errCreateMedication);
    }
  };

  return (
    <View>
      <SectionHeader
        title={t.records}
        count={medicationList.length}
        onAdd={farmId && canWrite ? () => setShowForm(!showForm) : undefined}
        open={showForm}
      />

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>{t.medicationPlan}</Text>

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

          <Pressable style={styles.primaryBtn} onPress={create}>
            <Text style={styles.primaryBtnText}>{t.saveMedication}</Text>
          </Pressable>
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
            </View>
          </View>
        ))
      )}
    </View>
  );
}
