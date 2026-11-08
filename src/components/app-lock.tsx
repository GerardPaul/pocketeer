import * as LocalAuthentication from "expo-local-authentication";
import { useSQLiteContext } from "expo-sqlite";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Modal, Platform, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Logo } from "@/components/logo";
import { Button, ErrorText } from "@/components/ui";
import { saveAppLock } from "@/db/db";

// Short trips out of the app (sharing a backup, picking a file to import) shouldn't lock it.
const GRACE_MS = 30_000;

// Web has no Face ID, fingerprint or passcode prompt, so the lock is a phone-only setting.
export const APP_LOCK_SUPPORTED = Platform.OS !== "web";

type AppLock = { enabled: boolean; setEnabled: (on: boolean) => Promise<string | null> };
const AppLockContext = createContext<AppLock>({ enabled: false, setEnabled: async () => null });
export const useAppLock = () => useContext(AppLockContext);

// Face ID or fingerprint, falling back to the phone's passcode (Expo Go on iPhone always uses the passcode).
async function authenticate(promptMessage: string): Promise<string | null> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) {
    return "Set up a screen lock (passcode, Face ID or fingerprint) on this phone first.";
  }
  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  if (result.success) return null;
  return result.error === "user_cancel" || result.error === "system_cancel" || result.error === "app_cancel"
    ? "Cancelled."
    : "Couldn’t confirm it’s you. Try again.";
}

// Covers the whole app, pop-up forms included, while it's locked. The app stays mounted underneath, so nothing
// typed before leaving is lost.
export function AppLockProvider({ initial, children }: { initial: boolean; children: ReactNode }) {
  const db = useSQLiteContext();
  const [enabled, setEnabledState] = useState(initial && APP_LOCK_SUPPORTED);
  const [locked, setLocked] = useState(initial && APP_LOCK_SUPPORTED);
  const [problem, setProblem] = useState<string | null>(null);
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener("change", (state) => {
      // Only "background" counts: the unlock prompt itself makes iOS report "inactive".
      if (state === "background") leftAt.current = Date.now();
      if (state === "active" && leftAt.current !== null) {
        if (Date.now() - leftAt.current > GRACE_MS) setLocked(true);
        leftAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled]);

  const unlock = useCallback(async () => {
    try {
      const error = await authenticate("Unlock Pocketeer");
      setProblem(error);
      if (error === null) setLocked(false);
    } catch (e) {
      setProblem(`Couldn’t unlock: ${String(e)}`);
    }
  }, []);

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (!APP_LOCK_SUPPORTED) return "App lock isn’t available here.";
      try {
        const error = await authenticate(on ? "Turn on app lock" : "Turn off app lock");
        if (error !== null) return error;
        await saveAppLock(db, on);
        setEnabledState(on);
        return null;
      } catch (e) {
        return `Couldn’t change app lock: ${String(e)}`;
      }
    },
    [db],
  );

  return (
    <AppLockContext.Provider value={{ enabled, setEnabled }}>
      {children}
      {/* Asks right away when the lock appears, so most of the time the screen is only seen for a moment. */}
      <Modal visible={locked} animationType="fade" onShow={unlock} onRequestClose={() => {}}>
        {/* Modals render outside the app's provider tree, so they need their own for insets. */}
        <SafeAreaProvider>
          <View className="flex-1 bg-canvas dark:bg-canvas-dark">
            <SafeAreaView style={{ flex: 1, padding: 24 }}>
              <View className="flex-1 items-center justify-center gap-4">
                <Logo size={96} />
                <Text accessibilityRole="header" className="font-bold text-2xl text-ink dark:text-white">
                  Pocketeer is locked
                </Text>
                <ErrorText>{problem}</ErrorText>
              </View>
              <Button title="Unlock" icon="lock" onPress={unlock} />
            </SafeAreaView>
          </View>
        </SafeAreaProvider>
      </Modal>
    </AppLockContext.Provider>
  );
}
