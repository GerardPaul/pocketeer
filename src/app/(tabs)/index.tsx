import { Text, View } from "react-native";

import { useData } from "@/lib/use-data";

export default function Home() {
  const { data, error } = useData();
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-900">
      <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Pocketeer</Text>
      <Text className="mt-2 text-neutral-500 dark:text-neutral-400">
        {error ? `Database error: ${error}` : data ? `Currency: ${data.currency}` : "Loading…"}
      </Text>
    </View>
  );
}
