import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { BudgetRow } from "@/components/budget-row";
import { Card, ErrorText, Muted } from "@/components/ui";
import { budgetFor, currentMonth, formatMonth, shiftMonth, spentFor } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { useData } from "@/lib/use-data";

function MonthButton({ label, symbol, onPress }: { label: string; symbol: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full bg-neutral-200 active:opacity-70 dark:bg-neutral-700"
    >
      <Text className="text-xl text-neutral-900 dark:text-white">{symbol}</Text>
    </Pressable>
  );
}

export default function History() {
  const { data, error } = useData();
  const [month, setMonth] = useState(currentMonth);
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;

  const names = new Map(data.accounts.map((a) => [a.id, a.name]));
  const categories = new Map(data.categories.map((c) => [c.id, c.name]));
  const txs = data.transactions.filter((t) => t.date.startsWith(month));

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-900" contentContainerClassName="gap-3 p-4">
      <View className="flex-row items-center justify-between">
        <MonthButton label="Previous month" symbol="‹" onPress={() => setMonth(shiftMonth(month, -1))} />
        <Text accessibilityRole="header" className="text-lg font-bold text-neutral-900 dark:text-white">
          {formatMonth(month)}
        </Text>
        <MonthButton label="Next month" symbol="›" onPress={() => setMonth(shiftMonth(month, 1))} />
      </View>

      {data.categories.map((c) => {
        const spent = spentFor(c.id, month, data.transactions);
        const budget = budgetFor(c.id, month, data.budgets);
        // Skip categories that didn't exist yet and weren't used that month.
        if (budget === null && spent === 0) return null;
        return (
          <Card key={c.id}>
            <BudgetRow name={c.name} spent={spent} budget={budget} currency={currency} />
          </Card>
        );
      })}

      <Text className="mt-2 text-lg font-bold text-neutral-900 dark:text-white">Transactions</Text>
      {txs.length === 0 && <Muted>Nothing logged this month.</Muted>}
      {txs.map((t) => {
        const title =
          t.type === "expense"
            ? (categories.get(t.category_id ?? -1) ?? "Expense")
            : t.type === "income"
              ? "Income"
              : "Transfer";
        const account =
          t.type === "transfer"
            ? `${names.get(t.account_id)} → ${names.get(t.to_account_id ?? -1)}`
            : names.get(t.account_id);
        const sign = t.type === "expense" ? "−" : t.type === "income" ? "+" : "";
        return (
          <Card key={t.id} onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: t.id } })}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">{title}</Text>
              <Text
                className={`text-base font-semibold ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-white"}`}
              >
                {sign}
                {formatMoney(t.amount, currency)}
              </Text>
            </View>
            <Muted>
              {t.date} · {account}
              {t.note ? ` · ${t.note}` : ""}
            </Muted>
          </Card>
        );
      })}
    </ScrollView>
  );
}
