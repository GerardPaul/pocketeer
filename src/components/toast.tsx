import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui";

const ToastContext = createContext<(message: string) => void>(() => {});

// Short confirmation after an action, e.g. "Transaction saved". Built on Animated so it runs in Expo Go.
export const useToast = () => useContext(ToastContext);

const useNativeDriver = Platform.OS !== "web";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (text: string) => {
      setMessage(text);
      AccessibilityInfo.announceForAccessibility(text);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver }).start();
      clearTimeout(timer.current);
      // Longer messages (like a budget heads-up) stay up long enough to read.
      timer.current = setTimeout(() => {
        // A newer toast interrupts this fade, so only clear the text if it finished.
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver }).start(
          ({ finished }) => finished && setMessage(null),
        );
      }, Math.max(2500, text.length * 60));
    },
    [opacity],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{ opacity, position: "absolute", top: insets.top + 8, left: 16, right: 16, alignItems: "center" }}
        >
          <View className="flex-row items-center gap-2 rounded-full bg-primary px-5 py-3 shadow-lg">
            <Icon name="check" color="#FFFFFF" size={18} />
            <Text className="shrink font-medium text-sm text-white">{message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}
