import "../global.css";

import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, type Theme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { colorScheme, useColorScheme } from "nativewind";
import { useEffect, useState } from "react";

import { loadTheme, migrate } from "@/db/db";
import palette from "@/lib/palette";

SplashScreen.preventAutoHideAsync();

const fonts: Theme["fonts"] = {
  regular: { fontFamily: "Poppins_400Regular", fontWeight: "normal" },
  medium: { fontFamily: "Poppins_500Medium", fontWeight: "normal" },
  bold: { fontFamily: "Poppins_600SemiBold", fontWeight: "normal" },
  heavy: { fontFamily: "Poppins_700Bold", fontWeight: "normal" },
};

const light: Theme = {
  ...DefaultTheme,
  fonts,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.primary,
    background: palette.canvas,
    card: palette.canvas,
    text: palette.ink,
    border: palette.line,
  },
};

const dark: Theme = {
  ...DarkTheme,
  fonts,
  colors: {
    ...DarkTheme.colors,
    primary: palette.accent,
    background: palette.canvasDark,
    card: palette.canvasDark,
    text: "#FFFFFF",
    border: palette.lineDark,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // On a font error, carry on with the system font rather than a blank screen.
  if (!loaded && !error) return null;

  return (
    <SQLiteProvider databaseName="pocketeer.db" onInit={migrate}>
      <AppStack />
    </SQLiteProvider>
  );
}

// NativeWind's color scheme drives both the dark: classes and, on native, the system appearance (pickers, alerts),
// so the navigator theme reads it too. Light until the saved choice is loaded.
function AppStack() {
  const db = useSQLiteContext();
  const { colorScheme: scheme } = useColorScheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadTheme(db)
      .then((theme) => colorScheme.set(theme))
      .catch(() => colorScheme.set("light")) // unreadable setting: fall back to the default
      .finally(() => setReady(true));
  }, [db]);

  if (!ready) return null;

  return (
    <ThemeProvider value={scheme === "dark" ? dark : light}>
      <Stack screenOptions={{ headerShadowVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Back" }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, title: "Welcome" }} />
        {/* Default titles cover loading and empty states; the forms set a more specific one. */}
        <Stack.Screen name="account/[id]" options={{ presentation: "modal", title: "Account" }} />
        <Stack.Screen name="category/[id]" options={{ presentation: "modal", title: "Category" }} />
        <Stack.Screen name="transaction/[id]" options={{ presentation: "modal", title: "Transaction" }} />
      </Stack>
    </ThemeProvider>
  );
}
