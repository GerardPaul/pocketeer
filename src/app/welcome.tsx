import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Icon } from "@/components/ui";
import { HOME } from "@/lib/routes";
import { useData } from "@/lib/use-data";

// First screen on a fresh install (or after clearing data), before picking a currency.
export default function Welcome() {
  const { data } = useData();
  if (!data) return null;
  if (data.currency) return <Redirect href={HOME} />;

  return (
    // NativeWind doesn't style SafeAreaView, so the classes live on a plain View.
    <View className="flex-1 bg-canvas dark:bg-canvas-dark">
      <SafeAreaView style={{ flex: 1, padding: 24 }}>
        <View className="flex-1 items-center justify-center gap-5">
          {/* Placeholder until the real logo is added. */}
          <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] bg-primary">
            <View className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-accent" />
            <Icon name="wallet" color="#FFFFFF" size={48} />
          </View>
          <View className="items-center gap-1">
            <Text accessibilityRole="header" className="font-bold text-4xl text-ink dark:text-white">
              Pocketeer
            </Text>
            <Text className="text-center font-regular text-base text-muted dark:text-muted-dark">
              Your personal budget tracker
            </Text>
          </View>
        </View>
        <Button title="Let’s get started" onPress={() => router.push("/setup")} />
      </SafeAreaView>
    </View>
  );
}
