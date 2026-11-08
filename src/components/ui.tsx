import { useColorScheme } from "nativewind";
import { useHeaderHeight } from "expo-router/react-navigation";
import { type ReactNode, useState } from "react";
import {
  type ColorValue,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { ICON_PATHS } from "@/components/icon-paths";
import type { CategoryIcon } from "@/lib/category-icons";
import { cleanTextInput } from "@/lib/input";
import { formatAmountInput } from "@/lib/money";
import palette from "@/lib/palette";

// Material Symbols names. They're drawn as SVG paths (icon-paths.ts, made by scripts/icons.mjs) so every platform
// shows the same, centered icon; drawing them as font text placed them differently on iOS.
// Record over CategoryIcon makes a missing glyph for a category icon a type error, and IconSymbol makes
// one missing from icon-paths.ts (scripts/icons.mjs not rerun) a type error too.
type IconSymbol = keyof typeof ICON_PATHS;
const CATEGORY_GLYPHS: Record<CategoryIcon, IconSymbol> = {
  tag: "sell",
  food: "restaurant",
  groceries: "shopping_cart",
  coffee: "local_cafe",
  transport: "directions_car",
  commute: "directions_bus",
  fuel: "local_gas_station",
  house: "home",
  bills: "bolt",
  water: "water_drop",
  phone: "smartphone",
  internet: "wifi",
  health: "medical_services",
  fitness: "fitness_center",
  shopping: "shopping_bag",
  clothes: "checkroom",
  fun: "movie",
  games: "sports_esports",
  education: "menu_book",
  gifts: "redeem",
  travel: "flight",
  pets: "pets",
  family: "group",
  savings: "savings",
  subscriptions: "autorenew",
};

const ICONS = {
  ...CATEGORY_GLYPHS,
  home: "home",
  history: "history",
  wallet: "account_balance_wallet",
  settings: "settings",
  add: "add",
  expense: "north_east",
  income: "south_west",
  transfer: "swap_horiz",
  back: "chevron_left",
  forward: "chevron_right",
  card: "credit_card",
  cash: "payments",
  share: "ios_share",
  download: "download",
  lock: "lock",
  trash: "delete",
  down: "expand_more",
  close: "close",
  search: "search",
  check: "check_circle",
  up: "expand_less",
  filter: "filter_list",
  edit: "edit",
  list: "receipt_long",
} satisfies Record<string, IconSymbol>;

export type IconName = keyof typeof ICONS;

// Icons are decorative; the text next to them carries the meaning.
export function Icon({ name, color, size = 22 }: { name: IconName; color: ColorValue; size?: number }) {
  return (
    // The View hides it from screen readers; Svg would pass those props straight to the DOM on web.
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 -960 960 960">
        <Path d={ICON_PATHS[ICONS[name]]} fill={color} />
      </Svg>
    </View>
  );
}

// Raw colors for things classes can't reach (icon tints).
export function useColors() {
  const dark = useColorScheme().colorScheme === "dark";
  return {
    text: dark ? "#FFFFFF" : palette.ink,
    muted: dark ? palette.mutedDark : palette.muted,
    primary: dark ? palette.accent : palette.primary,
    // Cyan icons are too faint on light surfaces, so light mode tints with the deep teal.
    tint: dark ? palette.sea : palette.primary,
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

// Low-key text button for secondary moves like Back and Skip, where a full button would compete with the main action.
export function TextButton({ title, icon, onPress }: { title: string; icon?: IconName; onPress: () => void }) {
  const { muted } = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      hitSlop={8}
      className="min-h-11 flex-row items-center gap-1 rounded-full px-2 active:opacity-60"
    >
      {icon && <Icon name={icon} color={muted} size={18} />}
      <Text className="font-medium text-sm text-muted dark:text-muted-dark">{title}</Text>
    </Pressable>
  );
}

function Label({ children }: { children: string }) {
  return <Text className="font-medium text-sm text-muted dark:text-muted-dark">{children}</Text>;
}

// Every field filters what's typed. Passing `currency` makes it an amount field: digits and one decimal mark,
// grouped as typed ("1,234.50"). Other fields drop control characters.
export function Field({
  label,
  currency,
  onChangeText,
  ...props
}: { label: string; currency?: string } & TextInputProps) {
  const amount = currency !== undefined;
  return (
    <View className="gap-1.5">
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={palette.mutedDark}
        maxLength={amount ? 20 : 100}
        keyboardType={amount ? "decimal-pad" : undefined}
        inputMode={amount ? "decimal" : undefined}
        placeholder={amount ? "0" : undefined}
        className="rounded-2xl border border-line bg-surface px-4 py-3.5 font-regular text-base text-ink dark:border-line-dark dark:bg-surface-dark dark:text-white"
        {...props}
        onChangeText={(t) => onChangeText?.(amount ? formatAmountInput(t, currency) : cleanTextInput(t))}
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

// Scrolling container for form screens; keeps the focused field above the keyboard.
// iOS scrolls natively. Android needs KeyboardAvoidingView, offset by the header because it measures from its own top.
export function FormScrollView({ children }: { children: ReactNode }) {
  const headerHeight = useHeaderHeight();
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      behavior={Platform.OS === "android" ? "padding" : undefined}
      enabled={Platform.OS === "android"}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-4 pb-8"
        automaticallyAdjustKeyboardInsets
        // A tap on Save (or any control) while the keyboard is up should act, not just close the keyboard.
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
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

export type SelectOption = { value: number; label: string; icon?: IconName };

// Dropdown that opens a searchable list, so long lists of accounts or categories don't stretch the form.
export function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly SelectOption[];
  value: number | null;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { text, muted, tint } = useColors();
  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const matches = options.filter((o) => o.label.toLowerCase().includes(q));
  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <View className="gap-1.5">
      <Label>{label}</Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? "none chosen"}`}
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 active:opacity-70 dark:border-line-dark dark:bg-surface-dark"
      >
        {selected?.icon && <Icon name={selected.icon} color={tint} size={20} />}
        <Text
          numberOfLines={1}
          className={`flex-1 text-base ${selected ? "font-regular text-ink dark:text-white" : "font-regular text-muted dark:text-muted-dark"}`}
        >
          {selected?.label ?? "Choose…"}
        </Text>
        <Icon name="down" color={muted} size={18} />
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        {/* Modals render outside the app's provider tree, so they need their own for insets. */}
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            <View className="flex-1 gap-3 bg-canvas p-4 dark:bg-canvas-dark">
              <View className="flex-row items-center justify-between">
                <Text accessibilityRole="header" className="font-semibold text-lg text-ink dark:text-white">
                  {label}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={close}
                  className="h-11 w-11 items-center justify-center rounded-full active:opacity-60"
                >
                  <Icon name="close" color={text} />
                </Pressable>
              </View>
              <Field label="Search" value={query} onChangeText={setQuery} autoCorrect={false} placeholder="Type to filter" />
              <FlatList
                data={matches}
                keyExtractor={(o) => String(o.value)}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
                accessibilityRole="radiogroup"
                contentContainerClassName="gap-2 pb-4"
                renderItem={({ item }) => {
                  const active = item.value === value;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityLabel={item.label}
                      aria-checked={active}
                      onPress={() => {
                        onChange(item.value);
                        close();
                      }}
                      className={`flex-row items-center gap-3 rounded-2xl px-4 py-3.5 ${active ? "bg-sea" : "bg-surface dark:bg-surface-dark"}`}
                    >
                      {item.icon && <Icon name={item.icon} color={active ? palette.ink : tint} size={20} />}
                      <Text
                        numberOfLines={1}
                        className={`flex-1 text-base ${active ? "font-medium text-ink" : "font-regular text-ink dark:text-white"}`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={<Muted>{`Nothing matches “${query}”.`}</Muted>}
              />
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

// Grid of category icons to pick from.
export function IconPicker<T extends IconName>({
  label,
  icons,
  names,
  value,
  onChange,
}: {
  label: string;
  icons: readonly T[];
  names: Record<T, string>;
  value: T;
  onChange: (icon: T) => void;
}) {
  const { tint } = useColors();
  return (
    <View className="gap-1.5">
      <Label>{label}</Label>
      <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
        {icons.map((name) => {
          const active = name === value;
          return (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityLabel={names[name]}
              aria-checked={active}
              onPress={() => onChange(name)}
              className={`h-12 w-12 items-center justify-center rounded-2xl border ${active ? "border-sea bg-sea" : "border-line bg-surface dark:border-line-dark dark:bg-surface-dark"}`}
            >
              <Icon name={name} color={active ? palette.ink : tint} size={22} />
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
