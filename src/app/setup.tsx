import { Redirect, router, Stack } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { Button, ErrorText, Field, Muted } from "@/components/ui";
import { setCurrency } from "@/db/db";
import { CURRENCIES } from "@/lib/currencies";
import { formatMoney } from "@/lib/money";
import { useData } from "@/lib/use-data";

export default function Setup() {
  const { db, data } = useData();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;
  if (data.currency) return <Redirect href="/" />;

  const q = query.trim().toLowerCase();
  const matches = CURRENCIES.filter(
    (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
  );

  async function confirm() {
    if (!selected) return;
    try {
      await setCurrency(db, selected);
      router.replace("/");
    } catch (e) {
      setError(`Couldn't save: ${String(e)}`);
    }
  }

  return (
    <View className="flex-1 gap-4 bg-white p-4 dark:bg-neutral-900">
      <Stack.Screen options={{ title: "Welcome to Pocketeer" }} />
      <Text className="text-xl font-bold text-neutral-900 dark:text-white">Pick your currency</Text>
      <Muted>All amounts in the app use this currency. It can’t be changed later.</Muted>
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="e.g. PHP or peso" autoCorrect={false} />
      <FlatList
        data={matches}
        keyExtractor={(c) => c.code}
        className="flex-1"
        renderItem={({ item }) => {
          const active = item.code === selected;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setSelected(item.code)}
              className={`flex-row items-center justify-between rounded-xl px-3 py-3 ${active ? "bg-emerald-100 dark:bg-emerald-900" : ""}`}
            >
              <Text className="text-base text-neutral-900 dark:text-white">
                {item.code} · {item.name}
              </Text>
              <Muted>{formatMoney(123456, item.code)}</Muted>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Muted>No currency matches “{query}”.</Muted>}
      />
      <ErrorText>{error}</ErrorText>
      <Button
        title={selected ? `Use ${selected}` : "Select a currency"}
        onPress={confirm}
        disabled={!selected}
      />
    </View>
  );
}
