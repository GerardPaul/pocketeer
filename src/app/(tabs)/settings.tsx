import { colorScheme, useColorScheme } from "nativewind";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button, Card, ErrorText, Heading, Icon, Muted, Segmented, useColors } from "@/components/ui";
import { replaceAllData, saveTheme, type Theme } from "@/db/db";
import { type Backup, parseBackup, toBackupJson } from "@/lib/backup";
import { pickBackupFile, shareBackupFile } from "@/lib/backup-file";
import { toDateString } from "@/lib/ledger";
import { useData } from "@/lib/use-data";

export default function Settings() {
  const { db, data, error, reload } = useData();
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const { muted } = useColors();
  const scheme: Theme = useColorScheme().colorScheme === "dark" ? "dark" : "light";

  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const { currency, accounts, categories, budgets, transactions } = data;

  async function changeTheme(theme: Theme) {
    colorScheme.set(theme);
    try {
      await saveTheme(db, theme);
    } catch (e) {
      setProblem(`Couldn't save the theme: ${String(e)}`);
    }
  }

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
    <ScrollView className="flex-1 bg-canvas dark:bg-canvas-dark" contentContainerClassName="gap-3 p-4 pb-8">
      <Card>
        <View className="flex-row items-center justify-between">
          <Muted>Currency</Muted>
          <View className="flex-row items-center gap-1.5">
            <Icon name="lock" color={muted} size={16} />
            <Text className="font-semibold text-base text-ink dark:text-white">{currency}</Text>
          </View>
        </View>
        <Muted>Set at first launch and can’t be changed.</Muted>
      </Card>

      <Heading>Appearance</Heading>
      <Segmented
        label="Theme"
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        value={scheme}
        onChange={changeTheme}
      />

      <Heading>Backup</Heading>
      <Muted>Export saves all your data to a file. Import it on another phone to move your data there.</Muted>
      <Button title="Export data" icon="share" onPress={exportData} />

      {pending ? (
        <View className="gap-3 rounded-3xl border-2 border-red-500 bg-surface p-4 dark:bg-surface-dark">
          <Text className="font-bold text-base text-red-600 dark:text-red-400">This will replace ALL your data</Text>
          <Muted>
            Everything currently in the app ({accounts.length} accounts, {transactions.length} transactions) will be
            deleted and replaced with the file’s {pending.accounts.length} accounts and {pending.transactions.length}{" "}
            transactions in {pending.currency}. This can’t be undone. Export first if you want to keep a copy.
          </Muted>
          <Button title="Replace my data" variant="danger" onPress={confirmImport} />
          <Button title="Cancel" variant="secondary" onPress={() => setPending(null)} />
        </View>
      ) : (
        <Button title="Import data" icon="download" variant="secondary" onPress={chooseFile} />
      )}

      <ErrorText>{problem}</ErrorText>
      {message && <Text className="font-medium text-sm text-emerald-700 dark:text-emerald-400">{message}</Text>}
    </ScrollView>
  );
}
