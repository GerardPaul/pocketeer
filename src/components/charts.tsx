import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon, type IconName, TextButton, useColors } from "@/components/ui";
import { formatMoney } from "@/lib/money";

// Charts are plain Views sized by percentage: no chart library, and they run in Expo Go.

const TOP = 5;

// Horizontal bars, biggest first, each as a share of the total.
export function CategoryBars({
  rows,
  currency,
}: {
  rows: { key: number; label: string; icon: IconName; amount: number }[];
  currency: string;
}) {
  const { tint } = useColors();
  const [showAll, setShowAll] = useState(false);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const max = rows[0]?.amount ?? 0;
  // The biggest few tell the story; the rest are a tap away.
  const shown = showAll ? rows : rows.slice(0, TOP);
  return (
    <View className="gap-3 rounded-3xl bg-surface p-4 dark:bg-surface-dark">
      {shown.map((r) => {
        const share = Math.round((r.amount / total) * 100);
        return (
          <View
            key={r.key}
            accessible
            accessibilityLabel={`${r.label}, ${formatMoney(r.amount, currency)}, ${share} percent of spending`}
            className="gap-1"
          >
            <View className="flex-row items-center gap-2">
              <Icon name={r.icon} color={tint} size={18} />
              <Text numberOfLines={1} className="flex-1 font-medium text-sm text-ink dark:text-white">
                {r.label}
              </Text>
              <Text className="font-semibold text-sm text-ink dark:text-white">{formatMoney(r.amount, currency)}</Text>
              <Text className="w-10 text-right font-regular text-xs text-muted dark:text-muted-dark">{`${share}%`}</Text>
            </View>
            <View className="h-2.5 overflow-hidden rounded-full bg-line dark:bg-line-dark">
              <View
                className="h-full rounded-full bg-primary dark:bg-sea"
                style={{ width: `${Math.max((r.amount / max) * 100, 2)}%` }}
              />
            </View>
          </View>
        );
      })}
      {rows.length > TOP && (
        <View className="items-center">
          <TextButton
            title={showAll ? "Show less" : `Show all (${rows.length})`}
            onPress={() => setShowAll(!showAll)}
          />
        </View>
      )}
    </View>
  );
}

const BAR_HEIGHT = 120;

// Income and spending side by side for each month; tapping a month opens it.
export function MonthBars({
  months,
  selected,
  onSelect,
  currency,
}: {
  months: { month: string; income: number; spent: number }[];
  selected: string;
  onSelect: (month: string) => void;
  currency: string;
}) {
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.spent]));
  const height = (amount: number) => (amount === 0 ? 0 : Math.max((amount / max) * BAR_HEIGHT, 3));
  const label = (month: string) => {
    const [y, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(y, m - 1, 1));
  };
  return (
    <View className="gap-3 rounded-3xl bg-surface p-4 dark:bg-surface-dark">
      <View className="flex-row items-end justify-between">
        {months.map((m) => {
          const active = m.month === selected;
          return (
            <Pressable
              key={m.month}
              accessibilityRole="button"
              accessibilityLabel={`${label(m.month)}: income ${formatMoney(m.income, currency)}, spent ${formatMoney(m.spent, currency)}`}
              aria-selected={active}
              onPress={() => onSelect(m.month)}
              className={`flex-1 items-center gap-1.5 rounded-2xl py-1 active:opacity-70 ${active ? "bg-sea/10 dark:bg-white/10" : ""}`}
            >
              <View className="flex-row items-end gap-1" style={{ height: BAR_HEIGHT }}>
                <View className="w-3 rounded-t-md bg-accent" style={{ height: height(m.income) }} />
                <View className="w-3 rounded-t-md bg-primary dark:bg-sea" style={{ height: height(m.spent) }} />
              </View>
              <Text
                className={`text-xs ${active ? "font-semibold text-ink dark:text-white" : "font-regular text-muted dark:text-muted-dark"}`}
              >
                {label(m.month)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row justify-center gap-4">
        <Legend dot="bg-accent" label="Income" />
        <Legend dot="bg-primary dark:bg-sea" label="Spent" />
      </View>
    </View>
  );
}

// `dot` is the same color class as its bars, so the key follows light and dark mode with them.
function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      <Text className="font-regular text-xs text-muted dark:text-muted-dark">{label}</Text>
    </View>
  );
}
