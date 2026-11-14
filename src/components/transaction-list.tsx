import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui";
import type { Data } from "@/db/db";
import { type Transaction, formatDay, groupByDay } from "@/lib/ledger";
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
  return (
    <View className="gap-1 rounded-3xl bg-primary p-4">
      <Text accessibilityRole="header" className="px-1 pb-1 font-semibold text-lg text-white">
        {title}
      </Text>
      {transactions.length === 0 && <Text className="px-1 pb-2 font-regular text-sm text-white">{empty}</Text>}
      {groupByDay(transactions).map((day) => (
        <View key={day.date}>
          <DayHeader date={day.date} />
          {day.data.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              data={data}
              currency={currency}
              accountId={accountId}
              showDate={false}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// Date over each day's rows inside the teal panel, with that day's net when one is given.
export function DayHeader({ date, total }: { date: string; total?: string }) {
  return (
    <View accessible accessibilityRole="header" className="flex-row items-center justify-between px-2 pb-1 pt-3">
      <Text className="font-semibold text-sm text-white">{formatDay(date)}</Text>
      {total && <Text className="font-medium text-sm text-white">{total}</Text>}
    </View>
  );
}

// One row of the teal panel. Lists grouped under day headers leave the date out.
export function TransactionRow({
  transaction: t,
  data,
  currency,
  accountId,
  showDate,
}: {
  transaction: Transaction;
  data: Data;
  currency: string;
  accountId?: number;
  showDate: boolean;
}) {
  const name = (id: number | null) => data.accounts.find((a) => a.id === id)?.name;
  const category = data.categories.find((c) => c.id === t.category_id);
  const label = t.type === "expense" ? (category?.name ?? "Expense") : t.type === "income" ? "Income" : "Transfer";
  const account = t.type === "transfer" ? `${name(t.account_id)} → ${name(t.to_account_id)}` : name(t.account_id);
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
  const details = [showDate ? t.date : null, account, t.note || null].filter(Boolean).join(" · ");
  return (
    <Pressable
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
          {details}
        </Text>
      </View>
      <Text className="font-semibold text-base text-white">
        {sign}
        {formatMoney(t.amount, currency)}
      </Text>
    </Pressable>
  );
}
