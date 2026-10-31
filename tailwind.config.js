const palette = require("./src/lib/palette");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Native always follows the phone's light/dark setting. "media" crashes NativeWind 4's web runtime in dev,
  // so "class" is used; the root layout sets the class on web from the system setting.
  darkMode: "class",
  theme: {
    // Each Poppins weight is its own font family (Android can't pick weights of a custom font),
    // so font-medium etc. switch the family and the fontWeight utilities are dropped.
    fontFamily: {
      regular: ["Poppins_400Regular"],
      medium: ["Poppins_500Medium"],
      semibold: ["Poppins_600SemiBold"],
      bold: ["Poppins_700Bold"],
    },
    fontWeight: {},
    extend: {
      colors: {
        primary: palette.primary,
        sea: palette.sea,
        accent: palette.accent,
        ink: palette.ink,
        muted: { DEFAULT: palette.muted, dark: palette.mutedDark },
        canvas: { DEFAULT: palette.canvas, dark: palette.canvasDark },
        surface: { DEFAULT: palette.surface, dark: palette.surfaceDark },
        line: { DEFAULT: palette.line, dark: palette.lineDark },
      },
    },
  },
  plugins: [],
};
