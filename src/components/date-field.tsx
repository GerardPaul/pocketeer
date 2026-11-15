import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Platform, Pressable, Text, View } from "react-native";

import { toDateString } from "@/lib/ledger";

function toDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DateField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: string; // latest allowed date, YYYY-MM-DD
}) {
  const date = toDate(value);
  const maximumDate = max ? toDate(max) : undefined;
  return (
    <View className="gap-1.5">
      <Text className="font-medium text-sm text-muted dark:text-muted-dark">{label}</Text>
      {Platform.OS === "ios" ? (
        <View className="items-start">
          <DateTimePicker
            accessibilityLabel={label}
            value={date}
            mode="date"
            display="compact"
            maximumDate={maximumDate}
            onValueChange={(_, d) => onChange(toDateString(d))}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}`}
          onPress={() =>
            DateTimePickerAndroid.open({
              value: date,
              mode: "date",
              maximumDate,
              onValueChange: (_, d) => onChange(toDateString(d)),
            })
          }
          className="rounded-2xl border border-line bg-surface px-4 py-3.5 dark:border-line-dark dark:bg-surface-dark"
        >
          <Text className="font-regular text-base text-ink dark:text-white">{value}</Text>
        </Pressable>
      )}
    </View>
  );
}

// "20:00" ↔ a Date today at that time, and shown in the phone's own format (8:00 PM or 20:00).
function timeToDate(value: string): Date {
  const [h, m] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
const toTime = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timeToDate(value));

export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const date = timeToDate(value);
  return (
    <View className="gap-1.5">
      <Text className="font-medium text-sm text-muted dark:text-muted-dark">{label}</Text>
      {Platform.OS === "ios" ? (
        <View className="items-start">
          <DateTimePicker
            accessibilityLabel={label}
            value={date}
            mode="time"
            display="compact"
            onValueChange={(_, d) => onChange(toTime(d))}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatTime(value)}`}
          onPress={() =>
            DateTimePickerAndroid.open({
              value: date,
              mode: "time",
              onValueChange: (_, d) => onChange(toTime(d)),
            })
          }
          className="rounded-2xl border border-line bg-surface px-4 py-3.5 dark:border-line-dark dark:bg-surface-dark"
        >
          <Text className="font-regular text-base text-ink dark:text-white">{formatTime(value)}</Text>
        </Pressable>
      )}
    </View>
  );
}
