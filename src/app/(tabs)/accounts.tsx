import { router } from "expo-router";
import { ScrollView } from "react-native";

import { AccountCard } from "@/components/account-card";
import { Button, ErrorText, Muted } from "@/components/ui";
import { useData } from "@/lib/use-data";

export default function Accounts() {
  const { data, error } = useData();
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-canvas-dark" contentContainerClassName="gap-3 p-4 pb-8">
      <Button
        title="Add account"
        icon="add"
        onPress={() => router.push({ pathname: "/account/[id]", params: { id: "new" } })}
      />
      {data.accounts.length === 0 && <Muted>No accounts yet. Add your cash, bank or credit card.</Muted>}
      {data.accounts.map((a) => (
        <AccountCard
          key={a.id}
          account={a}
          transactions={data.transactions}
          currency={currency}
          onPress={() => router.push({ pathname: "/account/[id]", params: { id: a.id } })}
        />
      ))}
    </ScrollView>
  );
}
