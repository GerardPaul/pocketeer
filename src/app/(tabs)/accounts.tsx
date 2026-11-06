import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AccountCard } from "@/components/account-card";
import { Button, ErrorText, Muted, TextButton } from "@/components/ui";
import type { Account } from "@/lib/ledger";
import { useData } from "@/lib/use-data";

export default function Accounts() {
  const { data, error } = useData();
  const [picked, setPicked] = useState<Account | null>(null);
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const currency = data.currency;

  // Closes the sheet before leaving, so it isn't still open when the user comes back.
  const open = (pathname: "/account/[id]" | "/account/transactions/[id]") => {
    if (!picked) return;
    setPicked(null);
    router.push({ pathname, params: { id: picked.id } });
  };

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
          onPress={() => setPicked(a)}
        />
      ))}

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
