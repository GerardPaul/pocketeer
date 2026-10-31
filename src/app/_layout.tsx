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
          <Stack.Screen name="account/[id]" options={{ presentation: "modal" }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
