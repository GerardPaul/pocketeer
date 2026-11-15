import type { Href } from "expo-router";

// Expo Router 57's generated route types omit "/" and offer "/(tabs)/index", which doesn't resolve at runtime.
export const HOME = "/" as Href;

// Each row of the Settings menu opens /settings/<key>, titled with its value.
export const SETTINGS_SECTIONS = {
  appearance: "Appearance",
  security: "Security",
  reminders: "Reminders",
  recurring: "Recurring",
  data: "Backup & export",
  clear: "Clear data",
} as const;
export type SettingsSection = keyof typeof SETTINGS_SECTIONS;
