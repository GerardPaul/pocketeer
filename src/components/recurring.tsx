import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button, Card, Icon, type IconName, Muted, TextButton, useColors } from "@/components/ui";
import type { Data } from "@/db/db";
import { type Recurring, formatDay, ordinal } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";

// The note names it best ("Rent", "Salary"); without one, the category or the type does.
function describe(r: Recurring, data: Data): { label: string; icon: IconName; accounts: string } {
  const name = (id: number | null) => data.accounts.find((a) => a.id === id)?.name ?? "Deleted account";
  const category = data.categories.find((c) => c.id === r.category_id);
  const fallback = r.type === "expense" ? (category?.name ?? "Expense") : r.type === "income" ? "Income" : "Transfer";
  return {
    label: r.note || fallback,
    icon: (r.type === "expense" && category?.icon) || r.type,
    accounts: r.type === "transfer" ? `${name(r.account_id)} → ${name(r.to_account_id)}` : name(r.account_id),
  };
}

export function scheduleText(r: Pick<Recurring, "day" | "second_day">): string {
  return r.second_day === null
    ? `Every month on the ${ordinal(r.day)}`
    : `Twice a month, on the ${ordinal(Math.min(r.day, r.second_day))} and ${ordinal(Math.max(r.day, r.second_day))}`;
}

const signed = (r: Recurring, currency: string) =>
  `${r.type === "expense" ? "−" : r.type === "income" ? "+" : ""}${formatMoney(r.amount, currency)}`;

// Home card for a recurring transaction that's due. Log opens the form filled in, so an amount that changes (like
// a bill) can be corrected before saving; Skip moves on to its next date without logging anything.
export function DueRecurringCard({
  recurring: r,
  date,
  data,
  currency,
  onSkip,
}: {
  recurring: Recurring;
  date: string;
  data: Data;
  currency: string;
  onSkip: () => void;
}) {
  const { tint } = useColors();
  const { label, icon, accounts } = describe(r, data);
  return (
    <Card>
      <View className="flex-row items-center gap-3">
        <Icon name={icon} color={tint} size={22} />
        <View className="flex-1">
          <Text numberOfLines={1} className="font-semibold text-base text-ink dark:text-white">
            {label}
          </Text>
          <Muted>{`Due ${formatDay(date)} · ${accounts}`}</Muted>
        </View>
        <Text className="font-semibold text-base text-ink dark:text-white">{signed(r, currency)}</Text>
      </View>
      <View className="mt-2 flex-row items-center gap-2">
        <View className="flex-1">
          <Button
            title="Log"
            icon="add"
            onPress={() =>
              router.push({ pathname: "/transaction/[id]", params: { id: "new", recurring: r.id, due: date } })
            }
          />
        </View>
        <TextButton title="Skip" onPress={onSkip} />
      </View>
    </Card>
  );
}

// Settings list of everything set to repeat, each with a two-step Stop so a stray tap can't remove it.
export function RecurringList({
  data,
  currency,
  onStop,
}: {
  data: Data;
  currency: string;
  onStop: (id: number) => void;
}) {
  const [confirming, setConfirming] = useState<number | null>(null);
  if (data.recurring.length === 0) {
    return <Muted>Nothing repeats yet. Choose Repeat when you log a transaction to have it come back each month.</Muted>;
  }
  return (
    <View className="gap-3">
      {data.recurring.map((r) => {
        const { label, accounts } = describe(r, data);
        return (
          <Card key={r.id}>
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text numberOfLines={1} className="font-semibold text-base text-ink dark:text-white">
                  {label}
                </Text>
                <Muted>{`${scheduleText(r)} · ${accounts}`}</Muted>
              </View>
              <Text className="font-semibold text-base text-ink dark:text-white">{signed(r, currency)}</Text>
            </View>
            {confirming === r.id ? (
              <View className="mt-1 flex-row items-center justify-end gap-2">
                <Muted>Stop repeating?</Muted>
                <TextButton title="Cancel" onPress={() => setConfirming(null)} />
                <TextButton title="Stop" icon="close" onPress={() => onStop(r.id)} />
              </View>
            ) : (
              <View className="mt-1 flex-row justify-end">
                <TextButton title="Stop repeating" onPress={() => setConfirming(r.id)} />
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}
