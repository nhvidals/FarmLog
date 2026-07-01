import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform, Pressable, Text, View } from "react-native";
import { SectionHeader } from "../components";
import { useApp } from "../context";
import { useInvalidateFarmData } from "../queries";
import { styles } from "../styles";
import { C } from "../theme";

export function DataScreen() {
  const { t, api, farmId, showToast, canWrite } = useApp();
  const invalidate = useInvalidateFarmData(farmId);

  const exportData = async () => {
    if (!farmId) { showToast("warning", t.valSelectFarm); return; }
    try {
      const res = await api.get("/data/export");
      const json = JSON.stringify(res.data, null, 2);
      const fileName = `farm-export-${Date.now()}.json`;

      if (Platform.OS === "web") {
        // expo-file-system / sharing are unavailable on web — trigger a browser download.
        const doc = (globalThis as any).document;
        const blob = new (globalThis as any).Blob([json], { type: "application/json" });
        const url = (globalThis as any).URL.createObjectURL(blob);
        const anchor = doc.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        (globalThis as any).URL.revokeObjectURL(url);
        showToast("success", t.successExport);
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, json);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast("error", t.errExport);
        return;
      }

      await Sharing.shareAsync(fileUri);
      showToast("success", t.successExport);
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

  return (
    <View>
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
