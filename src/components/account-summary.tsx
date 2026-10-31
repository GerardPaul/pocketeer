import { Text, View } from "react-native";

import { Muted } from "@/components/ui";
import { type Account, type Transaction, accountAmount } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";

export function AccountSummary({
  account,
  transactions,
  currency,
}: {
  account: Account;
  transactions: readonly Transaction[];
  currency: string;
}) {
  const amount = accountAmount(account, transactions);
  return (
    <>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-neutral-900 dark:text-white">{account.name}</Text>
        <Muted>{account.type === "regular" ? "Regular" : "Credit card"}</Muted>
      </View>
      {account.type === "regular" ? (
        <Text className="text-lg text-neutral-900 dark:text-white">{formatMoney(amount, currency)}</Text>
      ) : (
        <>
          <Text className="text-lg text-neutral-900 dark:text-white">Owed {formatMoney(amount, currency)}</Text>
          <Muted>Available {formatMoney((account.credit_limit ?? 0) - amount, currency)}</Muted>
        </>
      )}
    </>
  );
}
