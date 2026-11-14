import { useState } from "react";
import { PanResponder, Pressable, SectionList, Text, View } from "react-native";

import { BudgetGrid, BudgetTile } from "@/components/budget-tile";
import { CategoryBars, MonthBars } from "@/components/charts";
import { TransactionRow } from "@/components/transaction-list";
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
import type { Data } from "@/db/db";
import {
  type Transaction,
  type TransactionType,
  budgetFor,
  currentMonth,
  formatDay,
  formatMonth,
  groupByDay,
  matchesSearch,
  monthlyTotals,
  shiftMonth,
  spendingByCategory,
  spentFor,
  summarize,
} from "@/lib/ledger";
import { currencyDigits, formatMoney } from "@/lib/money";
import { useData } from "@/lib/use-data";

function RoundButton({
  label,
  icon,
  onPress,
  disabled = false,
  filled = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  filled?: boolean;
}) {
  const { text } = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      className={`h-11 w-11 items-center justify-center rounded-full active:opacity-60 ${filled ? "bg-surface dark:bg-surface-dark" : ""} ${disabled ? "opacity-30" : ""}`}
    >
      <Icon name={icon} color={text} />
    </Pressable>
  );
}

const signed = (amount: number, currency: string) =>
  `${amount < 0 ? "−" : amount > 0 ? "+" : ""}${formatMoney(Math.abs(amount), currency)}`;

