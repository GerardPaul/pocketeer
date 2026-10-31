import "../global.css";

import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, type Theme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";

import { migrate } from "@/db/db";
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
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // NativeWind's web CSS only applies dark: classes under a `dark` class on <html>; keep it in step with the
  // system so the page matches the navigator chrome. Native follows the system on its own.
  useEffect(() => {
    if (Platform.OS === "web") document.documentElement.classList.toggle("dark", colorScheme === "dark");
  }, [colorScheme]);

  // On a font error, carry on with the system font rather than a blank screen.
  if (!loaded && !error) return null;

  return (
    <SQLiteProvider databaseName="pocketeer.db" onInit={migrate}>
      <ThemeProvider value={colorScheme === "dark" ? dark : light}>
        <Stack screenOptions={{ headerShadowVisible: false }}>
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
