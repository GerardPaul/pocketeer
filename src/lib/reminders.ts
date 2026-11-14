import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { Data } from "@/db/db";
import { dueReminders, formatDay, toDateString } from "@/lib/ledger";

// Local notifications only, so they work in Expo Go; nothing is sent to a server.
export const REMINDERS_SUPPORTED = true;

const CHANNEL = "reminders";
const DUE_HOUR = 9;

// Show reminders even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Asked when a reminder is turned on. Android needs the channel to exist before it shows the permission prompt.
export async function allowReminders(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function schedule(data: Data) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const { due, daily } = data.reminders;
  if (!due && !daily) return;
  // Turned off in the phone's settings since: nothing would show, so don't schedule.
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const now = new Date();
  if (due) {
    for (const r of dueReminders(data.accounts, data.transactions, toDateString(now))) {
      const [y, m, d] = r.remindOn.split("-").map(Number);
      const date = new Date(y, m - 1, d, DUE_HOUR);
      if (date <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${r.account.name} payment due in 3 days`,
          body: `It’s due ${formatDay(r.due)}. Paying on time avoids late fees.`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
      });
    }
  }
  if (daily) {
    const [hour, minute] = daily.split(":").map(Number);
    await Notifications.scheduleNotificationAsync({
      content: { title: "Log today’s spending", body: "A few taps now keeps your budgets right." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
    });
  }
}

let queue: Promise<void> = Promise.resolve();

// Replaces every scheduled reminder with what the data and settings call for now. Runs when Home loads and after
// reminder settings change, so payments, new cards and edits are picked up. Runs one at a time, so two quick calls
// can't interleave their cancel and schedule steps and leave duplicates.
export function scheduleReminders(data: Data): Promise<void> {
  queue = queue.catch(() => {}).then(() => schedule(data));
  return queue;
}
