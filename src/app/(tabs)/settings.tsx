import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button, Card, ErrorText, Muted } from "@/components/ui";
import { replaceAllData } from "@/db/db";
import { type Backup, parseBackup, toBackupJson } from "@/lib/backup";
import { pickBackupFile, shareBackupFile } from "@/lib/backup-file";
import { toDateString } from "@/lib/ledger";
import { useData } from "@/lib/use-data";

export default function Settings() {
  const { db, data, error, reload } = useData();
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);

  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const { currency, accounts, categories, budgets, transactions } = data;

  async function exportData() {
    setProblem(null);
    setMessage(null);
    try {
      const now = new Date();
      await shareBackupFile(
        `pocketeer-backup-${toDateString(now)}.json`,
        toBackupJson({ currency, accounts, categories, budgets, transactions }, now),
      );
      setMessage("Backup created.");
    } catch (e) {
      setProblem(`Export failed: ${String(e)}`);
    }
  }

  async function chooseFile() {
    setProblem(null);
    setMessage(null);
    try {
      const text = await pickBackupFile();
      if (text === null) return;
      const result = parseBackup(text);
      if (!result.ok) return setProblem(result.error);
      setPending(result.backup);
    } catch (e) {
      setProblem(`Couldn't read file: ${String(e)}`);
    }
  }

  async function confirmImport() {
    if (!pending) return;
    try {
      await replaceAllData(db, pending);
      setPending(null);
      setMessage("Import complete. Your data was replaced.");
      reload();
    } catch (e) {
      setProblem(`Import failed, nothing was changed: ${String(e)}`);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-900" contentContainerClassName="gap-3 p-4">
      <Card>
        <View className="flex-row justify-between">
          <Muted>Currency</Muted>
          <Text className="font-semibold text-neutral-900 dark:text-white">{currency}</Text>
        </View>
        <Muted>Set at first launch and can’t be changed.</Muted>
      </Card>

      <Text className="mt-2 text-lg font-bold text-neutral-900 dark:text-white">Backup</Text>
      <Muted>Export saves all your data to a file. Import it on another phone to move your data there.</Muted>
      <Button title="Export data" onPress={exportData} />

      {pending ? (
        <View className="gap-2 rounded-xl border-2 border-red-500 p-4">
          <Text className="text-base font-bold text-red-600 dark:text-red-400">This will replace ALL your data</Text>
          <Muted>
            Everything currently in the app ({accounts.length} accounts, {transactions.length} transactions) will be
            deleted and replaced with the file’s {pending.accounts.length} accounts and {pending.transactions.length}{" "}
            transactions in {pending.currency}. This can’t be undone. Export first if you want to keep a copy.
          </Muted>
          <Button title="Replace my data" variant="danger" onPress={confirmImport} />
          <Button title="Cancel" variant="secondary" onPress={() => setPending(null)} />
        </View>
      ) : (
        <Button title="Import data" variant="secondary" onPress={chooseFile} />
      )}

      <ErrorText>{problem}</ErrorText>
      {message && <Text className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{message}</Text>}
    </ScrollView>
  );
}
