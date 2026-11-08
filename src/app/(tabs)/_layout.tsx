import { Redirect, Tabs } from "expo-router";
import { type ColorValue, Text, View } from "react-native";

import { Logo } from "@/components/logo";
import { Icon, type IconName, useColors } from "@/components/ui";
import { useData } from "@/lib/use-data";

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} size={22} />;
  };
}

// Home's header carries the brand: logo plus app name. The navigator doesn't pass a title color here on native,
// so the text takes the app's own theme color. It's rendered as <BrandTitle /> because the header calls headerTitle
// as a plain function, and the hook inside needs a component of its own.
function BrandTitle() {
  const { text } = useColors();
  return (
    <View accessibilityRole="header" accessibilityLabel="Pocketeer" className="flex-row items-center gap-2">
      <Logo size={28} />
      <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 17, color: text }}>Pocketeer</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { data } = useData();
  const colors = useColors();
  if (data && !data.currency) return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: "Poppins_600SemiBold" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        // The default 49pt bar leaves Poppins labels too little height; a smaller icon box frees some.
        tabBarIconStyle: { height: 24 },
        tabBarLabelStyle: { fontFamily: "Poppins_500Medium", fontSize: 11, lineHeight: 14 },
        tabBarStyle: { borderTopWidth: 0 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", headerTitle: () => <BrandTitle />, tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarIcon: tabIcon("history") }} />
      <Tabs.Screen name="accounts" options={{ title: "Accounts", tabBarIcon: tabIcon("wallet") }} />
      <Tabs.Screen name="categories" options={{ title: "Categories", tabBarIcon: tabIcon("tag") }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: tabIcon("settings") }} />
    </Tabs>
  );
}
