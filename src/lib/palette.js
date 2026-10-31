// Shared by tailwind.config.js (class names) and app code that needs raw colors (icons, navigation theme).
// CommonJS so the Tailwind config can require it.
module.exports = {
  primary: "#0F4C75", // deep blue: hero cards, selected states
  sea: "#0E7C86", // teal: chips, progress
  accent: "#FF7A59", // coral: main action, highlights. Pair with ink text; white on coral is too low contrast.
  ink: "#0B2540", // text on accent, headings
  muted: "#64748B",
  mutedDark: "#94A3B8",
  canvas: "#F2F7F7",
  canvasDark: "#0A1820",
  surface: "#FFFFFF",
  surfaceDark: "#132A35",
  line: "#DCE7E8",
  lineDark: "#24414E",
};
