import { type AndroidSymbol, type SFSymbol, SymbolView } from "expo-symbols";
import { type ReactNode, useState } from "react";
import { type ColorValue, Pressable, Text, TextInput, type TextInputProps, useColorScheme, View } from "react-native";

import palette from "@/lib/palette";

// SF Symbols on iOS, Material Symbols on Android and web.
const ICONS = {
  home: ["house.fill", "home"],
  history: ["clock.fill", "history"],
  wallet: ["wallet.bifold.fill", "account_balance_wallet"],
  tag: ["tag.fill", "sell"],
  settings: ["gearshape.fill", "settings"],
  add: ["plus", "add"],
  expense: ["arrow.up.right", "north_east"],
  income: ["arrow.down.left", "south_west"],
  transfer: ["arrow.left.arrow.right", "swap_horiz"],
  back: ["chevron.left", "chevron_left"],
  forward: ["chevron.right", "chevron_right"],
  card: ["creditcard.fill", "credit_card"],
  cash: ["banknote.fill", "payments"],
  share: ["square.and.arrow.up", "ios_share"],
  download: ["square.and.arrow.down", "download"],
  lock: ["lock.fill", "lock"],
} satisfies Record<string, [SFSymbol, AndroidSymbol]>;

export type IconName = keyof typeof ICONS;

// Icons are decorative; the text next to them carries the meaning.
export function Icon({ name, color, size = 22 }: { name: IconName; color: ColorValue; size?: number }) {
  const [ios, android] = ICONS[name];
  return <SymbolView name={{ ios, android, web: android }} size={size} tintColor={color} aria-hidden />;
}

// Raw colors for things classes can't reach (icon tints).
export function useColors() {
  const dark = useColorScheme() === "dark";
  return {
    text: dark ? "#FFFFFF" : palette.ink,
    muted: dark ? palette.mutedDark : palette.muted,
    primary: dark ? palette.accent : palette.primary,
    sea: palette.sea,
  };
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  icon?: IconName;
}) {
  const { text: textColor } = useColors();
  const colors = {
    primary: "bg-accent",
    secondary: "border border-line bg-surface dark:border-line-dark dark:bg-surface-dark",
    danger: "bg-red-600",
  }[variant];
  const text = { primary: "text-ink", secondary: "text-ink dark:text-white", danger: "text-white" }[variant];
  const iconColor = { primary: palette.ink, secondary: textColor, danger: "#FFFFFF" }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-2xl px-5 py-3.5 active:opacity-80 ${colors} ${disabled ? "opacity-40" : ""}`}
    >
      {icon && <Icon name={icon} color={iconColor} size={20} />}
      <Text className={`font-semibold text-base ${text}`}>{title}</Text>
    </Pressable>
  );
}

function Label({ children }: { children: string }) {
  return <Text className="font-medium text-sm text-muted dark:text-muted-dark">{children}</Text>;
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View className="gap-1.5">
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={palette.mutedDark}
        className="rounded-2xl border border-line bg-surface px-4 py-3.5 font-regular text-base text-ink dark:border-line-dark dark:bg-surface-dark dark:text-white"
        {...props}
      />
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" className="font-medium text-sm text-red-600 dark:text-red-400">
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text className="font-regular text-sm text-muted dark:text-muted-dark">{children}</Text>;
}

export function Heading({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" className="mt-3 font-semibold text-lg text-ink dark:text-white">
      {children}
    </Text>
  );
}

// Full-screen message for screens that have nothing to show yet.
export function EmptyState({ message, action }: { message: string; action?: { title: string; onPress: () => void } }) {
  return (
    <View className="flex-1 items-center justify-center gap-5 bg-canvas p-8 dark:bg-canvas-dark">
      <Text className="text-center font-regular text-base text-muted dark:text-muted-dark">{message}</Text>
      {action && <Button title={action.title} icon="add" onPress={action.onPress} />}
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
    <View className="gap-1.5">
      <Label>{label}</Label>
      <View
        accessibilityRole="radiogroup"
        className="flex-row gap-1 rounded-2xl border border-line bg-surface p-1 dark:border-line-dark dark:bg-surface-dark"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              aria-checked={active}
              onPress={() => onChange(o.value)}
              className={`flex-1 items-center rounded-xl py-2.5 ${active ? "bg-primary" : ""}`}
            >
              <Text
                className={active ? "font-semibold text-white" : "font-medium text-muted dark:text-muted-dark"}
              >
                {o.label}
              </Text>
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
    <View className="gap-1.5">
      <Label>{label}</Label>
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
              className={`rounded-full border px-4 py-2 ${active ? "border-sea bg-sea" : "border-line bg-surface dark:border-line-dark dark:bg-surface-dark"}`}
            >
              <Text className={active ? "font-medium text-white" : "font-regular text-ink dark:text-white"}>
                {o.label}
              </Text>
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
      className="gap-1 rounded-3xl bg-surface p-4 active:opacity-70 dark:bg-surface-dark"
    >
      {children}
    </Pressable>
  );
}

// Round tinted badge holding an icon, like the category tiles in the list rows.
export function IconBadge({ name, color }: { name: IconName; color: string }) {
  return (
    <View className="h-11 w-11 items-center justify-center rounded-full bg-sea/10 dark:bg-white/10">
      <Icon name={name} color={color} size={20} />
    </View>
  );
}
