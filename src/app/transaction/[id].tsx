import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { DateField } from "@/components/date-field";
import { scheduleText } from "@/components/recurring";
import { useToast } from "@/components/toast";
import {
  Button,
  DeleteButton,
  EmptyState,
  ErrorText,
  Field,
  FormScrollView,
  Muted,
  Segmented,
  Select,
  TextButton,
} from "@/components/ui";
import { deleteTransaction, saveTransaction } from "@/db/db";
import {
  type NewTransaction,
  type Recurring,
  type Transaction,
  type TransactionType,
  budgetFor,
  budgetWarning,
  currentMonth,
  deleteTransactionProblem,
  isDay,
  isRealDate,
  ordinal,
  spentFor,
  toDateString,
  transactionShapeProblem,
  validateTransaction,
} from "@/lib/ledger";
import { formatMoney, parseAmount, toInputString } from "@/lib/money";
import { HOME } from "@/lib/routes";
import { useData } from "@/lib/use-data";

const TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
] as const;

const REPEATS = [
  { value: "off", label: "Off" },
  { value: "monthly", label: "Monthly" },
  { value: "twice", label: "Twice a month" },
] as const;

export default function TransactionScreen() {
  // `from` is set by "Log again": a new transaction that starts as a copy of that one.
  // `recurring` and `due` are set by Log on a due card on Home: a new transaction filled in from that item.
  const { id, from, recurring, due } = useLocalSearchParams<{
    id: string;
    from?: string;
    recurring?: string;
    due?: string;
  }>();
  const { db, data } = useData();
  if (!data?.currency) return null;
  const existing = data.transactions.find((t) => String(t.id) === id);
  const template = id === "new" && from ? data.transactions.find((t) => String(t.id) === from) : undefined;
  const item = id === "new" && recurring ? data.recurring.find((r) => String(r.id) === recurring) : undefined;
  const fromRecurring = item && due && isRealDate(due) ? { item, due } : undefined;
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
  return (
    <TransactionForm
      key={existing?.id ?? `new-${template?.id ?? ""}-${fromRecurring ? `${fromRecurring.item.id}-${fromRecurring.due}` : ""}`}
      existing={existing}
      template={template}
      fromRecurring={fromRecurring}
      db={db}
      data={data}
      currency={data.currency}
    />
  );
}

