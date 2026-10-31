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
            onChange={(_, d) => d && onChange(toDateString(d))}
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
              onChange: (e, d) => e.type === "set" && d && onChange(toDateString(d)),
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
