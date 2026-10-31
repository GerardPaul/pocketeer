import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { Button, Card, ErrorText, Muted } from "@/components/ui";
import { budgetFor, currentMonth } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { useData } from "@/lib/use-data";

export default function Categories() {
  const { data, error } = useData();
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;
  const month = currentMonth();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-900" contentContainerClassName="gap-3 p-4">
      <Button
        title="Add category"
        onPress={() => router.push({ pathname: "/category/[id]", params: { id: "new" } })}
      />
      {data.categories.length === 0 && <Muted>No categories yet. Add Food, Transport, Bills…</Muted>}
      {data.categories.map((c) => {
        const budget = budgetFor(c.id, month, data.budgets);
        return (
          <Card key={c.id} onPress={() => router.push({ pathname: "/category/[id]", params: { id: c.id } })}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">{c.name}</Text>
              <Muted>{budget === null ? "No budget" : `${formatMoney(budget, currency)} / month`}</Muted>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
