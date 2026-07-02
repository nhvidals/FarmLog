import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

/**
 * Writes text to a file and shares it (native) or triggers a browser download
 * (web). Returns true on success, false when sharing is unavailable. Centralizes
 * the platform branching used by JSON export and CSV reports.
 */
export async function shareTextFile(
  fileName: string,
  content: string,
  mimeType = "text/plain"
): Promise<boolean> {
  if (Platform.OS === "web") {
    // expo-file-system / sharing are unavailable on web — trigger a download.
    const doc = (globalThis as any).document;
    const blob = new (globalThis as any).Blob([content], { type: mimeType });
    const url = (globalThis as any).URL.createObjectURL(blob);
    const anchor = doc.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    (globalThis as any).URL.revokeObjectURL(url);
    return true;
  }

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, content);

  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(fileUri, { mimeType });
  return true;
}
