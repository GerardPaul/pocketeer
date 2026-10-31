import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui";
import { type Account, type Transaction, accountAmount } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";

// Colored card per account: teal for regular, deep blue with a coral corner for credit cards.
export function AccountCard({
  account,
  transactions,
  currency,
  onPress,
}: {
  account: Account;
  transactions: readonly Transaction[];
  currency: string;
  onPress: () => void;
}) {
  const amount = accountAmount(account, transactions);
  const card = account.type === "credit_card";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`gap-3 overflow-hidden rounded-3xl p-5 active:opacity-80 ${card ? "bg-primary" : "bg-sea"}`}
    >
      <View
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${card ? "bg-accent" : "bg-white/15"}`}
      />
      {/* Right padding keeps long names off the coral corner, where white text is hard to read. */}
      <View className="flex-row items-center gap-2 pr-12">
        <Icon name={card ? "card" : "cash"} color="#FFFFFF" size={20} />
        <Text numberOfLines={1} className="flex-shrink font-semibold text-base text-white">
          {account.name}
        </Text>
      </View>
      <View>
        <Text className="font-regular text-sm text-white/90">{card ? "Owed" : "Balance"}</Text>
        <Text className="font-bold text-2xl text-white">{formatMoney(amount, currency)}</Text>
        {card && (
          <Text className="font-regular text-sm text-white/90">
            Available {formatMoney((account.credit_limit ?? 0) - amount, currency)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
