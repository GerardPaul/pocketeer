import { Text, View } from "react-native";

import { Muted } from "@/components/ui";
import { formatMoney } from "@/lib/money";

export function BudgetRow({
  name,
  spent,
  budget,
  currency,
}: {
  name: string;
  spent: number;
  budget: number | null;
  currency: string;
}) {
  const over = budget !== null && spent > budget;
  const pct = budget ? Math.min(100, (spent / budget) * 100) : spent > 0 ? 100 : 0;
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-neutral-900 dark:text-white">{name}</Text>
        <Muted>
          {formatMoney(spent, currency)}
          {budget !== null && ` of ${formatMoney(budget, currency)}`}
        </Muted>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${name} budget used`}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
      >
        <View className={`h-full ${over ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
      </View>
      {budget === null ? (
        <Muted>No budget set</Muted>
      ) : over ? (
        <Text className="text-sm font-medium text-red-600 dark:text-red-400">
          Over by {formatMoney(spent - budget, currency)}
        </Text>
      ) : (
        <Muted>{formatMoney(budget - spent, currency)} left</Muted>
      )}
    </View>
  );
}
