import { Redirect, Tabs } from "expo-router";

import { useData } from "@/lib/use-data";

export default function TabsLayout() {
  const { data } = useData();
  if (data && !data.currency) return <Redirect href="/setup" />;
  // ponytail: text-only tabs; add icons (e.g. @expo/vector-icons) when the design calls for them.
  return (
    <Tabs screenOptions={{ tabBarIconStyle: { display: "none" }, tabBarLabelStyle: { fontSize: 14 } }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="accounts" options={{ title: "Accounts" }} />
      <Tabs.Screen name="categories" options={{ title: "Categories" }} />
    </Tabs>
  );
}
