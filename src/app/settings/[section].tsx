import { router, Stack, useLocalSearchParams } from "expo-router";
import { colorScheme, useColorScheme } from "nativewind";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { APP_LOCK_SUPPORTED, useAppLock } from "@/components/app-lock";
import { TimeField } from "@/components/date-field";
import { RecurringList } from "@/components/recurring";
import { useToast } from "@/components/toast";
import { Button, Card, EmptyState, ErrorText, Heading, Icon, Muted, Segmented, useColors } from "@/components/ui";
import {
  type Reminders,
  type Theme,
  clearAllData,
  deleteRecurring,
  replaceAllData,
  saveLastBackup,
  saveReminders,
  saveTheme,
} from "@/db/db";
import { type Backup, parseBackup, toBackupJson, toTransactionsCsv } from "@/lib/backup";
import { pickBackupFile, shareFile } from "@/lib/backup-file";
import { toDateString } from "@/lib/ledger";
import { REMINDERS_SUPPORTED, allowReminders, scheduleReminders } from "@/lib/reminders";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/lib/routes";
import { useData } from "@/lib/use-data";

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const ON_OFF = [
  { value: "off", label: "Off" },
  { value: "on", label: "On" },
] as const;
const DEFAULT_DAILY = "20:00";


// One screen per row of the Settings menu. Security and reminders only exist on phones.
export default function SettingsPage() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { db, data, error, reload } = useData();
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const { muted } = useColors();
  const toast = useToast();
  const lock = useAppLock();
  const scheme: Theme = useColorScheme().colorScheme === "dark" ? "dark" : "light";

  const known =
    section in SETTINGS_SECTIONS &&
    !(section === "security" && !APP_LOCK_SUPPORTED) &&
    !(section === "reminders" && !REMINDERS_SUPPORTED);
  if (!known) return <EmptyState message="This settings page doesn’t exist." />;
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const { currency, lastBackup, reminders, accounts, categories, budgets, transactions, recurring } = data;
  const cardsWithDueDay = accounts.some((a) => a.type === "credit_card" && a.due_day !== null);

  async function changeTheme(theme: Theme) {
    colorScheme.set(theme);
    try {
      await saveTheme(db, theme);
    } catch (e) {
      setProblem(`Couldn't save the theme: ${String(e)}`);
    }
  }

  async function changeLock(on: boolean) {
    setProblem(null);
    const error = await lock.setEnabled(on);
    if (error) setProblem(error);
    else toast(on ? "App lock on" : "App lock off");
  }

  async function changeReminders(next: Reminders) {
    setProblem(null);
    try {
      const turningOn = (next.due && !reminders.due) || (next.daily !== null && reminders.daily === null);
      if (turningOn && !(await allowReminders())) {
        return setProblem("Notifications are off for Pocketeer. Turn them on in your phone’s settings to get reminders.");
      }
      await saveReminders(db, next);
      const loaded = { currency, lastBackup, accounts, categories, budgets, transactions, recurring };
      await scheduleReminders({ ...loaded, reminders: next });
      reload();
      if (turningOn) toast("Reminder on");
    } catch (e) {
      setProblem(`Couldn't change reminders: ${String(e)}`);
    }
  }

  async function stopRecurring(id: number) {
    setProblem(null);
    try {
      await deleteRecurring(db, id);
      reload();
      toast("Stopped repeating");
    } catch (e) {
      setProblem(`Couldn't stop it: ${String(e)}`);
    }
  }

  async function exportData() {
    setProblem(null);
    try {
      const now = new Date();
      await shareFile(
        `pocketeer-backup-${toDateString(now)}.json`,
        toBackupJson({ currency, accounts, categories, budgets, transactions, recurring }, now),
        "backup",
      );
      // ponytail: the share sheet doesn't say whether the file was actually saved, so any completed export counts.
      await saveLastBackup(db, toDateString(now));
      reload();
      toast("Backup created");
    } catch (e) {
      setProblem(`Export failed: ${String(e)}`);
    }
  }

  // A spreadsheet copy for reading, not a backup, so it doesn't reset the backup reminder.
  async function exportCsv() {
    setProblem(null);
    try {
      const csv = toTransactionsCsv({ currency, accounts, categories, transactions });
      await shareFile(`pocketeer-transactions-${toDateString(new Date())}.csv`, csv, "csv");
      toast("Spreadsheet created");
    } catch (e) {
      setProblem(`CSV export failed: ${String(e)}`);
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
      // The imported data came from a backup file, so it's already backed up.
      await saveLastBackup(db, toDateString(new Date()));
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
      <Stack.Screen options={{ title: SETTINGS_SECTIONS[section as SettingsSection] }} />

      {section === "appearance" && (
        <>
          <Segmented
            label="Theme"
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            value={scheme}
            onChange={changeTheme}
          />
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
        </>
      )}

      {section === "security" && (
        <>
          <Segmented
            label="Lock with Face ID, fingerprint or passcode"
            options={ON_OFF}
            value={lock.enabled ? "on" : "off"}
            onChange={(v) => changeLock(v === "on")}
          />
          <Muted>Asks when the app opens and when you come back after 30 seconds away.</Muted>
        </>
      )}

      {section === "reminders" && (
        <>
          <Segmented
            label="Card payment due dates"
            options={ON_OFF}
            value={reminders.due ? "on" : "off"}
            onChange={(v) => changeReminders({ ...reminders, due: v === "on" })}
          />
          <Muted>
            {cardsWithDueDay
              ? "At 9 AM, 3 days before a card’s due date, while it has a balance."
              : "Add a due date to a credit card to get these. At 9 AM, 3 days before it’s due."}
          </Muted>
          <Segmented
            label="Daily reminder to log spending"
            options={ON_OFF}
            value={reminders.daily ? "on" : "off"}
            onChange={(v) => changeReminders({ ...reminders, daily: v === "on" ? DEFAULT_DAILY : null })}
          />
          {reminders.daily && (
            <TimeField
              label="Remind me at"
              value={reminders.daily}
              onChange={(daily) => changeReminders({ ...reminders, daily })}
            />
          )}
        </>
      )}

      {section === "recurring" && <RecurringList data={data} currency={currency} onStop={stopRecurring} />}

      {section === "data" && (
        <>
          <Heading>Backup</Heading>
          <Muted>Export saves all your data to a file. Import it on another phone to move your data there.</Muted>
          <Muted>{lastBackup ? `Last backup: ${lastBackup}` : "No backup yet on this phone."}</Muted>
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

          <Heading>Spreadsheet</Heading>
          <Muted>
            Every transaction as a CSV file for Excel, Google Sheets or Numbers. It can’t be imported back, so use
            Export data for backups.
          </Muted>
          <Button
            title="Export CSV"
            icon="list"
            variant="secondary"
            onPress={exportCsv}
            disabled={transactions.length === 0}
          />
        </>
      )}

      {section === "clear" && (
        <>
          <Muted>Deletes every account, category, budget and transaction, and resets the currency.</Muted>
          {confirmingClear ? (
            <View className="gap-3 rounded-3xl border-2 border-red-500 bg-surface p-4 dark:bg-surface-dark">
              <Text className="font-bold text-base text-red-600 dark:text-red-400">This will delete ALL your data</Text>
              <Muted>
                {count(accounts.length, "account")}, {count(categories.length, "category", "categories")}{" "}
                and {count(transactions.length, "transaction")} will be removed, and you’ll pick a currency again.
                This can’t be undone. Export first if you want to keep a copy.
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
        </>
      )}

      <ErrorText>{problem}</ErrorText>
    </ScrollView>
  );
}
