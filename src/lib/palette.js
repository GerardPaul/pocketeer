// Shared by tailwind.config.js (class names) and app code that needs raw colors (icons, navigation theme).
// CommonJS so the Tailwind config can require it.
module.exports = {
  primary: "#117F8E", // deep teal (#128494 darkened for 4.5:1 with white text): hero cards, selected states.
  sea: "#00B7C2", // bright cyan: regular account cards, chips, progress. Ink text on it; white is too low contrast.
  accent: "#4EF037", // green: main action, highlights. Ink text on it; white is too low contrast.
  ink: "#073B42", // text on cyan and green, headings
  muted: "#4F6F74",
  mutedDark: "#9BB8BC",
  canvas: "#ECFEFF",
  canvasDark: "#04252A",
  surface: "#FFFFFF",
  surfaceDark: "#0A363D",
  line: "#CDEFF2",
  lineDark: "#145159",
};
