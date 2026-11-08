import { View } from "react-native";
import { SvgXml } from "react-native-svg";

import { ICON_SVG } from "@/components/logo-art";

// The app icon, rounded like an iOS home-screen icon. Decorative: it always sits next to the name "Pocketeer".
export function Logo({ size }: { size: number }) {
  return (
    <View aria-hidden style={{ width: size, height: size, borderRadius: size * 0.224, overflow: "hidden" }}>
      <SvgXml xml={ICON_SVG} width={size} height={size} />
    </View>
  );
}
