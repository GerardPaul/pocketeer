/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Native always follows the phone's light/dark setting. "media" crashes NativeWind 4's web runtime in dev,
  // so "class" is used; web (only used for local testing) stays light.
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};
