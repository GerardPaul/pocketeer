import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export const FILE_TYPES = {
  backup: { mimeType: "application/json", UTI: "public.json", dialogTitle: "Save backup" },
  csv: { mimeType: "text/csv", UTI: "public.comma-separated-values-text", dialogTitle: "Save spreadsheet" },
} as const;

// Writes the file to the cache and opens the share sheet (save to Files, Drive, email…).
export async function shareFile(name: string, text: string, kind: keyof typeof FILE_TYPES) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn't available on this device.");
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, FILE_TYPES[kind]);
}

// Returns the picked file's text, or null if the user cancelled.
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}
