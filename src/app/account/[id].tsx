import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";

import { Button, DeleteButton, EmptyState, ErrorText, Field, Muted, Segmented } from "@/components/ui";
import { deleteAccount, saveAccount } from "@/db/db";
import { type Account, type AccountType, validateAccount } from "@/lib/ledger";
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
  const [starting, setStarting] = useState(existing ? toInputString(existing.starting_amount, currency) : "0");
  const [limit, setLimit] = useState(
    existing?.credit_limit != null ? toInputString(existing.credit_limit, currency) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/accounts"));
  const used = existing
    ? data.transactions.some((t) => t.account_id === existing.id || t.to_account_id === existing.id)
    : false;

  async function save() {
    const startingAmount = parseAmount(starting, currency);
    if (startingAmount === null) return setError("Enter a valid starting amount.");
    const creditLimit = type === "credit_card" ? parseAmount(limit, currency) : null;
    if (type === "credit_card" && creditLimit === null) return setError("Enter a valid credit limit.");

    const account: Account = {
      id: existing?.id ?? -1,
      name,
      type,
      starting_amount: startingAmount,
      credit_limit: creditLimit,
    };
    const problem = validateAccount(account, existing, data.transactions);
    if (problem) return setError(problem);
    try {
      await saveAccount(db, { ...account, id: existing?.id });
      close();
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
    } catch (e) {
      setError(`Couldn't delete: ${String(e)}`);
    }
  }

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-canvas-dark" contentContainerClassName="gap-4 p-4 pb-8">
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
        keyboardType="decimal-pad"
      />
      {type === "credit_card" && (
        <Field label="Credit limit" value={limit} onChangeText={setLimit} keyboardType="decimal-pad" />
      )}
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={save} />
      {existing && (used ? <Muted>Accounts with transactions can’t be deleted.</Muted> : <DeleteButton onConfirm={remove} />)}
    </ScrollView>
  );
}
