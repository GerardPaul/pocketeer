import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AccountCard } from "@/components/account-card";
import { GoalCard } from "@/components/goal-card";
import { Button, ErrorText, Muted, Segmented, TextButton } from "@/components/ui";
import { type Account, toDateString } from "@/lib/ledger";
import { useData } from "@/lib/use-data";

const VIEWS = [
  { value: "accounts", label: "Accounts" },
  { value: "goals", label: "Goals" },
] as const;

export default function Accounts() {
  const { data, error } = useData();
  const [picked, setPicked] = useState<Account | null>(null);
  const [view, setView] = useState<"accounts" | "goals">("accounts");
  // Home's Goals link opens this tab on Goals. Tabs keep their state, so each new request (a new `at`) switches
  // once, during render rather than in an effect.
  const params = useLocalSearchParams<{ view?: string; at?: string }>();
  const request = params.view === "goals" && params.at ? params.at : null;
  const [handled, setHandled] = useState<string | null>(null);
  if (request !== null && request !== handled) {
    setHandled(request);
    setView("goals");
  }
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;
  const today = toDateString(new Date());

  // Closes the sheet before leaving, so it isn't still open when the user comes back.
  const open = (pathname: "/account/[id]" | "/account/transactions/[id]") => {
    if (!picked) return;
    setPicked(null);
    router.push({ pathname, params: { id: picked.id } });
  };

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-canvas-dark" contentContainerClassName="gap-3 p-4 pb-8">
      <Segmented label="View" hideLabel options={VIEWS} value={view} onChange={setView} />
      {view === "accounts" ? (
        <>
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
              onPress={() => setPicked(a)}
            />
          ))}
        </>
      ) : (
        <>
          <Button
            title="Add goal"
            icon="add"
            onPress={() => router.push({ pathname: "/goal/[id]", params: { id: "new" } })}
          />
          {data.goals.length === 0 && (
            <Muted>
              No goals yet. Set a target, like an emergency fund, and pick the account you save it in. Its balance
              shows how close you are.
            </Muted>
          )}
          {data.goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              accounts={data.accounts}
              transactions={data.transactions}
              currency={currency}
              today={today}
              onPress={() => router.push({ pathname: "/goal/[id]", params: { id: g.id } })}
            />
          ))}
        </>
      )}

      <Modal visible={picked !== null} transparent animationType="fade" onRequestClose={() => setPicked(null)}>
        {/* Modals render outside the app's provider tree, so they need their own for insets. */}
        <SafeAreaProvider>
          <Pressable
            accessibilityLabel="Close"
            onPress={() => setPicked(null)}
            className="flex-1 justify-end bg-black/40"
          >
            {/* Taps inside the sheet shouldn't reach the backdrop and close it. */}
            <Pressable onPress={() => {}} className="rounded-t-3xl bg-canvas dark:bg-canvas-dark">
              <SafeAreaView edges={["bottom"]} style={{ padding: 16, gap: 12 }}>
                <Text accessibilityRole="header" className="font-semibold text-lg text-ink dark:text-white">
                  {picked?.name}
                </Text>
                <Button title="View transactions" icon="list" onPress={() => open("/account/transactions/[id]")} />
                <Button title="Edit account" icon="edit" variant="secondary" onPress={() => open("/account/[id]")} />
                <View className="items-center">
                  <TextButton title="Cancel" onPress={() => setPicked(null)} />
                </View>
              </SafeAreaView>
            </Pressable>
          </Pressable>
        </SafeAreaProvider>
      </Modal>
    </ScrollView>
  );
}
