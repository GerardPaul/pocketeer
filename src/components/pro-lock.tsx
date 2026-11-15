import { router } from "expo-router";
import { Text, View } from "react-native";

import { Card, Icon, useColors } from "@/components/ui";
import type { ProFeature } from "@/lib/pro";

export function openPro(feature: ProFeature) {
  router.push({ pathname: "/pro", params: { feature } });
}

// Stands where a Pro feature would be: says what's locked and opens the paywall, instead of hiding it.
export function ProLock({ feature, text }: { feature: ProFeature; text: string }) {
  const { tint } = useColors();
  return (
    <Card onPress={() => openPro(feature)}>
      <View className="flex-row items-center gap-3">
        <Icon name="lock" color={tint} size={22} />
        <View className="flex-1">
          <Text className="font-medium text-sm text-ink dark:text-white">{text}</Text>
          <Text className="font-semibold text-sm text-primary dark:text-sea">Unlock Pro</Text>
        </View>
        <Icon name="forward" color={tint} size={20} />
      </View>
    </Card>
  );
}
