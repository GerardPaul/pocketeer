import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui";
import type { Data } from "@/db/db";
import type { Transaction } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import palette from "@/lib/palette";

const TYPE_ICON = { expense: "expense", income: "income", transfer: "transfer" } as const;
// Circle color tells the type apart at a glance; ink icons stay readable on all three.
const TYPE_CIRCLE = { expense: "bg-red-300", income: "bg-accent", transfer: "bg-white" } as const;

// Teal panel of transaction rows; tapping a row opens it for editing.
// With `accountId`, transfers get a sign from that account's side: + coming in, − going out.
export function TransactionList({
  title,
  transactions,
  data,
  currency,
  empty,
  accountId,
}: {
  title: string;
  transactions: readonly Transaction[];
  data: Data;
  currency: string;
  empty: string;
  accountId?: number;
}) {
  const names = new Map(data.accounts.map((a) => [a.id, a.name]));
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  return (
    <View className="gap-1 rounded-3xl bg-primary p-4">
      <Text accessibilityRole="header" className="px-1 pb-1 font-semibold text-lg text-white">
        {title}
      </Text>
      {transactions.length === 0 && <Text className="px-1 pb-2 font-regular text-sm text-white">{empty}</Text>}
      {transactions.map((t) => {
        const category = categories.get(t.category_id ?? -1);
        const label = t.type === "expense" ? (category?.name ?? "Expense") : t.type === "income" ? "Income" : "Transfer";
        const account =
          t.type === "transfer"
            ? `${names.get(t.account_id)} → ${names.get(t.to_account_id ?? -1)}`
            : names.get(t.account_id);
        const sign =
          t.type === "expense"
            ? "−"
            : t.type === "income"
              ? "+"
              : accountId === undefined
                ? ""
                : t.to_account_id === accountId
                  ? "+"
                  : "−";
        return (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: t.id } })}
            className="flex-row items-center gap-3 rounded-2xl p-2 active:bg-white/10"
          >
            <View className={`h-11 w-11 items-center justify-center rounded-full ${TYPE_CIRCLE[t.type]}`}>
              <Icon name={(t.type === "expense" && category?.icon) || TYPE_ICON[t.type]} color={palette.ink} size={20} />
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="font-semibold text-base text-white">
                {label}
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
  );
}
