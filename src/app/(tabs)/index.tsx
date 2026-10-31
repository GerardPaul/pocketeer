import { router } from "expo-router";
import { View } from "react-native";

import { Button, ErrorText, Muted } from "@/components/ui";
import { useData } from "@/lib/use-data";

export default function Home() {
  const { data, error } = useData();
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  return (
    <View className="flex-1 gap-3 bg-white p-4 dark:bg-neutral-900">
      <Button
        title="Log transaction"
        onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: "new" } })}
      />
      <Muted>{data.transactions.length} transactions logged.</Muted>
    </View>
  );
}
