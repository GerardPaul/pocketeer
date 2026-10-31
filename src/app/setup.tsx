import { Redirect, router, Stack } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { Button, ErrorText, Field, Muted } from "@/components/ui";
import { setCurrency } from "@/db/db";
import { CURRENCIES } from "@/lib/currencies";
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
      <Stack.Screen options={{ title: "Currency" }} />
      <View className="gap-1 overflow-hidden rounded-3xl bg-primary p-6">
        <View className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent" />
        <Text className="pr-16 font-bold text-2xl text-white">Pick your currency</Text>
        <Text className="pr-16 font-regular text-sm text-white">
          All amounts use it, and it can’t be changed later.
        </Text>
      </View>
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="e.g. PHP or peso" autoCorrect={false} />
      <FlatList
        data={matches}
        keyExtractor={(c) => c.code}
        numColumns={3}
        className="flex-1"
        accessibilityRole="radiogroup"
        renderItem={({ item }) => {
          const active = item.code === selected;
          return (
            // Fixed third-width cells keep a short last row from stretching.
            <View className="w-1/3 p-1">
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={`${item.code} ${item.name}`}
                aria-checked={active}
                onPress={() => setSelected(item.code)}
                className={`items-center gap-2 rounded-3xl px-2 py-4 ${active ? "bg-sea" : "bg-surface dark:bg-surface-dark"}`}
              >
                <View
                  className={`h-14 w-14 items-center justify-center rounded-full ${active ? "bg-white/40" : "bg-sea/10 dark:bg-white/10"}`}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className={`px-1 font-bold text-xl ${active ? "text-ink" : "text-primary dark:text-sea"}`}
                  >
                    {item.symbol}
                  </Text>
                </View>
                <Text
                  numberOfLines={2}
                  className={`min-h-8 text-center font-medium text-xs ${active ? "text-ink" : "text-ink dark:text-white"}`}
                >
                  {item.name}
                </Text>
              </Pressable>
            </View>
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
