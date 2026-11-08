import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { BudgetGrid, BudgetTile } from "@/components/budget-tile";
import { CategoryBars, MonthBars } from "@/components/charts";
import { TransactionList } from "@/components/transaction-list";
import {
  ErrorText,
  Field,
  Heading,
  Icon,
  type IconName,
  Muted,
  Segmented,
  Select,
  TextButton,
  useColors,
} from "@/components/ui";
import {
  type TransactionType,
  budgetFor,
  currentMonth,
  formatMonth,
  matchesSearch,
  monthlyTotals,
  shiftMonth,
  spendingByCategory,
  spentFor,
  summarize,
} from "@/lib/ledger";
import { currencyDigits, formatMoney } from "@/lib/money";
import { useData } from "@/lib/use-data";

function MonthButton({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { text } = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      className={`h-11 w-11 items-center justify-center rounded-full active:opacity-60 ${disabled ? "opacity-30" : ""}`}
    >
      <Icon name={icon} color={text} />
    </Pressable>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="font-regular text-xs text-muted dark:text-muted-dark">{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className="font-semibold text-base text-ink dark:text-white">
        {value}
      </Text>
    </View>
  );
}

const TYPES = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
] as const;

// 0 means "all" in the account and category filters; real ids start at 1.
const ALL = 0;

