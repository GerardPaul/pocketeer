import { router } from "expo-router";
import { ScrollView } from "react-native";

import { AccountSummary } from "@/components/account-summary";
import { Button, Card, ErrorText, Muted } from "@/components/ui";
import { useData } from "@/lib/use-data";

export default function Accounts() {
  const { data, error } = useData();
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-neutral-900" contentContainerClassName="gap-3 p-4">
      <Button
        title="Add account"
        onPress={() => router.push({ pathname: "/account/[id]", params: { id: "new" } })}
      />
      {data.accounts.length === 0 && <Muted>No accounts yet. Add your cash, bank or credit card.</Muted>}
      {data.accounts.map((a) => (
        <Card key={a.id} onPress={() => router.push({ pathname: "/account/[id]", params: { id: a.id } })}>
          <AccountSummary account={a} transactions={data.transactions} currency={currency} />
        </Card>
      ))}
    </ScrollView>
  );
}
