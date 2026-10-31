import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { AccountSummary } from "@/components/account-summary";
import { BudgetRow } from "@/components/budget-row";
import { Button, Card, ErrorText, Muted } from "@/components/ui";
import { accountAmount, budgetFor, spentFor, toDateString } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { useData } from "@/lib/use-data";

function Heading({ children }: { children: string }) {
  return <Text className="mt-2 text-lg font-bold text-neutral-900 dark:text-white">{children}</Text>;
}

export default function Home() {
  const { data, error } = useData();
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;
  const month = toDateString(new Date()).slice(0, 7);
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date());

  let cash = 0;
  let owed = 0;
  for (const a of data.accounts) {
    if (a.type === "regular") cash += accountAmount(a, data.transactions);
    else owed += accountAmount(a, data.transactions);
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-900" contentContainerClassName="gap-3 p-4">
      <Button
        title="Log transaction"
        onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: "new" } })}
      />

      <Card>
        <View className="flex-row justify-between">
          <Muted>Money you have</Muted>
          <Text className="font-semibold text-neutral-900 dark:text-white">{formatMoney(cash, currency)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Muted>Credit card debt</Muted>
          <Text className="font-semibold text-neutral-900 dark:text-white">{formatMoney(owed, currency)}</Text>
        </View>
      </Card>

      <Heading>Accounts</Heading>
      {data.accounts.length === 0 && <Muted>No accounts yet. Add one in the Accounts tab.</Muted>}
      {data.accounts.map((a) => (
        <Card key={a.id}>
          <AccountSummary account={a} transactions={data.transactions} currency={currency} />
        </Card>
      ))}

      <Heading>{`Budgets · ${monthLabel}`}</Heading>
      {data.categories.length === 0 && <Muted>No categories yet. Add one in the Categories tab.</Muted>}
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
