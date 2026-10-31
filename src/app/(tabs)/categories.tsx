import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { Button, Card, ErrorText, IconBadge, Muted, useColors } from "@/components/ui";
import { budgetFor, currentMonth } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { useData } from "@/lib/use-data";

export default function Categories() {
  const { data, error } = useData();
  const { tint } = useColors();
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;
  const month = currentMonth();

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-canvas-dark" contentContainerClassName="gap-3 p-4 pb-8">
      <Button
        title="Add category"
        icon="add"
        onPress={() => router.push({ pathname: "/category/[id]", params: { id: "new" } })}
      />
      {data.categories.length === 0 && <Muted>No categories yet. Add Food, Transport, Bills…</Muted>}
      {data.categories.map((c) => {
        const budget = budgetFor(c.id, month, data.budgets);
        return (
          <Card key={c.id} onPress={() => router.push({ pathname: "/category/[id]", params: { id: c.id } })}>
            <View className="flex-row items-center gap-3">
              <IconBadge name="tag" color={tint} />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-semibold text-base text-ink dark:text-white">
                  {c.name}
                </Text>
                <Muted>{budget === null ? "No budget" : `${formatMoney(budget, currency)} / month`}</Muted>
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
