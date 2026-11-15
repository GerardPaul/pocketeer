import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { DateField } from "@/components/date-field";
import { ProLock } from "@/components/pro-lock";
import { useToast } from "@/components/toast";
import { Button, DeleteButton, EmptyState, ErrorText, Field, FormScrollView, Muted, Segmented, Select } from "@/components/ui";
import { deleteGoal, saveGoal } from "@/db/db";
import { type Goal, currentMonth, isRealDate, shiftMonth } from "@/lib/ledger";
import { parseAmount, toInputString } from "@/lib/money";
import { FREE_LIMITS, atFreeLimit } from "@/lib/pro";
import { useData } from "@/lib/use-data";

const DATE_OPTIONS = [
  { value: "none", label: "No date" },
  { value: "date", label: "By a date" },
] as const;

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, data } = useData();
  if (!data?.currency) return null;
  const existing = data.goals.find((g) => String(g.id) === id);
  if (id !== "new" && !existing) return <EmptyState message="This goal no longer exists." />;
  if (!existing && atFreeLimit("goals", data.goals.length, data.pro)) {
    return (
      <FormScrollView>
        <ProLock
          feature="goals"
          text={`Free includes ${FREE_LIMITS.goals} savings goal. Unlock Pro to add more, or edit the one you have.`}
        />
      </FormScrollView>
    );
  }
  if (!data.accounts.some((a) => a.type === "regular")) {
    return (
      <EmptyState
        message="A goal saves into a regular account, like a savings bank. Add one first."
        action={{ title: "Add account", onPress: () => router.push({ pathname: "/account/[id]", params: { id: "new" } }) }}
      />
    );
  }
  return <GoalForm key={existing?.id ?? "new"} existing={existing} db={db} data={data} currency={data.currency} />;
}

function GoalForm({
  existing,
  db,
  data,
  currency,
}: {
  existing: Goal | undefined;
  db: ReturnType<typeof useData>["db"];
  data: NonNullable<ReturnType<typeof useData>["data"]>;
  currency: string;
}) {
  // Credit card balances are debt, not savings.
  const accounts = data.accounts.filter((a) => a.type === "regular");
  const [name, setName] = useState(existing?.name ?? "");
  const [target, setTarget] = useState(existing ? toInputString(existing.target, currency) : "");
  const [accountId, setAccountId] = useState<number | null>(existing?.account_id ?? accounts[0]?.id ?? null);
  const [hasDate, setHasDate] = useState<"none" | "date">(existing?.target_date ? "date" : "none");
  // A year out to start, a common horizon for saving up.
  const [date, setDate] = useState(existing?.target_date ?? `${shiftMonth(currentMonth(), 12)}-01`);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/accounts"));
  const amount = parseAmount(target, currency);
  const canSave = name.trim() !== "" && amount !== null && amount > 0 && accountId !== null;

  async function save() {
    if (!name.trim()) return setError("Enter a name.");
    if (amount === null || amount <= 0) return setError("Enter a target amount above 0.");
    if (accountId === null || !accounts.some((a) => a.id === accountId)) return setError("Pick an account.");
    if (hasDate === "date" && !isRealDate(date)) return setError("Enter a valid target date.");
    try {
      await saveGoal(db, {
        id: existing?.id,
        name,
        target: amount,
        account_id: accountId,
        target_date: hasDate === "date" ? date : null,
      });
      close();
      toast(existing ? "Goal updated" : "Goal added");
    } catch (e) {
      setError(`Couldn't save: ${String(e)}`);
    }
  }

  async function remove() {
    if (!existing) return;
    try {
      await deleteGoal(db, existing.id);
      close();
      toast("Goal deleted");
    } catch (e) {
      setError(`Couldn't delete: ${String(e)}`);
    }
  }

  return (
    <FormScrollView>
      <Stack.Screen options={{ title: existing ? "Edit goal" : "New goal" }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Emergency fund, Travel" maxLength={60} />
      <Field label="Target amount" value={target} onChangeText={setTarget} currency={currency} />
      <Select
        label="Saved in"
        options={accounts.map((a) => ({ value: a.id, label: a.name, icon: "cash" as const }))}
        value={accountId}
        onChange={setAccountId}
      />
      <Muted>Progress is this account’s balance. Move money into it with a transfer to save toward the goal.</Muted>
      <Segmented label="Target date" options={DATE_OPTIONS} value={hasDate} onChange={setHasDate} />
      {hasDate === "date" && <DateField label="Reach it by" value={date} onChange={setDate} />}
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={save} disabled={!canSave} />
      {/* Deleting a goal only removes the target; the account and its money stay. */}
      {existing && <DeleteButton onConfirm={remove} />}
    </FormScrollView>
  );
}