function Totals({ txs, currency }: { txs: readonly Transaction[]; currency: string }) {
  const { income, spent, net } = summarize(txs);
  const items = [
    ["Income", formatMoney(income, currency)],
    ["Spent", formatMoney(spent, currency)],
    ["Net", signed(net, currency)],
  ];
  return (
    <View
      accessible
      accessibilityLabel={`Income ${formatMoney(income, currency)}, spent ${formatMoney(spent, currency)}, net ${net < 0 ? "minus " : ""}${formatMoney(Math.abs(net), currency)}`}
      className="flex-row gap-3 rounded-3xl bg-surface p-4 dark:bg-surface-dark"
    >
      {items.map(([label, value]) => (
        <View key={label} className="flex-1 gap-0.5">
          <Text className="font-regular text-xs text-muted dark:text-muted-dark">{label}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit className="font-semibold text-base text-ink dark:text-white">
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Budgets and charts for the whole month. Filters belong to the list, so they don't apply here.
function Insights({ data, month, setMonth }: { data: Data; month: string; setMonth: (m: string) => void }) {
  const currency = data.currency!;
  const monthTxs = data.transactions.filter((t) => t.date.startsWith(month));
  const tiles = data.categories.flatMap((c) => {
    const budget = budgetFor(c.id, month, data.budgets);
    return budget === null ? [] : [{ ...c, spent: spentFor(c.id, month, data.transactions), budget }];
  });
  const categoryRows = spendingByCategory(monthTxs).map(({ categoryId: id, amount }) => {
    const c = data.categories.find((x) => x.id === id);
    return { key: id, label: c?.name ?? "Deleted category", icon: c?.icon ?? ("tag" as const), amount };
  });
  const trend = monthlyTotals(data.transactions, month, 6);
  return (
    <>
      <Totals txs={monthTxs} currency={currency} />
      {tiles.length > 0 && (
        <>
          <Heading>Budgets</Heading>
          <BudgetGrid>
            {tiles.map((c) => (
              <BudgetTile key={c.id} name={c.name} icon={c.icon} spent={c.spent} budget={c.budget} currency={currency} />
            ))}
          </BudgetGrid>
        </>
      )}
      {categoryRows.length > 0 && (
        <>
          <Heading>Spending by category</Heading>
          <CategoryBars rows={categoryRows} currency={currency} />
        </>
      )}
      {trend.some((m) => m.income > 0 || m.spent > 0) && (
        <>
          <Heading>Last 6 months</Heading>
          <MonthBars months={trend} selected={month} onSelect={setMonth} currency={currency} />
        </>
      )}
      {monthTxs.length === 0 && tiles.length === 0 && <Muted>Nothing logged this month.</Muted>}
    </>
  );
}

const VIEWS = [
  { value: "transactions", label: "Transactions" },
  { value: "insights", label: "Insights" },
] as const;

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
  const [view, setView] = useState<"transactions" | "insights">("transactions");
  const [showFilters, setShowFilters] = useState(false);
  const [type, setType] = useState<TransactionType | "all">("all");
  const [accountId, setAccountId] = useState(ALL);
  const [categoryId, setCategoryId] = useState(ALL);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Swipe left for the next month, right for the previous one, like the tutorial's pages.
  // Mostly-horizontal drags only, so vertical scrolling and taps work as before.
  const [swipe] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 50) return;
        // Read now: PanResponder reuses `g`, and it's reset by the time React runs the update below.
        const by = g.dx < 0 ? 1 : -1;        // Same limit as the Next button: nothing can be logged in the future.
        setMonth((m) => {
          const next = shiftMonth(m, by);
          return next > currentMonth() ? m : next;
        });
      },
    }),
  );
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
  const closeSearch = () => {
    setQuery("");
    setSearchOpen(false);
  };

  // A search looks through every month, so the month switcher and Insights step aside while it's open.
  const searching = query.trim() !== "";
  const showList = searchOpen || view === "transactions";
  const names = {
    accounts: new Map(data.accounts.map((a) => [a.id, a.name])),
    categories: new Map(data.categories.map((c) => [c.id, c.name])),
  };
  const digits = currencyDigits(currency);
  const txs = data.transactions.filter(
    (t) =>
      (type === "all" || t.type === type) &&
      (accountId === ALL || t.account_id === accountId || t.to_account_id === accountId) &&
      (categoryId === ALL || t.category_id === categoryId) &&
      (searching ? matchesSearch(t, query, names, digits) : t.date.startsWith(month)),
  );
  const empty = searching
    ? "Nothing matches this search."
    : activeFilters
      ? "Nothing matches these filters this month."
      : "Nothing logged this month.";

  const header = (
    <View className="gap-3">
      {searchOpen ? (
        <>
          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <Field
                label="Search all months"
                value={query}
                onChangeText={setQuery}
                placeholder="Note, category, account or amount"
                autoFocus
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            <TextButton title="Cancel" onPress={closeSearch} />
          </View>
          {searching && <Muted>{`${txs.length} ${txs.length === 1 ? "match" : "matches"} in all months`}</Muted>}
        </>
      ) : (
        <>
          <View className="flex-row items-center justify-between rounded-full bg-surface p-1 dark:bg-surface-dark">
            <RoundButton label="Previous month" icon="back" onPress={() => setMonth(shiftMonth(month, -1))} />
            <Text accessibilityRole="header" className="font-semibold text-lg text-ink dark:text-white">
              {formatMonth(month)}
            </Text>
            {/* Nothing can be logged in the future, so history stops at this month. */}
            <RoundButton
              label="Next month"
              icon="forward"
              disabled={month >= currentMonth()}
              onPress={() => setMonth(shiftMonth(month, 1))}
            />
          </View>
          <Segmented label="View" hideLabel options={VIEWS} value={view} onChange={setView} />
        </>
      )}

      {showList ? (
        <>
          <View className="flex-row items-center gap-2">
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
            <View className="flex-1" />
            {!searchOpen && <RoundButton label="Search all months" icon="search" filled onPress={() => setSearchOpen(true)} />}
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
          {/* Totals follow the filters and search, so they always add up the list below. */}
          <Totals txs={txs} currency={currency} />
          <View className="mt-3 rounded-t-3xl bg-primary px-5 pt-4">
            <Text accessibilityRole="header" className="font-semibold text-lg text-white">
              Transactions
            </Text>
          </View>
        </>
      ) : (
        <Insights data={data} month={month} setMonth={setMonth} />
      )}
    </View>
  );

  // The list draws only the rows on screen, so a whole year of search results stays quick.
  // Search covers every month, so swiping months is off while it's open.
  return (
    <View className="flex-1" {...(searchOpen ? {} : swipe.panHandlers)}>
      <SectionList
        className="flex-1 bg-canvas dark:bg-canvas-dark"
        contentContainerClassName="p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        sections={showList ? groupByDay(txs) : []}
        keyExtractor={(t) => String(t.id)}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => {
          const { net } = summarize(section.data);
          return (
            <View
              accessible
              accessibilityRole="header"
              className="flex-row items-center justify-between bg-primary px-5 pb-1 pt-3"
            >
              <Text className="font-semibold text-sm text-white">{formatDay(section.date)}</Text>
              {net !== 0 && <Text className="font-medium text-sm text-white">{signed(net, currency)}</Text>}
            </View>
          );
        }}
        renderItem={({ item }) => (
          <View className="bg-primary px-3">
            <TransactionRow
              transaction={item}
              data={data}
              currency={currency}
              accountId={accountId === ALL ? undefined : accountId}
              showDate={false}
            />
          </View>
        )}
        ListFooterComponent={
          showList ? (
            <View className="rounded-b-3xl bg-primary px-5 pb-4 pt-1">
              {txs.length === 0 && <Text className="pb-1 font-regular text-sm text-white">{empty}</Text>}
            </View>
          ) : null
        }
      />
    </View>
  );
}
