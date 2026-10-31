import { Redirect, router, Stack } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { Button, ErrorText, Field, Muted } from "@/components/ui";
import { setCurrency } from "@/db/db";
import { CURRENCIES } from "@/lib/currencies";
import { formatMoney } from "@/lib/money";
import { HOME } from "@/lib/routes";
import { useData } from "@/lib/use-data";

export default function Setup() {
  const { db, data } = useData();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;
  if (data.currency) return <Redirect href={HOME} />;

  const q = query.trim().toLowerCase();
  const matches = CURRENCIES.filter(
    (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
  );

  async function confirm() {
    if (!selected) return;
    try {
      await setCurrency(db, selected);
      router.replace(HOME);
    } catch (e) {
      setError(`Couldn't save: ${String(e)}`);
    }
  }

  return (
    <View className="flex-1 gap-4 bg-canvas p-4 dark:bg-canvas-dark">
      <Stack.Screen options={{ title: "Welcome" }} />
      <View className="gap-1 overflow-hidden rounded-3xl bg-primary p-6">
        <View className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent" />
        <Text className="font-bold text-3xl text-white">Pocketeer</Text>
        <Text className="pr-16 font-regular text-sm text-white/90">
          Pick your currency. All amounts use it, and it can’t be changed later.
        </Text>
      </View>
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
              accessibilityLabel={`${item.code} ${item.name}`}
              aria-checked={active}
              onPress={() => setSelected(item.code)}
              className={`mb-1 flex-row items-center justify-between rounded-2xl px-4 py-3 ${active ? "bg-sea" : "bg-surface dark:bg-surface-dark"}`}
            >
              <Text className={`flex-shrink font-medium text-base ${active ? "text-white" : "text-ink dark:text-white"}`}>
                {item.code} · {item.name}
              </Text>
              <Text className={`font-regular text-sm ${active ? "text-white" : "text-muted dark:text-muted-dark"}`}>
                {formatMoney(123456, item.code)}
              </Text>
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
