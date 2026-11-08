import Constants from "expo-constants";
import { router } from "expo-router";
import { colorScheme, useColorScheme } from "nativewind";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Logo } from "@/components/logo";
import { useToast } from "@/components/toast";
import { Button, Card, ErrorText, Heading, Icon, Muted, Segmented, useColors } from "@/components/ui";
import { clearAllData, replaceAllData, saveTheme, type Theme } from "@/db/db";
import { type Backup, parseBackup, toBackupJson } from "@/lib/backup";
import { pickBackupFile, shareBackupFile } from "@/lib/backup-file";
import { toDateString } from "@/lib/ledger";
import { useData } from "@/lib/use-data";

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function Settings() {
  const { db, data, error, reload } = useData();
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const { muted } = useColors();
  const toast = useToast();
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
    try {
      const now = new Date();
      await shareBackupFile(
        `pocketeer-backup-${toDateString(now)}.json`,
        toBackupJson({ currency, accounts, categories, budgets, transactions }, now),
      );
      toast("Backup created");
    } catch (e) {
      setProblem(`Export failed: ${String(e)}`);
    }
  }

  async function chooseFile() {
    setProblem(null);
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
      toast("Import complete, your data was replaced");
      reload();
    } catch (e) {
      setProblem(`Import failed, nothing was changed: ${String(e)}`);
    }
  }

  async function confirmClear() {
    try {
      await clearAllData(db);
      setConfirmingClear(false);
      router.replace("/welcome");
      toast("All data cleared");
    } catch (e) {
      setProblem(`Clearing failed, nothing was changed: ${String(e)}`);
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
            Everything currently in the app ({count(accounts.length, "account")},{" "}
            {count(transactions.length, "transaction")}) will be deleted and replaced with the file’s{" "}
            {count(pending.accounts.length, "account")} and {count(pending.transactions.length, "transaction")} in{" "}
            {pending.currency}. This can’t be undone. Export first if you want to keep a copy.
          </Muted>
          <Button title="Replace my data" variant="danger" onPress={confirmImport} />
          <Button title="Cancel" variant="secondary" onPress={() => setPending(null)} />
        </View>
      ) : (
        <Button title="Import data" icon="download" variant="secondary" onPress={chooseFile} />
      )}

      <Heading>Clear data</Heading>
      <Muted>Deletes every account, category, budget and transaction, and resets the currency.</Muted>
      {confirmingClear ? (
        <View className="gap-3 rounded-3xl border-2 border-red-500 bg-surface p-4 dark:bg-surface-dark">
          <Text className="font-bold text-base text-red-600 dark:text-red-400">This will delete ALL your data</Text>
          <Muted>
            {count(accounts.length, "account")}, {count(categories.length, "category", "categories")}{" "}
            and {count(transactions.length, "transaction")} will be removed, and you’ll pick a currency again. This
            can’t be undone. Export first if you want to keep a copy.
          </Muted>
          <Button title="Delete everything" variant="danger" onPress={confirmClear} />
          <Button title="Cancel" variant="secondary" onPress={() => setConfirmingClear(false)} />
        </View>
      ) : (
        <Button
          title="Clear all data"
          icon="trash"
          variant="secondary"
          onPress={() => {
            setProblem(null);
            setConfirmingClear(true);
          }}
        />
      )}

      <ErrorText>{problem}</ErrorText>

      <View className="mt-6 items-center gap-2">
        <Logo size={48} />
        <Text className="font-semibold text-base text-ink dark:text-white">Pocketeer</Text>
        <Muted>{`Version ${Constants.expoConfig?.version ?? "unknown"}`}</Muted>
      </View>
    </ScrollView>
  );
}