function TransactionForm({
  existing,
  template,
  fromRecurring,
  db,
  data,
  currency,
}: {
  existing: Transaction | undefined;
  template: Transaction | undefined;
  fromRecurring: { item: Recurring; due: string } | undefined;
  db: ReturnType<typeof useData>["db"];
  data: NonNullable<ReturnType<typeof useData>["data"]>;
  currency: string;
}) {
  // A copy takes everything but the date, which starts at today like any new entry; a due recurring item starts
  // on its due date.
  const start = existing ?? template ?? fromRecurring?.item;
  const [type, setType] = useState<TransactionType>(start?.type ?? "expense");
  const [amount, setAmount] = useState(start ? toInputString(start.amount, currency) : "");
  const [accountId, setAccountId] = useState<number | null>(start?.account_id ?? data.accounts[0]?.id ?? null);
  const [pickedToAccountId, setToAccountId] = useState<number | null>(start?.to_account_id ?? null);
  // Picking the destination as the new source clears it, since an account can't transfer to itself.
  const toAccountId = pickedToAccountId === accountId ? null : pickedToAccountId;
  const [pickedCategoryId, setCategoryId] = useState<number | null>(start?.category_id ?? null);
  // Falls back on render, so a category added from this screen gets picked once it exists.
  const categoryId = pickedCategoryId ?? data.categories[0]?.id ?? null;
  const [date, setDate] = useState(existing?.date ?? fromRecurring?.due ?? toDateString(new Date()));
  const [note, setNote] = useState(start?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  // Only a brand-new transaction can be set to repeat; one logged from a recurring item already does.
  const canRepeat = !existing && !fromRecurring;
  const [repeat, setRepeat] = useState<"off" | "monthly" | "twice">("off");
  const [secondDay, setSecondDay] = useState("");
  const toast = useToast();

  const close = () => (router.canGoBack() ? router.back() : router.replace(HOME));
  const accountOptions = data.accounts.map((a) => ({
    value: a.id,
    label: a.name,
    icon: a.type === "credit_card" ? ("card" as const) : ("cash" as const),
  }));
  const toAccountOptions = accountOptions.filter((o) => o.value !== accountId);
  const today = toDateString(new Date());
  // This month, like Home and the category form's budget field.
  const picked = data.categories.find((c) => c.id === categoryId);
  const unbudgeted = picked && budgetFor(picked.id, currentMonth(), data.budgets) === null ? picked : undefined;

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
  // New expenses need a budgeted category, so everything logged shows on Home. Edits stay allowed,
  // since imported transactions can already sit in categories without one.
  const needsBudget = !existing && type === "expense" && unbudgeted !== undefined;
  // Repeats on this transaction's day of the month, plus a second day for "twice a month".
  const day = Number(date.slice(8, 10));
  const second = /^\d{1,2}$/.test(secondDay) ? Number(secondDay) : NaN;
  const repeatDays =
    repeat === "off" ? null : { day, second_day: repeat === "twice" ? second : null };
  const repeatProblem =
    repeat === "twice" && !(isDay(second) && second !== day)
      ? `Enter a second day from 1 to 31, other than the ${ordinal(day)}.`
      : null;
  const canSave =
    tx !== null &&
    transactionShapeProblem(tx, data.accounts) === null &&
    date <= today &&
    !needsBudget &&
    repeatProblem === null;
  const pickRepeat = (r: typeof repeat) => {
    setRepeat(r);
    // Half a month away is the usual pair: the 15th goes with the 30th, the 1st with the 16th.
    if (r === "twice" && secondDay === "") setSecondDay(String(day <= 15 ? day + 15 : day - 15));
  };

  // Heads-up when this expense brings its category near or past that month's budget.
  function budgetNote(t: NewTransaction): string | null {
    if (t.type !== "expense" || t.category_id === null) return null;
    const month = t.date.slice(0, 7);
    const budget = budgetFor(t.category_id, month, data.budgets);
    if (budget === null) return null;
    const before = spentFor(t.category_id, month, data.transactions);
    const after = spentFor(t.category_id, month, data.transactions.filter((x) => x.id !== t.id)) + t.amount;
    const name = data.categories.find((c) => c.id === t.category_id)?.name ?? "This category";
    const warning = budgetWarning(before, after, budget);
    if (warning === "over") return `${name} is over budget by ${formatMoney(after - budget, currency)}.`;
    if (warning === "near") return `${name} has ${formatMoney(budget - after, currency)} left this month.`;
    return null;
  }

  async function save() {
    if (!tx) return setError("Enter a valid amount.");
    if (date > today) return setError("The date can't be in the future.");
    if (needsBudget) return setError(`Set a budget for ${unbudgeted.name} first.`);
    if (repeatProblem) return setError(repeatProblem);
    const problem = validateTransaction(tx, data.accounts, data.transactions);
    if (problem) return setError(problem);
    try {
      await saveTransaction(db, tx, {
        repeat: repeatDays ?? undefined,
        handles: fromRecurring && { id: fromRecurring.item.id, date: fromRecurring.due },
      });
      close();
      const done = existing ? "Transaction updated" : "Transaction logged";
      const extra = repeatDays ? `Repeats ${scheduleText(repeatDays).toLowerCase()}.` : budgetNote(tx);
      toast(extra ? `${done}. ${extra}` : done);
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
      toast("Transaction deleted");
    } catch (e) {
      setError(`Couldn't delete: ${String(e)}`);
    }
  }

  return (
    <FormScrollView>
      <Stack.Screen options={{ title: existing ? "Edit transaction" : "New transaction" }} />
      <Segmented label="Type" options={TYPES} value={type} onChange={setType} />
      <Field label="Amount" value={amount} onChangeText={setAmount} currency={currency} />
      <Select
        label={type === "transfer" ? "From account" : "Account"}
        options={accountOptions}
        value={accountId}
        onChange={setAccountId}
      />
      {type === "transfer" &&
        (toAccountOptions.length === 0 ? (
          <Muted>Add a second account to transfer between them.</Muted>
        ) : (
          <Select label="To account" options={toAccountOptions} value={toAccountId} onChange={setToAccountId} />
        ))}
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
          <>
            <Select
              label="Category"
              options={data.categories.map((c) => ({ value: c.id, label: c.name, icon: c.icon }))}
              value={categoryId}
              onChange={setCategoryId}
            />
            {/* Home only shows budgeted categories, so say so here and offer to set one. */}
            {unbudgeted && (
              <View className="flex-row flex-wrap items-center justify-between gap-x-2">
                <View className="flex-1">
                  <Muted>
                    {needsBudget
                      ? `${unbudgeted.name} has no monthly budget. Set one to log expenses in it.`
                      : `${unbudgeted.name} has no monthly budget, so it won’t show on Home.`}
                  </Muted>
                </View>
                <TextButton
                  title="Set budget"
                  icon="edit"
                  onPress={() => router.push({ pathname: "/category/[id]", params: { id: unbudgeted.id } })}
                />
              </View>
            )}
          </>
        ))}
      <DateField label="Date" value={date} onChange={setDate} max={today} />
      {/* Phone pickers stop at today; typed web dates can still land in the future. */}
      {date > today && <ErrorText>The date can’t be in the future.</ErrorText>}
      <Field label="Note (optional)" value={note} onChangeText={setNote} maxLength={200} />
      {canRepeat && (
        <>
          <Segmented label="Repeat" options={REPEATS} value={repeat} onChange={pickRepeat} />
          {repeat === "twice" && (
            <Field
              label="Second day of the month"
              value={secondDay}
              onChangeText={(t) => setSecondDay(t.replace(/\D/g, "").slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
            />
          )}
          {repeatDays && !repeatProblem && (
            <Muted>{`${scheduleText(repeatDays)}, it shows on Home for you to log or skip. A name in the note, like “Rent”, makes it easy to spot.`}</Muted>
          )}
          {repeatProblem && repeat === "twice" && secondDay !== "" && <ErrorText>{repeatProblem}</ErrorText>}
        </>
      )}
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={save} disabled={!canSave} />
      {existing && (
        <Button
          title="Log again"
          icon="add"
          variant="secondary"
          // Replaces this screen, so saving the copy returns to where the original was opened from.
          onPress={() =>
            router.replace({ pathname: "/transaction/[id]", params: { id: "new", from: String(existing.id) } })
          }
        />
      )}
      {existing && <DeleteButton onConfirm={remove} />}
    </FormScrollView>
  );
}
