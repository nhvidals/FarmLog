import { useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { EmptyState, SectionHeader } from "../components";
import { useApp } from "../context";
import { useConfirmDelete } from "../hooks";
import { toIsoDateOnly } from "../helpers";
import { qk, useAnimals, useIncubation, useInvalidateFarmData, useLog, useMedication } from "../queries";
import { buildIncubationCsv, buildInventoryCsv, buildLogCsv, buildTreatmentCsv } from "../reports";
import { shareTextFile } from "../share";
import { styles } from "../styles";
import { C } from "../theme";
import { LOG_KINDS, LogKind } from "../types";

export function DataScreen() {
  const { t, api, farmId, token, showToast, canWrite } = useApp();
  const invalidate = useInvalidateFarmData(farmId);
  const queryClient = useQueryClient();
  const confirmDelete = useConfirmDelete();

  const { data: animals = [] } = useAnimals(api, farmId, token);
  const { data: medication = [] } = useMedication(api, farmId, token);
  const { data: incubation = [] } = useIncubation(api, farmId, token);
  const { data: log = [] } = useLog(api, farmId, token);

  const [logFilter, setLogFilter] = useState<LogKind | "all">("all");
  const visibleLog = log.filter((e) => logFilter === "all" || e.kind === logFilter);

  const deleteLogEntry = (id: string) =>
    confirmDelete({
      url: `/log/${id}`,
      onDeleted: () => queryClient.invalidateQueries({ queryKey: qk.log(farmId) }),
    });

  const exportData = async () => {
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
    try {
      const res = await api.get("/data/export");
      const json = JSON.stringify(res.data, null, 2);
      const ok = await shareTextFile(`farm-export-${Date.now()}.json`, json, "application/json");
      showToast(ok ? "success" : "error", ok ? t.successExport : t.errExport);
    } catch {
      showToast("error", t.errExport);
    }
  };

  const importData = async () => {
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
    try {
      const file = await DocumentPicker.getDocumentAsync({ multiple: false, type: "application/json" });
      if (file.canceled || !file.assets[0]) return;
      const asset = file.assets[0];
      // On web the picked asset is a blob URI that legacy FileSystem cannot read;
      // fetch reads it directly. On native, read from the file system.
      const content = Platform.OS === "web"
        ? await fetch(asset.uri).then((r) => r.text())
        : await FileSystem.readAsStringAsync(asset.uri);
      const payload = JSON.parse(content);
      await api.post("/data/import", payload);
      invalidate();
      showToast("success", t.successImport);
    } catch {
      showToast("error", t.errImport);
    }
  };

  const runReport = async (fileBase: string, rows: unknown[], build: () => string) => {
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
    if (rows.length === 0) { showToast("warning", t.reportEmpty); return; }
    try {
      const ok = await shareTextFile(`${fileBase}-${Date.now()}.csv`, build(), "text/csv");
      showToast(ok ? "success" : "error", ok ? t.successReport : t.errReport);
    } catch {
      showToast("error", t.errReport);
    }
  };

  const reports = [
    {
      icon: "🐾",
      title: t.reportInventory,
      desc: t.reportInventoryDesc,
      count: animals.length,
      onPress: () => runReport("animals", animals, () => buildInventoryCsv(animals, t)),
    },
    {
      icon: "💊",
      title: t.reportTreatment,
      desc: t.reportTreatmentDesc,
      count: medication.length,
      onPress: () => runReport("treatments", medication, () => buildTreatmentCsv(medication, t)),
    },
    {
      icon: "🥚",
      title: t.reportIncubation,
      desc: t.reportIncubationDesc,
      count: incubation.length,
      onPress: () => runReport("incubation", incubation, () => buildIncubationCsv(incubation, t)),
    },
    {
      icon: "🗒",
      title: t.historyLog,
      desc: t.historyLogDesc,
      count: log.length,
      onPress: () => runReport("history", log, () => buildLogCsv(log, t)),
    },
  ];

  return (
    <View>
      {/* ── Activity history (append-only log) ── */}
      <SectionHeader title={t.historyLog} count={log.length} />
      {log.length > 0 && (
        <View style={[styles.chipWrapRow, { marginBottom: 8 }]}>
          {(["all", ...LOG_KINDS] as const).map((k) => (
            <Pressable
              key={k}
              style={[styles.chip, logFilter === k && styles.chipActive]}
              onPress={() => setLogFilter(k)}
            >
              <Text style={[styles.chipText, logFilter === k && styles.chipTextActive]}>
                {k === "all" ? t.filterAll : k === "medication" ? t.tabMedication : t.tabIncubation}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {log.length === 0 ? (
        <EmptyState icon="🗒" text={t.noLogEntries} />
      ) : (
        visibleLog.map((e) => (
          <View
            key={e._id}
            style={[styles.card, { borderLeftColor: e.kind === "medication" ? C.danger : C.accent, flexDirection: "row", alignItems: "center", gap: 10 }]}
          >
            <Text style={{ fontSize: 20 }}>{e.kind === "medication" ? "💊" : "🥚"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{e.kind === "medication" ? e.medicineName : e.incubatorName}</Text>
              <Text style={styles.cardSub}>
                {e.kind === "medication"
                  ? [e.animalName, e.status ? t.adminStatusLabels[e.status] : "", e.dose].filter(Boolean).join(" · ")
                  : `${e.species ?? ""} · ${e.hatchedOk ?? 0}/${(e.hatchedOk ?? 0) + (e.hatchedNok ?? 0)}`}
              </Text>
            </View>
            <Text style={styles.cardMetaText}>{toIsoDateOnly(e.date)}</Text>
            {canWrite && (
              <Pressable onPress={() => deleteLogEntry(e._id)} hitSlop={6} style={{ paddingHorizontal: 6 }}>
                <Text style={{ fontSize: 14 }}>🗑</Text>
              </Pressable>
            )}
          </View>
        ))
      )}

      {/* ── Reports (CSV) ── */}
      <SectionHeader title={t.reportsTitle} />
      {reports.map((r) => (
        <View key={r.title} style={styles.dataCard}>
          <View style={styles.dataCardIcon}><Text style={styles.dataCardIconText}>{r.icon}</Text></View>
          <View style={styles.dataCardBody}>
            <Text style={styles.dataCardTitle}>{r.title}</Text>
            <Text style={styles.dataCardDesc}>{r.desc}</Text>
            <Pressable style={styles.outlineBtn} onPress={r.onPress}>
              <Text style={styles.outlineBtnText}>📄 {t.exportCsv} ({r.count})</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {/* ── Import / Export (JSON) ── */}
      <SectionHeader title={t.importExport} />

      <View style={styles.dataCard}>
        <View style={styles.dataCardIcon}><Text style={styles.dataCardIconText}>📤</Text></View>
        <View style={styles.dataCardBody}>
          <Text style={styles.dataCardTitle}>{t.exportJson}</Text>
          <Text style={styles.dataCardDesc}>{t.exportDesc}</Text>
          <Pressable style={styles.primaryBtn} onPress={exportData}>
            <Text style={styles.primaryBtnText}>{t.exportJson}</Text>
          </Pressable>
        </View>
      </View>

      {canWrite && (
        <View style={styles.dataCard}>
          <View style={[styles.dataCardIcon, { backgroundColor: C.primaryLight }]}>
            <Text style={styles.dataCardIconText}>📥</Text>
          </View>
          <View style={styles.dataCardBody}>
            <Text style={styles.dataCardTitle}>{t.importJson}</Text>
            <Text style={styles.dataCardDesc}>{t.importDesc}</Text>
            <Pressable style={styles.outlineBtn} onPress={importData}>
              <Text style={styles.outlineBtnText}>{t.importJson}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
