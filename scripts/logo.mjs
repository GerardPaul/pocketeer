// Renders every app icon from the logo artwork in src/components/logo-art.ts.
// Node has no SVG rasterizer here, so this serves a page that draws each SVG on a browser canvas and posts the PNG
// back. Run it, open http://localhost:8090 in a browser, and it writes the files and exits.
//   node scripts/logo.mjs
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { PNG } from "pngjs";

import {
  coinLayer,
  ICON_SVG,
  INK,
  LIME,
  markOn,
  pocketLayer,
  scaled,
  svg,
  TEAL,
  WHITE,
} from "../src/components/logo-art.ts";

// [file, svg, size, keep transparency]
const RASTERS = [
  // Full-bleed square with no alpha channel: the iOS fallback and App Store icon.
  ["assets/images/icon.png", ICON_SVG, 1024, false],
  // Android adaptive icon: only the middle 2/3 of the 108dp canvas shows, and the mark must stay in the 66dp safe circle.
  // At 3/4 scale it fills a launcher circle about as much as the iOS icon and stays well inside that circle.
  ["assets/images/android-icon-foreground.png", svg(scaled(markOn(TEAL), 3 / 4)), 1024, true],
  ["assets/images/android-icon-background.png", svg(`<rect width="1024" height="1024" fill="${TEAL}"/>`), 1024, false],
  ["assets/images/android-icon-monochrome.png", svg(scaled(coinLayer(WHITE) + pocketLayer(WHITE), 3 / 4)), 1024, true],
  // Splash: the mark alone, cropped to its bounds, on the teal splash background set in app.json.
  ["assets/images/splash-icon.png", svg(markOn(TEAL), "212 208 600 600"), 1024, true],
  ["assets/images/favicon.png", ICON_SVG, 48, false],
];

// iOS 26 Liquid Glass icon (Icon Composer format): teal background (ink in dark mode) and two glass layers.
// Each layer keeps the full canvas so Icon Composer leaves it where it is drawn.
const GLASS = "assets/expo.icon";
const srgb = (hex) =>
  `srgb:${[1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(5)).join(",")},1.00000`;
const iconJson = {
  "fill-specializations": [
    { value: { solid: srgb(TEAL) } },
    { appearance: "dark", value: { solid: srgb(INK) } },
  ],
  groups: [
    {
      layers: [
        { glass: true, "image-name": "pocket.svg", name: "pocket" },
        { glass: true, "image-name": "coin.svg", name: "coin" },
      ],
      shadow: { kind: "neutral", opacity: 0.5 },
      translucency: { enabled: true, value: 0.5 },
    },
  ],
  "supported-platforms": { squares: "shared" },
};

rmSync(`${GLASS}/Assets`, { recursive: true, force: true });
mkdirSync(`${GLASS}/Assets`, { recursive: true });
writeFileSync(`${GLASS}/Assets/coin.svg`, svg(coinLayer(LIME)));
writeFileSync(`${GLASS}/Assets/pocket.svg`, svg(pocketLayer(WHITE)));
writeFileSync(`${GLASS}/icon.json`, `${JSON.stringify(iconJson, null, 2)}\n`);
mkdirSync("assets/logo", { recursive: true });
writeFileSync("assets/logo/pocketeer.svg", ICON_SVG);

const page = `<!doctype html><meta charset="utf-8"><body><script>
const jobs = ${JSON.stringify(RASTERS)};
(async () => {
  for (const [file, src, size] of jobs) {
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
    await img.decode();
    const canvas = Object.assign(document.createElement("canvas"), { width: size, height: size });
    const ctx = canvas.getContext("2d");
    if (file.endsWith("favicon.png")) {
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, size * 0.224);
      ctx.clip();
    }
    ctx.drawImage(img, 0, 0, size, size);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    await fetch("/save?file=" + encodeURIComponent(file), { method: "POST", body: blob });
  }
  await fetch("/done", { method: "POST" });
  document.body.textContent = "Done: " + jobs.length + " images written.";
})();
</script>`;

const allowed = new Map(RASTERS.map(([file, , , alpha]) => [file, alpha]));
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/") return res.end(page);
  if (req.method === "POST" && url.pathname === "/done") {
    res.end();
    console.log("All images written.");
    return server.close();
  }
  const file = url.searchParams.get("file");
  // Only the files listed above can be written.
  if (req.method !== "POST" || url.pathname !== "/save" || !allowed.has(file)) {
    res.statusCode = 404;
    return res.end();
  }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const png = PNG.sync.read(Buffer.concat(chunks));
    // Opaque images are saved as RGB, since App Store icons must not have an alpha channel.
    const out = allowed.get(file)
      ? PNG.sync.write(png)
      : PNG.sync.write(png, { colorType: 2, inputHasAlpha: true, bgColor: { red: 255, green: 255, blue: 255 } });
    writeFileSync(file, out);
    console.log(`Wrote ${file} (${png.width}x${png.height})`);
    res.end();
  });
});
server.listen(8090, "127.0.0.1", () => console.log("Open http://localhost:8090 to render the icons."));
