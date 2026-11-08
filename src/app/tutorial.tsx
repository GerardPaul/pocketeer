import { router } from "expo-router";
import { useState } from "react";
import { PanResponder, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Icon, type IconName, TextButton } from "@/components/ui";
import { HOME } from "@/lib/routes";

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "wallet",
    title: "Add your accounts",
    body: "Cash, bank, e-wallet or credit card. Each balance updates on its own as you log.",
  },
  {
    icon: "tag",
    title: "Set monthly budgets",
    body: "Make categories like Food or Transport and give each a budget. Its ring empties as you spend.",
  },
  {
    icon: "add",
    title: "Log as you go",
    body: "Tap Log transaction for spending, income, or moving money between accounts.",
  },
  {
    icon: "history",
    title: "Look back anytime",
    body: "History shows past months. Filter by category, account or type to see where money went.",
  },
  {
    icon: "lock",
    title: "Your data stays with you",
    body: "Everything lives on this phone. Back it up to a file in Settings to move it to a new one.",
  },
];

// Shown once, right after the currency is picked.
export default function Tutorial() {
  const [step, setStep] = useState(0);
  const { icon, title, body } = STEPS[step];
  const last = step === STEPS.length - 1;
  const finish = () => router.replace(HOME);
  const go = (by: number) => setStep((s) => Math.min(Math.max(s + by, 0), STEPS.length - 1));
  // Swipe left goes next, swipe right goes back, like turning a page. Mostly-horizontal drags only, so taps still reach the buttons.
  const [swipe] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) go(1);
        else if (g.dx > 50) go(-1);
      },
    }),
  );

  return (
    // NativeWind doesn't style SafeAreaView, so the classes live on plain Views.
    <View className="flex-1 bg-canvas dark:bg-canvas-dark">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 p-6 pt-2" {...swipe.panHandlers}>
          <View className="min-h-11 flex-row justify-end">
            {!last && <TextButton title="Skip" onPress={finish} />}
          </View>
          {/* Screen readers can't swipe between steps, so they adjust the step instead. */}
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={`${title}. ${body}`}
            accessibilityValue={{ text: `Step ${step + 1} of ${STEPS.length}` }}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={(e) => go(e.nativeEvent.actionName === "increment" ? 1 : -1)}
            className="flex-1 items-center justify-center gap-6"
          >
            <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] bg-primary">
              <View className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-accent" />
              <Icon name={icon} color="#FFFFFF" size={48} />
            </View>
            <View className="items-center gap-2">
              <Text accessibilityRole="header" className="text-center font-bold text-2xl text-ink dark:text-white">
                {title}
              </Text>
              <Text className="text-center font-regular text-base text-muted dark:text-muted-dark">{body}</Text>
            </View>
          </View>
          <View className="gap-6">
            <View
              accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}
              className="flex-row justify-center gap-2"
            >
              {STEPS.map((s, i) => (
                <View
                  key={s.title}
                  className={`h-2 rounded-full ${i === step ? "w-6 bg-primary dark:bg-sea" : "w-2 bg-line dark:bg-line-dark"}`}
                />
              ))}
            </View>
            <Button title={last ? "Start using Pocketeer" : "Next"} onPress={last ? finish : () => go(1)} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
