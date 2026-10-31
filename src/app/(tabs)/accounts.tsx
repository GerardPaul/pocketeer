import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { Button, Card, ErrorText, Muted } from "@/components/ui";
import { accountAmount } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
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
      {data.accounts.map((a) => {
        const amount = accountAmount(a, data.transactions);
        return (
          <Card key={a.id} onPress={() => router.push({ pathname: "/account/[id]", params: { id: a.id } })}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">{a.name}</Text>
              <Muted>{a.type === "regular" ? "Regular" : "Credit card"}</Muted>
            </View>
            {a.type === "regular" ? (
              <Text className="text-lg text-neutral-900 dark:text-white">{formatMoney(amount, currency)}</Text>
            ) : (
              <>
                <Text className="text-lg text-neutral-900 dark:text-white">Owed {formatMoney(amount, currency)}</Text>
                <Muted>Available {formatMoney((a.credit_limit ?? 0) - amount, currency)}</Muted>
              </>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}
