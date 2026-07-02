import { useMemo } from "react";
import { Text, View } from "react-native";
import { statusOf } from "../helpers";
import { fmt, T } from "../i18n";
import { styles } from "../styles";
import { C } from "../theme";
import { Animal, AnimalType, IncubationBatch } from "../types";

/** A labelled proportional bar (no chart library needed). */
function StatBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
}

export function Analytics({
  animals,
  animalTypes,
  incubationList,
  t,
}: {
  animals: Animal[];
  animalTypes: AnimalType[];
  incubationList: IncubationBatch[];
  t: T;
}) {
  const stats = useMemo(() => {
    const status = { active: 0, sold: 0, deceased: 0 };
    const sex = { male: 0, female: 0 };
    const typeCounts = new Map<string, number>();
    for (const a of animals) {
      status[statusOf(a)]++;
      sex[a.sex]++;
      typeCounts.set(a.designation, (typeCounts.get(a.designation) ?? 0) + 1);
    }
    const byType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Incubation performance over batches that have a recorded result.
    let ok = 0;
    let nok = 0;
    let completed = 0;
    for (const b of incubationList) {
      if (b.hatchedOk === undefined && b.hatchedNok === undefined) continue;
      completed++;
      ok += b.hatchedOk ?? 0;
      nok += b.hatchedNok ?? 0;
    }
    const hatchTotal = ok + nok;
    const rate = hatchTotal > 0 ? Math.round((ok / hatchTotal) * 100) : null;

    // Top breeders: animals with the most recorded offspring.
    const offspring = new Map<string, number>();
    for (const a of animals) {
      if (a.fatherId) offspring.set(a.fatherId, (offspring.get(a.fatherId) ?? 0) + 1);
      if (a.motherId) offspring.set(a.motherId, (offspring.get(a.motherId) ?? 0) + 1);
    }
    const byId = new Map(animals.map((a) => [a._id, a]));
    const breeders = [...offspring.entries()]
      .map(([id, n]) => ({ animal: byId.get(id), n }))
      .filter((x): x is { animal: Animal; n: number } => !!x.animal)
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);

    return { status, sex, byType, ok, nok, completed, hatchTotal, rate, breeders };
  }, [animals, incubationList]);

  if (animals.length === 0) return null;

  const maxType = Math.max(1, ...stats.byType.map(([, n]) => n));

  return (
    <View>
      <Text style={styles.analyticsHeader}>📊 {t.analyticsTitle}</Text>

      {/* Flock composition */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsCardTitle}>{t.flockComposition}</Text>

        <Text style={styles.analyticsGroupLabel}>{t.byStatus}</Text>
        <StatBar label={t.statusLabels.active} count={stats.status.active} max={animals.length} color={C.vivi} />
        <StatBar label={t.statusLabels.sold} count={stats.status.sold} max={animals.length} color={C.accent} />
        <StatBar label={t.statusLabels.deceased} count={stats.status.deceased} max={animals.length} color={C.textMuted} />

        <Text style={styles.analyticsGroupLabel}>{t.bySex}</Text>
        <StatBar label={t.sexLabels.female} count={stats.sex.female} max={animals.length} color={C.female} />
        <StatBar label={t.sexLabels.male} count={stats.sex.male} max={animals.length} color={C.male} />

        {stats.byType.length > 0 && (
          <>
            <Text style={styles.analyticsGroupLabel}>{t.byType}</Text>
            {stats.byType.map(([name, n]) => (
              <StatBar key={name} label={name} count={n} max={maxType} color={C.primary} />
            ))}
          </>
        )}
      </View>

      {/* Incubation performance */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsCardTitle}>{t.incubationPerformance}</Text>
        {stats.rate === null ? (
          <Text style={styles.treeHint}>{t.noResultsYet}</Text>
        ) : (
          <>
            <View style={styles.rateRow}>
              <Text style={styles.rateValue}>{stats.rate}%</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rateLabel}>{t.successRate}</Text>
                <Text style={styles.rateSub}>{fmt(t.hatchedOf, { ok: String(stats.ok), total: String(stats.hatchTotal) })}</Text>
              </View>
            </View>
            <Text style={styles.analyticsGroupLabel}>
              {fmt(t.batchesCompleted, { done: String(stats.completed), total: String(incubationList.length) })}
            </Text>
          </>
        )}
      </View>

      {/* Top breeders */}
      {stats.breeders.length > 0 && (
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsCardTitle}>{t.topBreeders}</Text>
          {stats.breeders.map(({ animal, n }, i) => (
            <View key={animal._id} style={styles.breederRow}>
              <Text style={styles.breederRank}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.breederName} numberOfLines={1}>{animal.name}</Text>
                <Text style={styles.breederSub} numberOfLines={1}>{animal.ringNumber} · {animal.designation}</Text>
              </View>
              <Text style={styles.breederCount}>{fmt(t.offspringCount, { n: String(n) })}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
