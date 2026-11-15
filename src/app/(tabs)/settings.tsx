import Constants from "expo-constants";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { APP_LOCK_SUPPORTED, useAppLock } from "@/components/app-lock";
import { Logo } from "@/components/logo";
import { ErrorText, Icon, type IconName, Muted, useColors } from "@/components/ui";
import { REMINDERS_SUPPORTED } from "@/lib/reminders";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/lib/routes";
import { useData } from "@/lib/use-data";

// One row per settings page: what it is, how it's set now, and a chevron to open it.
function Row({
  section,
  icon,
  status,
  danger = false,
  last = false,
}: {
  section: SettingsSection;
  icon: IconName;
  status: string;
  danger?: boolean;
  last?: boolean;
}) {
  const { tint, muted } = useColors();
  const title = SETTINGS_SECTIONS[section];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status}`}
      onPress={() => router.push({ pathname: "/settings/[section]", params: { section } })}
      className={`min-h-16 flex-row items-center gap-3 px-4 py-3 active:bg-sea/10 dark:active:bg-white/10 ${
        last ? "" : "border-b border-line dark:border-line-dark"
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-sea/10 dark:bg-white/10">
        <Icon name={icon} color={danger ? "#DC2626" : tint} size={20} />
      </View>
      <View className="flex-1">
        <Text className={`font-semibold text-base ${danger ? "text-red-600 dark:text-red-400" : "text-ink dark:text-white"}`}>
          {title}
        </Text>
        <Muted>{status}</Muted>
      </View>
      <Icon name="forward" color={muted} size={20} />
    </Pressable>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <View className="overflow-hidden rounded-3xl bg-surface dark:bg-surface-dark">{children}</View>;
}

// A short menu instead of one long page: each row opens its own screen, and shows how it's set right now.
export default function Settings() {
  const { data, error } = useData();
  const lock = useAppLock();
  const dark = useColorScheme().colorScheme === "dark";
  if (!data?.currency) return <ErrorText>{error}</ErrorText>;
  const { reminders, recurring, lastBackup, currency } = data;

  const reminderStatus =
    [reminders.due && "Card due dates", reminders.daily && "Daily reminder"].filter(Boolean).join(" · ") || "Off";

  return (
    <ScrollView className="flex-1 bg-canvas dark:bg-canvas-dark" contentContainerClassName="gap-4 p-4 pb-8">
      <Group>
        <Row section="appearance" icon="palette" status={dark ? "Dark theme" : "Light theme"} />
        {APP_LOCK_SUPPORTED && <Row section="security" icon="lock" status={lock.enabled ? "App lock on" : "App lock off"} />}
        {REMINDERS_SUPPORTED && <Row section="reminders" icon="bell" status={reminderStatus} />}
        <Row
          section="recurring"
          icon="repeat"
          status={recurring.length ? `${recurring.length} repeating` : "None yet"}
        />
        <Row
          section="data"
          icon="share"
          status={lastBackup ? `Last backup ${lastBackup}` : "No backup yet"}
          last
        />
      </Group>

      <Group>
        <Row section="clear" icon="trash" status="Delete everything and start over" danger last />
      </Group>

      <View className="mt-6 items-center gap-2">
        <Logo size={48} />
        <Text className="font-semibold text-base text-ink dark:text-white">Pocketeer</Text>
        <Muted>{`Version ${Constants.expoConfig?.version ?? "unknown"} · ${currency}`}</Muted>
      </View>
    </ScrollView>
  );
}
