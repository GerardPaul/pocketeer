import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { useToast } from "@/components/toast";
import { Button, DeleteButton, EmptyState, ErrorText, Field, FormScrollView, Muted, Segmented } from "@/components/ui";
import { deleteAccount, saveAccount } from "@/db/db";
import { cleanDayInput } from "@/lib/input";
import { type Account, type AccountType, isDay, validateAccount } from "@/lib/ledger";
import { parseAmount, toInputString } from "@/lib/money";
import { useData } from "@/lib/use-data";

const TYPES = [
  { value: "regular", label: "Regular" },
  { value: "credit_card", label: "Credit card" },
] as const;

export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, data } = useData();
  if (!data?.currency) return null;
  const existing = data.accounts.find((a) => String(a.id) === id);
  if (id !== "new" && !existing) return <EmptyState message="This account no longer exists." />;
  // Remount the form once data arrives so its initial state comes from the saved account.
  return <AccountForm key={existing?.id ?? "new"} existing={existing} currency={data.currency} db={db} data={data} />;
}

function AccountForm({
  existing,
  currency,
  db,
  data,
}: {
  existing: Account | undefined;
  currency: string;
  db: ReturnType<typeof useData>["db"];
  data: NonNullable<ReturnType<typeof useData>["data"]>;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<AccountType>(existing?.type ?? "regular");
  const [starting, setStarting] = useState(existing ? toInputString(existing.starting_amount, currency) : "");
  const [limit, setLimit] = useState(
    existing?.credit_limit != null ? toInputString(existing.credit_limit, currency) : "",
  );
  const [cutoff, setCutoff] = useState(existing?.cutoff_day?.toString() ?? "");
  const [due, setDue] = useState(existing?.due_day?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/accounts"));
  // Blank starting amount means 0, so only the name and (for cards) the limit are required.
  const startingAmount = parseAmount(starting.trim() || "0", currency);
  const card = type === "credit_card";
  const creditLimit = card ? parseAmount(limit, currency) : null;
  // Blank days are allowed; the filter already keeps them to digits.
  const cutoffDay = card && cutoff ? Number(cutoff) : null;
  const dueDay = card && due ? Number(due) : null;
  const canSave =
    name.trim() !== "" &&
    startingAmount !== null &&
    (!card || ((creditLimit ?? 0) > 0 && isDay(cutoffDay) && isDay(dueDay)));
  const used = existing
    ? data.transactions.some((t) => t.account_id === existing.id || t.to_account_id === existing.id)
    : false;

  async function save() {
    if (startingAmount === null) return setError("Enter a valid starting amount.");
    if (type === "credit_card" && creditLimit === null) return setError("Enter a valid credit limit.");

    const account: Account = {
      id: existing?.id ?? -1,
      name,
      type,
      starting_amount: startingAmount,
      credit_limit: creditLimit,
      cutoff_day: cutoffDay,
      due_day: dueDay,
    };
    const problem = validateAccount(account, existing, data.transactions);
    if (problem) return setError(problem);
    try {
      await saveAccount(db, { ...account, id: existing?.id });
      close();
      toast(existing ? "Account updated" : "Account added");
    } catch (e) {
      setError(`Couldn't save: ${String(e)}`);
    }
  }

  async function remove() {
    if (!existing) return;
    if (used) return setError("This account has transactions, so it can't be deleted.");
    try {
      await deleteAccount(db, existing.id);
      close();
      toast("Account deleted");
    } catch (e) {
      setError(`Couldn't delete: ${String(e)}`);
    }
  }

  return (
    <FormScrollView>
      <Stack.Screen options={{ title: existing ? "Edit account" : "New account" }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Cash, BDO, Visa" />
      {used ? (
        <Muted>Type: {type === "regular" ? "Regular" : "Credit card"} (can’t change once used)</Muted>
      ) : (
        <Segmented label="Type" options={TYPES} value={type} onChange={setType} />
      )}
      <Field
        label={type === "regular" ? "Starting balance" : "Amount owed now"}
        value={starting}
        onChangeText={setStarting}
        currency={currency}
      />
      {card && (
        <>
          <Field label="Credit limit" value={limit} onChangeText={setLimit} currency={currency} />
          <Field
            label="Cutoff date (day of the month, optional)"
            value={cutoff}
            onChangeText={(t) => setCutoff(cleanDayInput(t))}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            placeholder="e.g. 5"
          />
          <Field
            label="Due date (day of the month, optional)"
            value={due}
            onChangeText={(t) => setDue(cleanDayInput(t))}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            placeholder="e.g. 25"
          />
          {(!isDay(cutoffDay) || !isDay(dueDay)) && <ErrorText>Use a day from 1 to 31.</ErrorText>}
        </>
      )}
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={save} disabled={!canSave} />
      {existing && (used ? <Muted>Accounts with transactions can’t be deleted.</Muted> : <DeleteButton onConfirm={remove} />)}
    </FormScrollView>
  );
}
