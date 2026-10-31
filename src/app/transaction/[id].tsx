import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { DateField } from "@/components/date-field";
import { Button, Choice, DeleteButton, EmptyState, ErrorText, Field, Muted, Segmented } from "@/components/ui";
import { deleteTransaction, saveTransaction } from "@/db/db";
import {
  type NewTransaction,
  type Transaction,
  type TransactionType,
  deleteTransactionProblem,
  toDateString,
  transactionShapeProblem,
  validateTransaction,
} from "@/lib/ledger";
import { parseAmount, toInputString } from "@/lib/money";
import { HOME } from "@/lib/routes";
import { useData } from "@/lib/use-data";

const TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
] as const;

export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, data } = useData();
  if (!data?.currency) return null;
  const existing = data.transactions.find((t) => String(t.id) === id);
  if (id !== "new" && !existing) return <EmptyState message="This transaction no longer exists." />;
  if (data.accounts.length === 0) {
    return (
      <EmptyState
        message="Add an account first, like cash, a bank or a credit card. Then you can log transactions."
        action={{
          title: "Add account",
          onPress: () => router.push({ pathname: "/account/[id]", params: { id: "new" } }),
        }}
      />
    );
  }
  return <TransactionForm key={existing?.id ?? "new"} existing={existing} db={db} data={data} currency={data.currency} />;
}

function TransactionForm({
  existing,
  db,
  data,
  currency,
}: {
  existing: Transaction | undefined;
  db: ReturnType<typeof useData>["db"];
  data: NonNullable<ReturnType<typeof useData>["data"]>;
  currency: string;
}) {
  const [type, setType] = useState<TransactionType>(existing?.type ?? "expense");
  const [amount, setAmount] = useState(existing ? toInputString(existing.amount, currency) : "");
  const [accountId, setAccountId] = useState<number | null>(existing?.account_id ?? data.accounts[0]?.id ?? null);
  const [toAccountId, setToAccountId] = useState<number | null>(existing?.to_account_id ?? null);
  const [pickedCategoryId, setCategoryId] = useState<number | null>(existing?.category_id ?? null);
  // Falls back on render, so a category added from this screen gets picked once it exists.
  const categoryId = pickedCategoryId ?? data.categories[0]?.id ?? null;
  const [date, setDate] = useState(existing?.date ?? toDateString(new Date()));
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace(HOME));
  const accountOptions = data.accounts.map((a) => ({ value: a.id, label: a.name }));
  const today = toDateString(new Date());

  const minor = parseAmount(amount, currency);
  const tx: NewTransaction | null =
    minor === null || accountId === null
      ? null
      : {
          id: existing?.id,
          type,
          amount: minor,
          date,
          note: note.trim(),
          account_id: accountId,
          to_account_id: type === "transfer" ? toAccountId : null,
          category_id: type === "expense" ? categoryId : null,
        };
  // Balance rules are checked on save, where the error can say which account is the problem.
  const canSave = tx !== null && transactionShapeProblem(tx, data.accounts) === null && date <= today;

  async function save() {
    if (!tx) return setError("Enter a valid amount.");
    if (date > today) return setError("The date can't be in the future.");
    const problem = validateTransaction(tx, data.accounts, data.transactions);
    if (problem) return setError(problem);
    try {
      await saveTransaction(db, tx);
      close();
    } catch (e) {
      setError(`Couldn't save: ${String(e)}`);
    }
  }

  async function remove() {
    if (!existing) return;
    const problem = deleteTransactionProblem(existing.id, data.accounts, data.transactions);
    if (problem) return setError(`Can't delete: ${problem}`);
    try {
      await deleteTransaction(db, existing.id);
      close();
    } catch (e) {
      setError(`Couldn't delete: ${String(e)}`);
    }
  }

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-canvas-dark" contentContainerClassName="gap-4 p-4 pb-8">
      <Stack.Screen options={{ title: existing ? "Edit transaction" : "New transaction" }} />
      <Segmented label="Type" options={TYPES} value={type} onChange={setType} />
      <Field label="Amount" value={amount} onChangeText={setAmount} amount />
      <Choice
        label={type === "transfer" ? "From account" : "Account"}
        options={accountOptions}
        value={accountId}
        onChange={setAccountId}
      />
      {type === "transfer" && (
        <Choice label="To account" options={accountOptions} value={toAccountId} onChange={setToAccountId} />
      )}
      {type === "expense" &&
        (data.categories.length === 0 ? (
          <View className="gap-2">
            <Muted>Expenses need a category. Add one to log this expense.</Muted>
            <Button
              title="Add category"
              variant="secondary"
              onPress={() => router.push({ pathname: "/category/[id]", params: { id: "new" } })}
            />
          </View>
        ) : (
          <Choice
            label="Category"
            options={data.categories.map((c) => ({ value: c.id, label: c.name }))}
            value={categoryId}
            onChange={setCategoryId}
          />
        ))}
      <DateField label="Date" value={date} onChange={setDate} max={today} />
      <Field label="Note (optional)" value={note} onChangeText={setNote} maxLength={200} />
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={save} disabled={!canSave} />
      {existing && <DeleteButton onConfirm={remove} />}
    </ScrollView>
  );
}
