import "../global.css";

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { useColorScheme } from "react-native";

import { migrate } from "@/db/db";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // NativeWind's dark: classes style our components; ThemeProvider covers the navigator chrome (headers, backgrounds).
  return (
    <SQLiteProvider databaseName="pocketeer.db" onInit={migrate}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Back" }} />
          {/* Default titles cover loading and empty states; the forms set a more specific one. */}
          <Stack.Screen name="account/[id]" options={{ presentation: "modal", title: "Account" }} />
          <Stack.Screen name="category/[id]" options={{ presentation: "modal", title: "Category" }} />
          <Stack.Screen name="transaction/[id]" options={{ presentation: "modal", title: "Transaction" }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
