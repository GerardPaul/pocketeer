import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AccountCard } from "@/components/account-card";
import { AddCategoryTile, BudgetGrid, BudgetTile } from "@/components/budget-tile";
import { Button, Card, ErrorText, Heading, Icon, Muted, useColors } from "@/components/ui";
import {
  accountAmount,
  backupDueDays,
  budgetFor,
  currentMonth,
  daysBetween,
  formatMonth,
  spentFor,
  toDateString,
} from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { useData } from "@/lib/use-data";

// Square "+" tile that leads a row of cards, used for adding accounts and the first category.
function AddTile({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="w-16 items-center justify-center rounded-3xl bg-sea/10 active:opacity-70 dark:bg-white/10"
    >
      <Icon name="add" color={colors.tint} size={28} />
    </Pressable>
  );
}

// Everything lives only on this phone, so a lost phone loses it all unless there's a recent backup file.
function BackupReminder({ days, backedUp }: { days: number; backedUp: boolean }) {
  const { tint } = useColors();
  return (
    <Card onPress={() => router.push("/settings")}>
      <View className="flex-row items-center gap-3">
        <Icon name="download" color={tint} size={22} />
        <View className="flex-1">
          <Text className="font-semibold text-base text-ink dark:text-white">Back up your data</Text>
          <Muted>
            {backedUp
              ? `Your last backup was ${days} days ago. Export a new one in Settings.`
              : "Your data lives only on this phone. Export a backup in Settings."}
          </Muted>
        </View>
        <Icon name="forward" color={tint} size={20} />
      </View>
    </Card>
  );
}

export default function Home() {
  const { data, error } = useData();
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;
  const month = currentMonth();
  const today = toDateString(new Date());
  const backupDays = backupDueDays(data.lastBackup, data.transactions, today);
  // Only mention the last backup when the count actually starts there, not at data logged after it.
  const fromBackup = data.lastBackup !== null && daysBetween(data.lastBackup, today) === backupDays;
  // Categories without a budget would only show spending; History's category chart covers that.
  const budgeted = data.categories.flatMap((c) => {
    const budget = budgetFor(c.id, month, data.budgets);
    return budget === null ? [] : [{ ...c, budget }];
  });

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
          <Text className="font-regular text-sm text-white">In your pocket</Text>
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

      {backupDays !== null && <BackupReminder days={backupDays} backedUp={fromBackup} />}

      <Heading>My accounts</Heading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
        <AddTile label="Add account" onPress={() => router.push({ pathname: "/account/[id]", params: { id: "new" } })} />
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
      {budgeted.length === 0 && (
        <View className="flex-row gap-3">
          <AddTile
            label="Add category"
            onPress={() => router.push({ pathname: "/category/[id]", params: { id: "new" } })}
          />
          <View className="flex-1 justify-center rounded-3xl bg-surface p-5 dark:bg-surface-dark">
            <Muted>
              {data.categories.length === 0
                ? "No budgets yet. Tap + to add a category, like Food or Transport, and give it a monthly budget."
                : "No budgets yet. Give a category a monthly budget in the Categories tab, or tap + to add one."}
            </Muted>
          </View>
        </View>
      )}
      <BudgetGrid>
        {budgeted.map((c) => (
          <BudgetTile
            key={c.id}
            name={c.name}
            icon={c.icon}
            spent={spentFor(c.id, month, data.transactions)}
            budget={c.budget}
            currency={currency}
            // `at` makes each tap a new request, so tapping the same budget again re-applies the filter.
            onPress={() =>
              router.navigate({ pathname: "/history", params: { category: c.id, at: Date.now() } })
            }
          />
        ))}
        {budgeted.length > 0 && (
          <AddCategoryTile
            key="add"
            onPress={() => router.push({ pathname: "/category/[id]", params: { id: "new" } })}
          />
        )}
      </BudgetGrid>
    </ScrollView>
  );
}
