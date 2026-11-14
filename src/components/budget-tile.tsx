import { useColorScheme } from "nativewind";
import { Children, isValidElement, type ReactNode } from "react";
import { type ColorValue, Pressable, Text, View } from "react-native";

import { Icon, type IconName, useColors } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import palette from "@/lib/palette";

const SIZE = 72;
const STROKE = 7;
const HALF = SIZE / 2;

// One half of the ring, rotated into view by `degrees` (0–180).
// The half-ring starts hidden behind its clip and sweeps clockwise into it.
function Sweep({ side, degrees, color }: { side: "right" | "left"; degrees: number; color: ColorValue }) {
  const right = side === "right";
  return (
    <View style={{ position: "absolute", top: 0, left: right ? HALF : 0, width: HALF, height: SIZE, overflow: "hidden" }}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: right ? -HALF : 0,
          width: SIZE,
          height: SIZE,
          transform: [{ rotate: `${degrees}deg` }],
        }}
      >
        <View style={{ position: "absolute", top: 0, left: right ? 0 : HALF, width: HALF, height: SIZE, overflow: "hidden" }}>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: right ? 0 : -HALF,
              width: SIZE,
              height: SIZE,
              borderRadius: HALF,
              borderWidth: STROKE,
              borderColor: color,
            }}
          />
        </View>
      </View>
    </View>
  );
}

// Circular meter built from two rotating half-rings, so it needs no SVG library.
function Ring({ pct, color, track, children }: { pct: number; color: ColorValue; track: ColorValue; children: ReactNode }) {
  const turn = (pct / 100) * 360;
  return (
    <View style={{ width: SIZE, height: SIZE }} className="items-center justify-center">
      <View
        style={{ position: "absolute", width: SIZE, height: SIZE, borderRadius: HALF, borderWidth: STROKE, borderColor: track }}
      />
      {turn > 0 && <Sweep side="right" degrees={Math.min(turn, 180)} color={color} />}
      {turn > 180 && <Sweep side="left" degrees={turn - 180} color={color} />}
      {children}
    </View>
  );
}

export function BudgetTile({
  name,
  icon,
  spent,
  budget,
  currency,
  onPress,
}: {
  name: string;
  icon: IconName;
  spent: number;
  budget: number;
  currency: string;
  onPress?: () => void;
}) {
  const { tint } = useColors();
  const dark = useColorScheme().colorScheme === "dark";
  const over = spent > budget;
  // The ring shows what's left, so it empties as the budget gets used.
  const left = budget ? Math.max(0, ((budget - spent) / budget) * 100) : 0;
  const tile = (
    <View className="items-center gap-2">
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${name} budget left`}
        aria-valuenow={Math.round(left)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Over budget leaves an empty ring, so the track turns red to flag it. */}
        <Ring pct={left} color={palette.sea} track={over ? "#FCA5A5" : dark ? palette.lineDark : palette.line}>
          <Icon name={icon} color={over ? "#EF4444" : tint} size={24} />
        </Ring>
      </View>
      <View className="w-full items-center gap-0.5">
        <Text numberOfLines={1} className="font-semibold text-base text-ink dark:text-white">
          {name}
        </Text>
        <Text numberOfLines={1} className="font-regular text-xs text-muted dark:text-muted-dark">
          {`${formatMoney(spent, currency)} of ${formatMoney(budget, currency)}`}
        </Text>
        {over ? (
          <Text numberOfLines={1} className="font-medium text-sm text-red-600 dark:text-red-400">
            Over by {formatMoney(spent - budget, currency)}
          </Text>
        ) : (
          <Text numberOfLines={1} className="font-medium text-sm text-ink dark:text-white">
            {formatMoney(budget - spent, currency)} left
          </Text>
        )}
      </View>
    </View>
  );
  if (!onPress) return tile;
  // A button reads as one item, so its label carries what the ring and text show.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}: ${formatMoney(spent, currency)} of ${formatMoney(budget, currency)}, ${
        over ? `over by ${formatMoney(spent - budget, currency)}` : `${formatMoney(budget - spent, currency)} left`
      }`}
      accessibilityHint="Shows these transactions in History"
      onPress={onPress}
      className="active:opacity-70"
    >
      {tile}
    </Pressable>
  );
}

// Last tile in the grid, so a category can be added without leaving Home. Same ring size as the others.
export function AddCategoryTile({ onPress }: { onPress: () => void }) {
  const { tint } = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add category"
      onPress={onPress}
      className="items-center gap-2 active:opacity-70"
    >
      <View style={{ width: SIZE, height: SIZE }} className="items-center justify-center rounded-full bg-sea/10 dark:bg-white/10">
        <Icon name="add" color={tint} size={28} />
      </View>
      <Text className="font-semibold text-base text-ink dark:text-white">Add category</Text>
    </Pressable>
  );
}

// Two tiles per row; each child becomes a card. Fixed half-width cells keep a lone last tile from stretching.
export function BudgetGrid({ children }: { children: ReactNode }) {
  return (
    <View className="-m-1.5 flex-row flex-wrap">
      {Children.toArray(children).map((child, i) => (
        <View key={isValidElement(child) ? child.key : i} className="w-1/2 p-1.5">
          <View className="rounded-3xl bg-surface px-3 py-4 dark:bg-surface-dark">{child}</View>
        </View>
      ))}
    </View>
  );
}
