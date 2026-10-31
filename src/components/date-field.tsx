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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const date = toDate(value);
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{label}</Text>
      {Platform.OS === "ios" ? (
        <View className="items-start">
          <DateTimePicker
            accessibilityLabel={label}
            value={date}
            mode="date"
            display="compact"
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
              onChange: (e, d) => e.type === "set" && d && onChange(toDateString(d)),
            })
          }
          className="rounded-xl border border-neutral-300 bg-white px-3 py-3 dark:border-neutral-600 dark:bg-neutral-800"
        >
          <Text className="text-base text-neutral-900 dark:text-white">{value}</Text>
        </Pressable>
      )}
    </View>
  );
}
