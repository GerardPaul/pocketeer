// Regenerates src/components/icon-paths.ts from the Material Symbols font that ships with expo-symbols.
// Run after adding an icon to ICONS in src/components/ui.tsx: node scripts/icons.mjs
// Icons are drawn as SVG paths instead of font text because iOS positions this font's glyphs inconsistently.
import { readFileSync, writeFileSync } from "node:fs";

// expo-symbols doesn't export its codepoint map, so it's read straight from node_modules.
const modules = new URL("../node_modules/", import.meta.url);
const codepoints = JSON.parse(readFileSync(new URL("expo-symbols/build/android/symbols.json", modules), "utf8"));
const font = readFileSync(
  new URL("@expo-google-fonts/material-symbols/400Regular/MaterialSymbols_400Regular.ttf", modules),
);

const tables = {};
for (let i = 0; i < font.readUInt16BE(4); i++) {
  const at = 12 + 16 * i;
  tables[font.toString("latin1", at, at + 4)] = font.readUInt32BE(at + 8);
}
const longLoca = font.readInt16BE(tables.head + 50) === 1;
const glyphCount = font.readUInt16BE(tables.maxp + 4);
const glyphStart = (id) =>
  tables.glyf + (longLoca ? font.readUInt32BE(tables.loca + 4 * id) : 2 * font.readUInt16BE(tables.loca + 2 * id));

// Format 4 or 12 cmap subtable: codepoint -> glyph id.
function glyphFor(code) {
  const cmap = tables.cmap;
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
    const sub = cmap + font.readUInt32BE(cmap + 8 + 8 * i);
    const format = font.readUInt16BE(sub);
    if (format === 12) {
      for (let g = 0; g < font.readUInt32BE(sub + 12); g++) {
        const at = sub + 16 + 12 * g;
        const [start, end, first] = [font.readUInt32BE(at), font.readUInt32BE(at + 4), font.readUInt32BE(at + 8)];
        if (code >= start && code <= end) return first + code - start;
      }
    } else if (format === 4) {
      const segs = font.readUInt16BE(sub + 6) / 2;
      const ends = sub + 14;
      const starts = ends + 2 * segs + 2;
      const deltas = starts + 2 * segs;
      const offsets = deltas + 2 * segs;
      for (let s = 0; s < segs; s++) {
        if (code > font.readUInt16BE(ends + 2 * s) || code < font.readUInt16BE(starts + 2 * s)) continue;
        const ro = font.readUInt16BE(offsets + 2 * s);
        const delta = font.readInt16BE(deltas + 2 * s);
        if (ro === 0) return (code + delta) & 0xffff;
        const g = font.readUInt16BE(offsets + 2 * s + ro + 2 * (code - font.readUInt16BE(starts + 2 * s)));
        return g === 0 ? 0 : (g + delta) & 0xffff;
      }
    }
  }
  return 0;
}

// TrueType outline -> contours of {x, y, on} points, following composite glyphs.
function contours(id, dx = 0, dy = 0) {
  if (id >= glyphCount) return [];
  const at = glyphStart(id);
  if (glyphStart(id + 1) === at) return [];
  const count = font.readInt16BE(at);
  if (count < 0) {
    const out = [];
    let p = at + 10;
    for (let more = true; more; ) {
      const flags = font.readUInt16BE(p);
      const child = font.readUInt16BE(p + 2);
      p += 4;
      const words = flags & 1;
      const x = words ? font.readInt16BE(p) : font.readInt8(p);
      const y = words ? font.readInt16BE(p + 2) : font.readInt8(p + 1);
      p += words ? 4 : 2;
      if (flags & 0xc8) throw new Error(`Glyph ${id} uses a scaled component, which this script doesn't handle.`);
      out.push(...contours(child, dx + x, dy + y));
      more = Boolean(flags & 0x20);
    }
    return out;
  }
  let p = at + 10;
  const ends = [];
  for (let i = 0; i < count; i++, p += 2) ends.push(font.readUInt16BE(p));
  const total = count ? ends[count - 1] + 1 : 0;
  p += 2 + font.readUInt16BE(p);
  const flags = [];
  while (flags.length < total) {
    const f = font[p++];
    flags.push(f);
    if (f & 8) for (let r = font[p++]; r > 0; r--) flags.push(f);
  }
  const coords = (short, same) => {
    let v = 0;
    return flags.map((f) => {
      if (f & short) v += f & same ? font[p++] : -font[p++];
      else if (!(f & same)) (v += font.readInt16BE(p)), (p += 2);
      return v;
    });
  };
  const xs = coords(2, 16);
  const ys = coords(4, 32);
  const out = [];
  let start = 0;
  for (const end of ends) {
    const pts = [];
    for (let i = start; i <= end; i++) pts.push({ x: xs[i] + dx, y: ys[i] + dy, on: Boolean(flags[i] & 1) });
    out.push(pts);
    start = end + 1;
  }
  return out;
}

// Font units are y-up from the baseline; the SVG viewBox "0 -960 960 960" flips y, as Google's own icon SVGs do.
const pt = ({ x, y }) => `${x} ${-y}`;
function toPath(id) {
  let d = "";
  for (const pts of contours(id)) {
    if (!pts.length) continue;
    // Rotate so the contour starts on a curve point, inventing a midpoint if it has none.
    const first = pts.findIndex((q) => q.on);
    const ring =
      first < 0
        ? [{ x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2, on: true }, ...pts.slice(1), pts[0]]
        : [...pts.slice(first), ...pts.slice(0, first)];
    // The font keeps many repeated points (left over from its variable-weight source); zero-length segments are skipped.
    let at = ring[0];
    const same = (a, b) => a.x === b.x && a.y === b.y;
    d += `M${pt(at)}`;
    for (let i = 1; i <= ring.length; i++) {
      const cur = ring[i % ring.length];
      const prev = ring[i - 1];
      if (cur.on && prev.on) {
        if (!same(cur, at)) d += `L${pt(cur)}`;
        at = cur;
      } else if (!cur.on) {
        const next = ring[(i + 1) % ring.length];
        const end = next.on ? next : { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2 };
        if (same(cur, at) || same(cur, end)) {
          if (!same(end, at)) d += `L${pt(end)}`;
        } else d += `Q${pt(cur)} ${pt(end)}`;
        at = end;
        if (next.on) i++;
      }
    }
    d += "Z";
  }
  return d;
}

// The icon maps run from CATEGORY_GLYPHS to the end of ICONS.
const ui = readFileSync(new URL("../src/components/ui.tsx", import.meta.url), "utf8");
const maps = ui.slice(ui.indexOf("const CATEGORY_GLYPHS"), ui.indexOf("export type IconName"));
const names = [...new Set([...maps.matchAll(/^\s+\w+: "([a-z0-9_]+)",$/gm)].map((m) => m[1]))].sort();
const lines = names.map((name) => {
  const id = glyphFor(codepoints[name] ?? 0);
  if (!id) throw new Error(`No Material Symbol named "${name}".`);
  return `  ${name}: "${toPath(id)}",`;
});
writeFileSync(
  new URL("../src/components/icon-paths.ts", import.meta.url),
  `// Generated by scripts/icons.mjs from the Material Symbols font (400 weight, outlined). Don't edit by hand.\n` +
    `// Paths use the viewBox "0 -960 960 960".\nexport const ICON_PATHS = {\n${lines.join("\n")}\n};\n`,
);
console.log(`Wrote ${names.length} icons.`);