export default function History() {
  const { data, error } = useData();
  const { tint } = useColors();
  const [month, setMonth] = useState(currentMonth);
  const [showFilters, setShowFilters] = useState(false);
  const [type, setType] = useState<TransactionType | "all">("all");
  const [accountId, setAccountId] = useState(ALL);
  const [categoryId, setCategoryId] = useState(ALL);
  const [query, setQuery] = useState("");
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;

  // Only expenses have a category, so the category filter applies to all types or expenses alone.
  const budgetFilter = type === "all" || type === "expense";
  const activeFilters = Number(type !== "all") + Number(accountId !== ALL) + Number(categoryId !== ALL);
  const changeType = (t: TransactionType | "all") => {
    setType(t);
    if (t === "income" || t === "transfer") setCategoryId(ALL);
  };
  const clearFilters = () => {
    setType("all");
    setAccountId(ALL);
    setCategoryId(ALL);
  };

  // A search looks through every month, so the month switcher and budgets step aside while it's on.
  const searching = query.trim() !== "";
  const names = {
    accounts: new Map(data.accounts.map((a) => [a.id, a.name])),
    categories: new Map(data.categories.map((c) => [c.id, c.name])),
  };
  const digits = currencyDigits(currency);
  const filtered = data.transactions.filter(
    (t) =>
      (type === "all" || t.type === type) &&
      (accountId === ALL || t.account_id === accountId || t.to_account_id === accountId) &&
      (categoryId === ALL || t.category_id === categoryId),
  );
  const txs = filtered.filter((t) =>
    searching ? matchesSearch(t, query, names, digits) : t.date.startsWith(month),
  );
  const categoryRows = spendingByCategory(txs).map(({ categoryId: id, amount }) => {
    const c = data.categories.find((x) => x.id === id);
    return { key: id, label: c?.name ?? "Deleted category", icon: c?.icon ?? ("tag" as const), amount };
  });
  // The trend uses the same filters as the list, so it compares like with like across months.
  const trend = monthlyTotals(filtered, month, 6);
  // Totals follow the filters, so they always add up the list below.
  const { income, spent, net } = summarize(txs);
  const categories = categoryId === ALL ? data.categories : data.categories.filter((c) => c.id === categoryId);
  // Skip categories that didn't exist yet and weren't used that month.
  const tiles = categories.flatMap((c) => {
    const spent = spentFor(c.id, month, data.transactions);
    const budget = budgetFor(c.id, month, data.budgets);
    return budget === null && spent === 0 ? [] : [{ ...c, spent, budget }];
  });

  return (
    <ScrollView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      contentContainerClassName="gap-3 p-4 pb-8"
      keyboardShouldPersistTaps="handled"
    >
      <Field
        label="Search all months"
        value={query}
        onChangeText={setQuery}
        placeholder="Note, category, account or amount"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {searching ? (
        <View className="flex-row items-center justify-between">
          <Muted>{`${txs.length} ${txs.length === 1 ? "match" : "matches"} in all months`}</Muted>
          <TextButton title="Clear search" onPress={() => setQuery("")} />
        </View>
      ) : (
        <View className="flex-row items-center justify-between rounded-full bg-surface p-1 dark:bg-surface-dark">
          <MonthButton label="Previous month" icon="back" onPress={() => setMonth(shiftMonth(month, -1))} />
          <Text accessibilityRole="header" className="font-semibold text-lg text-ink dark:text-white">
            {formatMonth(month)}
          </Text>
          {/* Nothing can be logged in the future, so history stops at this month. */}
          <MonthButton
            label="Next month"
            icon="forward"
            disabled={month >= currentMonth()}
            onPress={() => setMonth(shiftMonth(month, 1))}
          />
        </View>
      )}

      <View
        accessible
        accessibilityLabel={`Income ${formatMoney(income, currency)}, spent ${formatMoney(spent, currency)}, net ${net < 0 ? "minus " : ""}${formatMoney(Math.abs(net), currency)}`}
        className="flex-row gap-3 rounded-3xl bg-surface p-4 dark:bg-surface-dark"
      >
        <Total label="Income" value={formatMoney(income, currency)} />
        <Total label="Spent" value={formatMoney(spent, currency)} />
        <Total label="Net" value={`${net < 0 ? "−" : net > 0 ? "+" : ""}${formatMoney(Math.abs(net), currency)}`} />
      </View>

      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filters${activeFilters ? `, ${activeFilters} on` : ""}`}
          aria-expanded={showFilters}
          onPress={() => setShowFilters(!showFilters)}
          className="min-h-11 flex-row items-center gap-2 rounded-full bg-surface px-4 active:opacity-70 dark:bg-surface-dark"
        >
          <Icon name="filter" color={tint} size={20} />
          <Text className="font-medium text-sm text-ink dark:text-white">
            {activeFilters ? `Filters (${activeFilters})` : "Filters"}
          </Text>
          <Icon name={showFilters ? "up" : "down"} color={tint} size={16} />
        </Pressable>
        {activeFilters > 0 && <TextButton title="Clear filters" onPress={clearFilters} />}
      </View>
      {showFilters && (
        <View className="gap-4 rounded-3xl bg-surface p-4 dark:bg-surface-dark">
          <Segmented label="Type" options={TYPES} value={type} onChange={changeType} />
          <Select
            label="Account"
            options={[
              { value: ALL, label: "All accounts" },
              ...data.accounts.map((a) => ({
                value: a.id,
                label: a.name,
                icon: a.type === "credit_card" ? ("card" as const) : ("cash" as const),
              })),
            ]}
            value={accountId}
            onChange={setAccountId}
          />
          {budgetFilter && (
            <Select
              label="Category"
              options={[
                { value: ALL, label: "All categories" },
                ...data.categories.map((c) => ({ value: c.id, label: c.name, icon: c.icon })),
              ]}
              value={categoryId}
              onChange={setCategoryId}
            />
          )}
        </View>
      )}

      {!searching && budgetFilter && tiles.length > 0 && (
        <>
          <Heading>Budgets</Heading>
          <BudgetGrid>
            {tiles.map((c) => (
              <BudgetTile key={c.id} name={c.name} icon={c.icon} spent={c.spent} budget={c.budget} currency={currency} />
            ))}
          </BudgetGrid>
        </>
      )}
      {!searching && budgetFilter && data.categories.length === 0 && <Muted>Add categories to see budgets here.</Muted>}

      {categoryRows.length > 0 && (
        <>
          <Heading>Spending by category</Heading>
          <CategoryBars rows={categoryRows} currency={currency} />
        </>
      )}
      {!searching && trend.some((m) => m.income > 0 || m.spent > 0) && (
        <>
          <Heading>Last 6 months</Heading>
          <MonthBars months={trend} selected={month} onSelect={setMonth} currency={currency} />
        </>
      )}

      <View className="mt-3">
        <TransactionList
          title="Transactions"
          transactions={txs}
          data={data}
          currency={currency}
          accountId={accountId === ALL ? undefined : accountId}
          empty={
            searching
              ? "Nothing matches this search."
              : activeFilters
                ? "Nothing matches these filters this month."
                : "Nothing logged this month."
          }
        />
      </View>
    </ScrollView>
  );
}
