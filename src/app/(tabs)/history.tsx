import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { BudgetRow } from "@/components/budget-row";
import { Card, ErrorText, Heading, Icon, type IconName, Muted, useColors } from "@/components/ui";
import { budgetFor, currentMonth, formatMonth, shiftMonth, spentFor } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import palette from "@/lib/palette";
import { useData } from "@/lib/use-data";

function MonthButton({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { text } = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      className={`h-11 w-11 items-center justify-center rounded-full active:opacity-60 ${disabled ? "opacity-30" : ""}`}
    >
      <Icon name={icon} color={text} />
    </Pressable>
  );
}

const TYPE_ICON = { expense: "expense", income: "income", transfer: "transfer" } as const;

export default function History() {
  const { data, error } = useData();
  const [month, setMonth] = useState(currentMonth);
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;

  const names = new Map(data.accounts.map((a) => [a.id, a.name]));
  const categories = new Map(data.categories.map((c) => [c.id, c.name]));
  const txs = data.transactions.filter((t) => t.date.startsWith(month));

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-canvas-dark" contentContainerClassName="gap-3 p-4 pb-8">
      <View className="flex-row items-center justify-between rounded-full bg-surface p-1 dark:bg-surface-dark">
        <MonthButton label="Previous month" icon="back" onPress={() => setMonth(shiftMonth(month, -1))} />
        <Text accessibilityRole="header" className="font-semibold text-lg text-ink dark:text-white">
          {formatMonth(month)}
        </Text>
        {/* Nothing can be logged in the future, so history stops at this month. */}
        <MonthButton
          label="Next month"
          icon="forward"
          disabled={month >= currentMonth()}
          onPress={() => setMonth(shiftMonth(month, 1))}
        />
      </View>

      <Heading>Budgets</Heading>
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

      <View className="mt-3 gap-1 rounded-3xl bg-primary p-4">
        <Text accessibilityRole="header" className="px-1 pb-1 font-semibold text-lg text-white">
          Transactions
        </Text>
        {txs.length === 0 && (
          <Text className="px-1 pb-2 font-regular text-sm text-white">Nothing logged this month.</Text>
        )}
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
            <Pressable
              key={t.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: t.id } })}
              className="flex-row items-center gap-3 rounded-2xl p-2 active:bg-white/10"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
                <Icon name={TYPE_ICON[t.type]} color={palette.primary} size={20} />
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="font-semibold text-base text-white">
                  {title}
                </Text>
                <Text numberOfLines={1} className="font-regular text-sm text-white">
                  {t.date} · {account}
                  {t.note ? ` · ${t.note}` : ""}
                </Text>
              </View>
              <Text className="font-semibold text-base text-white">
                {sign}
                {formatMoney(t.amount, currency)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {data.categories.length === 0 && <Muted>Add categories to see budgets here.</Muted>}
    </ScrollView>
  );
}
