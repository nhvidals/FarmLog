import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { EmptyState, SectionHeader } from "../components";
import { useApp } from "../context";
import { buildCalendarEvents, statusOf } from "../helpers";
import { useAnimals, useAnimalTypes, useIncubation, useMedication } from "../queries";
import { styles } from "../styles";
import { C } from "../theme";

const EVENT_ICON: Record<string, string> = {
  hatch: "🐣",
  medication: "💊",
  incubationStart: "🥚",
  birth: "🍼",
};

export function DashboardScreen({ userEmail, farmName }: { userEmail: string; farmName?: string }) {
  const { t, api, farmId, token, canWrite, setTab, setAnimalSubTab, focusAnimals } = useApp();

  const { data: animals = [] } = useAnimals(api, farmId, token);
  const { data: animalTypes = [] } = useAnimalTypes(api, farmId, token);
  const { data: incubationList = [] } = useIncubation(api, farmId, token);
  const { data: medicationList = [] } = useMedication(api, farmId, token);

  const stats = useMemo(() => {
    const activeCount = animals.filter((a) => statusOf(a) === "active").length;
    const incubating = incubationList.filter(
      (b) => b.hatchedOk === undefined && b.hatchedNok === undefined
    ).length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);
    const upcoming = buildCalendarEvents(animals, incubationList, medicationList)
      .filter((e) => {
        const d = new Date(e.date + "T00:00:00");
        return !Number.isNaN(d.getTime()) && d >= today && d <= weekAhead;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    return { activeCount, incubating, upcoming };
  }, [animals, incubationList, medicationList]);

  return (
    <View>
      <View style={styles.dashHeader}>
        <Text style={styles.dashHello}>
          {t.dashHello}
          {userEmail ? `, ${userEmail.split("@")[0]}` : ""} 👋
        </Text>
        <Text style={styles.dashFarm}>{farmName ?? t.dashSelectFarm}</Text>
      </View>

      {!farmId ? (
        <EmptyState icon="🏡" text={t.createFarmFirst} />
      ) : (
        <>
          <View style={styles.statGrid}>
            <Pressable style={styles.statCard} onPress={() => { setTab("animais"); setAnimalSubTab("animais"); }}>
              <Text style={styles.statValue}>{animals.length}</Text>
              <Text style={styles.statLabel}>{t.dashAnimalsTotal}</Text>
            </Pressable>
            <Pressable style={styles.statCard} onPress={() => focusAnimals({ status: "active" })}>
              <Text style={[styles.statValue, { color: C.vivi }]}>{stats.activeCount}</Text>
              <Text style={styles.statLabel}>{t.dashActive}</Text>
            </Pressable>
            <Pressable style={styles.statCard} onPress={() => { setTab("animais"); setAnimalSubTab("tipos"); }}>
              <Text style={[styles.statValue, { color: C.accent }]}>{animalTypes.length}</Text>
              <Text style={styles.statLabel}>{t.dashTypesTotal}</Text>
            </Pressable>
            <Pressable style={styles.statCard} onPress={() => setTab("incubacao")}>
              <Text style={[styles.statValue, { color: C.ovi }]}>{stats.incubating}</Text>
              <Text style={styles.statLabel}>{t.dashIncubating}</Text>
            </Pressable>
          </View>

          {canWrite && animals.length === 0 && (
            <View style={styles.checklistCard}>
              <Text style={styles.formCardTitle}>{t.dashGetStarted}</Text>
              <Pressable
                style={styles.checklistRow}
                onPress={() => { setTab("animais"); setAnimalSubTab("tipos"); }}
              >
                <Text style={[styles.checklistCheck, animalTypes.length > 0 && styles.checklistCheckDone]}>
                  {animalTypes.length > 0 ? "✓" : "1"}
                </Text>
                <Text style={[styles.checklistLabel, animalTypes.length > 0 && styles.checklistLabelDone]}>
                  {t.dashStepType}
                </Text>
              </Pressable>
              <Pressable
                style={styles.checklistRow}
                onPress={() => { setTab("animais"); setAnimalSubTab("animais"); }}
              >
                <Text style={styles.checklistCheck}>2</Text>
                <Text style={styles.checklistLabel}>{t.dashStepAnimal}</Text>
              </Pressable>
            </View>
          )}

          <SectionHeader title={t.dashUpcoming} count={stats.upcoming.length} />
          {stats.upcoming.length === 0 ? (
            <EmptyState icon="📅" text={t.dashNoUpcoming} />
          ) : (
            stats.upcoming.map((e, i) => (
              <View key={i} style={[styles.card, { borderLeftColor: C.primary, flexDirection: "row", alignItems: "center", gap: 12 }]}>
                <Text style={{ fontSize: 22 }}>{EVENT_ICON[e.kind] ?? "📌"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{e.title}</Text>
                  {e.subtitle ? <Text style={styles.cardSub}>{e.subtitle}</Text> : null}
                </View>
                <Text style={styles.cardMetaText}>{e.date}</Text>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}
