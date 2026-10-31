import { type ReactNode, useState } from "react";
import { Pressable, Text, TextInput, type TextInputProps, View } from "react-native";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const colors = {
    primary: "bg-emerald-600 active:bg-emerald-700",
    secondary: "bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-700 dark:active:bg-neutral-600",
    danger: "bg-red-600 active:bg-red-700",
  }[variant];
  const text = variant === "secondary" ? "text-neutral-900 dark:text-white" : "text-white";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      className={`items-center rounded-xl px-4 py-3 ${colors} ${disabled ? "opacity-40" : ""}`}
    >
      <Text className={`text-base font-semibold ${text}`}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#a3a3a3"
        className="rounded-xl border border-neutral-300 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
        {...props}
      />
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text className="text-sm text-neutral-500 dark:text-neutral-400">{children}</Text>;
}

// Full-screen message for screens that have nothing to show yet.
export function EmptyState({ message, action }: { message: string; action?: { title: string; onPress: () => void } }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white p-6 dark:bg-neutral-900">
      <Text className="text-center text-base text-neutral-500 dark:text-neutral-400">{message}</Text>
      {action && <Button title={action.title} onPress={action.onPress} />}
    </View>
  );
}

// Two taps to delete. Inline instead of Alert so it behaves the same on every platform.
export function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <View className="gap-2">
      <Button title="Tap to confirm delete" variant="danger" onPress={onConfirm} />
      <Button title="Cancel" variant="secondary" onPress={() => setArmed(false)} />
    </View>
  ) : (
    <Button title="Delete" variant="secondary" onPress={() => setArmed(true)} />
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{label}</Text>
      <View accessibilityRole="radiogroup" className="flex-row gap-1 rounded-xl bg-neutral-200 p-1 dark:bg-neutral-800">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              aria-checked={active}
              onPress={() => onChange(o.value)}
              className={`flex-1 items-center rounded-lg py-2 ${active ? "bg-white dark:bg-neutral-600" : ""}`}
            >
              <Text className="font-medium text-neutral-900 dark:text-white">{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Like Segmented, but wraps onto multiple lines for longer lists (accounts, categories).
export function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: number; label: string }[];
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{label}</Text>
      <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              aria-checked={active}
              onPress={() => onChange(o.value)}
              className={`rounded-full border px-4 py-2 ${active ? "border-emerald-600 bg-emerald-600" : "border-neutral-300 dark:border-neutral-600"}`}
            >
              <Text className={active ? "font-medium text-white" : "text-neutral-900 dark:text-white"}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className="gap-1 rounded-xl bg-neutral-100 p-4 active:opacity-70 dark:bg-neutral-800"
    >
      {children}
    </Pressable>
  );
}
