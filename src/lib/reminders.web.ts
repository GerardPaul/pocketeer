import type { Data } from "@/db/db";

// Browsers have no local scheduled notifications here; web is only used for local testing.
export const REMINDERS_SUPPORTED = false;

export async function allowReminders(): Promise<boolean> {
  return false;
}

export async function scheduleReminders(_data: Data): Promise<void> {}
