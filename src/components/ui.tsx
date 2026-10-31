import type { ReactNode } from "react";
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
      accessibilityState={{ disabled }}
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
