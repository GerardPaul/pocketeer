import { Text, View } from "react-native";

import { IconBadge, Muted, useColors } from "@/components/ui";
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
  const { sea } = useColors();
  const over = budget !== null && spent > budget;
  const pct = budget ? Math.min(100, (spent / budget) * 100) : spent > 0 ? 100 : 0;
  return (
    <View className="flex-row items-center gap-3">
      <IconBadge name="tag" color={sea} />
      <View className="flex-1 gap-1.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text numberOfLines={1} className="flex-shrink font-semibold text-base text-ink dark:text-white">
            {name}
          </Text>
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
          className="h-2 overflow-hidden rounded-full bg-line dark:bg-line-dark"
        >
          <View className={`h-full rounded-full ${over ? "bg-red-500" : "bg-sea"}`} style={{ width: `${pct}%` }} />
        </View>
        {budget === null ? (
          <Muted>No budget set</Muted>
        ) : over ? (
          <Text className="font-medium text-sm text-red-600 dark:text-red-400">
            Over by {formatMoney(spent - budget, currency)}
          </Text>
        ) : (
          <Muted>{formatMoney(budget - spent, currency)} left</Muted>
        )}
      </View>
    </View>
  );
}
