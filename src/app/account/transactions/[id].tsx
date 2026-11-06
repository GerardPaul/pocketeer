import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountCard } from "@/components/account-card";
import { DateField } from "@/components/date-field";
import { TransactionList } from "@/components/transaction-list";
import { Button, EmptyState, ErrorText, Muted, Segmented, TextButton } from "@/components/ui";
import { currentMonth, toDateString } from "@/lib/ledger";
import { useData } from "@/lib/use-data";

const PAGE = 10;

const RANGES = [
  { value: "all", label: "All time" },
  { value: "range", label: "Date range" },
] as const;

// Everything an account was used for: newest first, ten at a time, optionally between two dates.
export default function AccountTransactions() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useData();
  const today = toDateString(new Date());
  const [range, setRange] = useState<"all" | "range">("all");
  const [from, setFrom] = useState(`${currentMonth()}-01`);
  const [to, setTo] = useState(today);
  const [limit, setLimit] = useState(PAGE);
  if (!data?.currency) return null;
  const account = data.accounts.find((a) => String(a.id) === id);
  if (!account) return <EmptyState message="This account no longer exists." />;

  // A new filter starts back at the first page.
  const filter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setLimit(PAGE);
  };
  // Dates are YYYY-MM-DD, so plain string comparison orders them.
  const txs = data.transactions.filter(
    (t) =>
      (t.account_id === account.id || t.to_account_id === account.id) &&
      (range === "all" || (t.date >= from && t.date <= to)),
  );
  const shown = txs.slice(0, limit);

  return (
    // Same low-key Back link as the currency screen instead of the header. NativeWind doesn't style SafeAreaView.
    <View className="flex-1 bg-canvas dark:bg-canvas-dark">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pt-2 pb-8">
          <View className="flex-row">
            <TextButton
              title="Back"
              icon="back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/accounts"))}
            />
          </View>
          <AccountCard
            account={account}
            transactions={data.transactions}
            currency={data.currency}
            onPress={() => router.push({ pathname: "/account/[id]", params: { id: account.id } })}
          />
          <Segmented label="Show" options={RANGES} value={range} onChange={filter(setRange)} />
          {range === "range" && (
            <>
              <DateField label="From" value={from} onChange={filter(setFrom)} max={today} />
              <DateField label="To" value={to} onChange={filter(setTo)} max={today} />
              {from > to && <ErrorText>The From date is after the To date.</ErrorText>}
            </>
          )}
          <TransactionList
            title="Transactions"
            transactions={shown}
            data={data}
            currency={data.currency}
            accountId={account.id}
            empty={range === "all" ? "No transactions with this account yet." : "No transactions in these dates."}
          />
          {txs.length > 0 && <Muted>{`Showing ${shown.length} of ${txs.length}`}</Muted>}
          {shown.length < txs.length && (
            <Button
              title={`Load ${Math.min(PAGE, txs.length - shown.length)} more`}
              variant="secondary"
              onPress={() => setLimit(limit + PAGE)}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
