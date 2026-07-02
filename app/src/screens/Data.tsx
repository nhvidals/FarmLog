import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform, Pressable, Text, View } from "react-native";
import { SectionHeader } from "../components";
import { useApp } from "../context";
import { useAnimals, useIncubation, useInvalidateFarmData, useMedication } from "../queries";
import { buildIncubationCsv, buildInventoryCsv, buildTreatmentCsv } from "../reports";
import { shareTextFile } from "../share";
import { styles } from "../styles";
import { C } from "../theme";

export function DataScreen() {
  const { t, api, farmId, token, showToast, canWrite } = useApp();
  const invalidate = useInvalidateFarmData(farmId);

  const { data: animals = [] } = useAnimals(api, farmId, token);
  const { data: medication = [] } = useMedication(api, farmId, token);
  const { data: incubation = [] } = useIncubation(api, farmId, token);

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
  ];

  return (
    <View>
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
