import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AccountCard } from "@/components/account-card";
import { BudgetRow } from "@/components/budget-row";
import { Button, Card, ErrorText, Heading, Icon, Muted, useColors } from "@/components/ui";
import { accountAmount, budgetFor, currentMonth, formatMonth, spentFor } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { useData } from "@/lib/use-data";

export default function Home() {
  const { data, error } = useData();
  const colors = useColors();
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;
  const month = currentMonth();

  let cash = 0;
  let owed = 0;
  for (const a of data.accounts) {
    if (a.type === "regular") cash += accountAmount(a, data.transactions);
    else owed += accountAmount(a, data.transactions);
  }

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-canvas-dark" contentContainerClassName="gap-3 p-4 pb-8">
      <View className="gap-4 overflow-hidden rounded-3xl bg-primary p-6">
        <View className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent" />
        <View className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-sea/60" />
        <View>
          <Text className="font-regular text-sm text-white">Money you have</Text>
          <Text className="font-bold text-4xl text-white">{formatMoney(cash, currency)}</Text>
        </View>
        <View className="flex-row items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
          <Text className="font-regular text-sm text-white">Credit card debt</Text>
          <Text className="font-semibold text-base text-white">{formatMoney(owed, currency)}</Text>
        </View>
        <Button
          title="Log transaction"
          icon="add"
          onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: "new" } })}
        />
      </View>

      <Heading>My accounts</Heading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add account"
          onPress={() => router.push({ pathname: "/account/[id]", params: { id: "new" } })}
          className="w-16 items-center justify-center rounded-3xl bg-sea/10 active:opacity-70 dark:bg-white/10"
        >
          <Icon name="add" color={colors.tint} size={28} />
        </Pressable>
        {data.accounts.length === 0 && (
          <View className="w-64 justify-center rounded-3xl bg-surface p-5 dark:bg-surface-dark">
            <Muted>No accounts yet. Add your cash, bank or credit card.</Muted>
          </View>
        )}
        {data.accounts.map((a) => (
          <View key={a.id} className="w-64">
            <AccountCard
              account={a}
              transactions={data.transactions}
              currency={currency}
              onPress={() => router.push({ pathname: "/account/[id]", params: { id: a.id } })}
            />
          </View>
        ))}
      </ScrollView>

      <Heading>{`Budgets · ${formatMonth(month)}`}</Heading>
      {data.categories.length === 0 && (
        <Card onPress={() => router.push({ pathname: "/category/[id]", params: { id: "new" } })}>
          <Muted>No categories yet. Tap to add one, like Food or Transport.</Muted>
        </Card>
      )}
      {data.categories.map((c) => (
        <Card key={c.id}>
          <BudgetRow
            name={c.name}
            spent={spentFor(c.id, month, data.transactions)}
            budget={budgetFor(c.id, month, data.budgets)}
            currency={currency}
          />
        </Card>
      ))}
    </ScrollView>
  );
}
