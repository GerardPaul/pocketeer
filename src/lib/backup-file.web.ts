import * as DocumentPicker from "expo-document-picker";

const MIME_TYPES = { backup: "application/json", csv: "text/csv" } as const;

// Web can't share local files, so download instead. Web is only used for local testing.
export async function shareFile(name: string, text: string, kind: keyof typeof MIME_TYPES) {
  const url = URL.createObjectURL(new Blob([text], { type: MIME_TYPES[kind] }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json" });
  if (result.canceled) return null;
  const file = result.assets[0].file;
  if (!file) throw new Error("Couldn't read the selected file.");
  return file.text();
}
