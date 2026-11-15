import { Text, View } from "react-native";

import { Card, Muted } from "@/components/ui";
import { type Account, type Goal, type Transaction, accountAmount, goalMonthly } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";

// "Jun 30, 2027" in the phone's language; goals can be years away, so the year stays.
function longDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(y, m - 1, d),
  );
}

// Progress is the linked account's balance, so saving is just moving money into that account.
export function GoalCard({
  goal,
  accounts,
  transactions,
  currency,
  today,
  onPress,
}: {
  goal: Goal;
  accounts: readonly Account[];
  transactions: readonly Transaction[];
  currency: string;
  today: string;
  onPress: () => void;
}) {
  const account = accounts.find((a) => a.id === goal.account_id);
  const saved = account ? Math.max(0, accountAmount(account, transactions)) : 0;
  const pct = Math.min(100, (saved / goal.target) * 100);
  const rest = goal.target - saved;
  const monthly = goalMonthly(saved, goal, today);
  const status =
    rest <= 0
      ? "Goal reached"
      : goal.target_date !== null && goal.target_date < today
        ? `${formatMoney(rest, currency)} to go · target date ${longDate(goal.target_date)} has passed`
        : monthly !== null && goal.target_date !== null
          ? `Save ${formatMoney(monthly, currency)} a month to reach it by ${longDate(goal.target_date)}`
          : `${formatMoney(rest, currency)} to go`;
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="flex-1 font-semibold text-base text-ink dark:text-white">
          {goal.name}
        </Text>
        <Text className="font-semibold text-base text-ink dark:text-white">{`${Math.floor(pct)}%`}</Text>
      </View>
      <Muted>{account?.name ?? "Deleted account"}</Muted>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${goal.name} saved`}
        aria-valuenow={Math.floor(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="my-1 h-2.5 overflow-hidden rounded-full bg-line dark:bg-line-dark"
      >
        <View style={{ width: `${pct}%` }} className="h-full rounded-full bg-primary dark:bg-sea" />
      </View>
      <Text className="font-medium text-sm text-ink dark:text-white">
        {`${formatMoney(saved, currency)} of ${formatMoney(goal.target, currency)}`}
      </Text>
      <Muted>{status}</Muted>
    </Card>
  );
}
