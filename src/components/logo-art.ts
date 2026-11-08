// The Pocketeer logo, a lime coin dropping into a stitched pocket, as SVG markup on a 1024 canvas.
// Shared by the in-app Logo component and scripts/logo.mjs, which renders the app icons from it.
// Colors are the app palette (src/lib/palette.js).
export const TEAL = "#117F8E";
export const INK = "#073B42";
export const LIME = "#4EF037";
export const WHITE = "#FFFFFF";

const POCKET =
  "M324 432H700Q728 432 728 460V616Q728 676 674 704L540 776Q512 791 484 776L350 704Q296 676 296 616V460Q296 432 324 432Z";
const STITCH = "M346 474H678V610Q678 646 648 662L512 734L376 662Q346 646 346 610Z";

export const svg = (body: string, viewBox = "0 0 1024 1024") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="1024" height="1024">${body}</svg>`;
const ring = (stroke: string) => `<circle cx="512" cy="352" r="82" fill="none" stroke="${stroke}" stroke-width="16"/>`;
const stitch = (stroke: string) =>
  `<path d="${STITCH}" fill="none" stroke="${stroke}" stroke-width="14" stroke-dasharray="30 24" stroke-linecap="round" stroke-linejoin="round"/>`;
// The gap keeps coin and pocket apart where they overlap, which one-color (tinted, themed) icons need.
const gap = (stroke: string) =>
  `<path d="${POCKET}" fill="none" stroke="${stroke}" stroke-width="28" stroke-linejoin="round"/>`;
const coin = (fill: string) => `<circle cx="512" cy="352" r="124" fill="${fill}"/>`;
const pocket = (fill: string) => `<path d="${POCKET}" fill="${fill}"/>`;
// Details as see-through cutouts, so the shape works on any background color.
const cut = (id: string, holes: string, body: string) =>
  `<mask id="${id}"><rect width="1024" height="1024" fill="white"/>${holes}</mask><g mask="url(#${id})">${body}</g>`;
export const scaled = (body: string, k: number) =>
  `<g transform="translate(512 512) scale(${k}) translate(-512 -512)">${body}</g>`;

export const markOn = (bg: string) => coin(LIME) + ring(bg) + gap(bg) + pocket(WHITE) + stitch(bg);
// The coin stops at the pocket edge, so it never covers the stitches.
export const coinLayer = (fill: string) => cut("c", ring("black") + gap("black") + pocket("black"), coin(fill));
export const pocketLayer = (fill: string) => cut("p", stitch("black"), pocket(fill));

// Full-bleed square icon; the app icon and the in-app logo.
export const ICON_SVG = svg(`<rect width="1024" height="1024" fill="${TEAL}"/>${markOn(TEAL)}`);
