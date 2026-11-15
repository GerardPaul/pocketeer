import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Logo } from "@/components/logo";
import { Button, Card, ErrorText, FormScrollView, Icon, type IconName, Muted, Segmented, useColors } from "@/components/ui";
import { savePro } from "@/db/db";
import { FREE_LIMITS, PRO_REASONS, isProFeature } from "@/lib/pro";
import { useData } from "@/lib/use-data";

const PERKS: { icon: IconName; title: string; detail: string }[] = [
  { icon: "tag", title: "Unlimited categories", detail: `Free has ${FREE_LIMITS.categories}` },
  { icon: "savings", title: "Unlimited savings goals", detail: `Free has ${FREE_LIMITS.goals}` },
  { icon: "repeat", title: "Unlimited recurring transactions", detail: `Free has ${FREE_LIMITS.recurring}` },
  { icon: "history", title: "Full spending charts", detail: "Every category and the 6-month trend" },
  { icon: "search", title: "Search every month", detail: "Find any transaction by note, name or amount" },
  { icon: "share", title: "CSV export", detail: "Every transaction for Excel, Google Sheets or Numbers" },
];

const TEST_OPTIONS = [
  { value: "off", label: "Free" },
  { value: "on", label: "Pro" },
] as const;

// What Pro adds, and why the user landed here (`feature`, from whatever was locked). Buying waits for the store
// accounts and a purchase library; until then the buttons say so, and dev builds get a switch to test both sides.
export default function ProScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const { db, data, reload } = useData();
  const { tint } = useColors();
  const [problem, setProblem] = useState<string | null>(null);
  if (!data?.currency) return null;

  async function setTestPro(value: "off" | "on") {
    setProblem(null);
    try {
      await savePro(db, value === "on");
      reload();
    } catch (e) {
      setProblem(`Couldn't change it: ${String(e)}`);
    }
  }

  return (
    <FormScrollView>
      <View className="items-center gap-2">
        <Logo size={56} />
        <Text accessibilityRole="header" className="font-bold text-2xl text-ink dark:text-white">
          Pocketeer Pro
        </Text>
        <Muted>One payment, yours to keep. No ads, no subscription.</Muted>
      </View>
      {isProFeature(feature) && !data.pro && (
        <View className="rounded-2xl bg-sea/10 px-4 py-3 dark:bg-white/10">
          <Text className="font-medium text-sm text-ink dark:text-white">{PRO_REASONS[feature]}</Text>
        </View>
      )}
      <Card>
        <View className="gap-3">
          {PERKS.map((p) => (
            <View key={p.title} className="flex-row items-center gap-3">
              <Icon name={p.icon} color={tint} size={22} />
              <View className="flex-1">
                <Text className="font-semibold text-base text-ink dark:text-white">{p.title}</Text>
                <Muted>{p.detail}</Muted>
              </View>
            </View>
          ))}
        </View>
      </Card>
      <Muted>
        Logging, budgets, Safe to spend, backups, app lock and reminders stay free, and nothing you already have is
        ever locked away.
      </Muted>
      {data.pro ? (
        <Card>
          <Text className="font-semibold text-base text-ink dark:text-white">Pro is unlocked on this phone. Thank you!</Text>
        </Card>
      ) : (
        <>
          <Button title="Unlock Pro" disabled onPress={() => {}} />
          <Button title="Restore purchases" variant="secondary" disabled onPress={() => {}} />
          <Muted>Buying opens once Pocketeer is in the App Store and Google Play.</Muted>
        </>
      )}
      {__DEV__ && (
        <View className="gap-2 rounded-2xl border border-dashed border-line p-3 dark:border-line-dark">
          <Segmented label="Testing only: this phone is" options={TEST_OPTIONS} value={data.pro ? "on" : "off"} onChange={setTestPro} />
          <Muted>Only in development builds, to try both sides. Store builds don’t show this.</Muted>
        </View>
      )}
      <ErrorText>{problem}</ErrorText>
    </FormScrollView>
  );
}
