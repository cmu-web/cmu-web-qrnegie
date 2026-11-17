// The mjs collection's screen style, Terminal, and the helpers the framed
// styles share. Terminal keeps the code dark on light, so it scans on
// readers that can't read an inverted code: it lights the code's light
// modules on a black screen. Laid out in module units with whole pixels per
// module, then centered in a square image.
import type { BitMatrix } from "qrcode";
import { round } from "./lettering";
import { MIN_MODULE, type QrStyle } from "./style-info";
import { PIXEL_FONT, PIXEL_HEIGHT, PIXEL_WIDTH } from "./pixelfont";

export interface Lines {
  above?: string;
  below?: string;
}

// Thrown when the image is too small or large; qr.ts reports it as a 400
export class SizeError extends Error {}

// Whole pixels per module for a layout `side` modules across, checked
// against the style's smallest module
export function fit(style: QrStyle, side: number, size: number) {
  const minimum = Math.ceil(side * MIN_MODULE[style]);
  if (!Number.isInteger(size) || size < minimum || size > 2048)
    throw new SizeError(`Choose a width from ${minimum} to 2048 pixels for this code.`);
  return Math.floor(size / side);
}

// A glow around a lit block: rounded rectangles, each a little larger and
// fainter, under it. A blur filter looks the same but takes seconds to
// render at 2048 pixels.
export function glowBox(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  reach: number,
) {
  let out = "";
  for (let i = 8; i >= 1; i--) {
    const grow = (reach * i) / 8;
    out += `<rect x="${round(x - grow)}" y="${round(y - grow)}" width="${round(width + 2 * grow)}" height="${round(height + 2 * grow)}" rx="${round(grow)}" fill="${color}" opacity=".09"/>`;
  }
  return out;
}

// Terminal: a video terminal from about 1980, in the shape of a VT100. A
// beige case with a deep hood around the screen, which sits back in a dark
// bezel; a sloped chin under it; and the keyboard in front, seen from above
// at an angle. The screen fits the code: black glass, curved at the edges,
// with the code lit in green phosphor. The code's light modules and margin
// glow and its dark modules stay unlit, which keeps its polarity, so readers
// that can't read an inverted code still can. Text above and below prints in
// a pixel font as lines of output.
const PHOSPHOR = "#46ff86",
  PHOSPHOR_CORE = "#c9ffd9",
  GLASS = "#040a06",
  CASE = "#ddd5bf",
  CASE_LIGHT = "#ebe5d4",
  CASE_SHADE = "#c3b99f",
  CASE_DEEP = "#a69b80",
  BEZEL = "#2a2621",
  KEY = "#e6dfcc",
  KEY_DARK = "#6b5f4c",
  KEY_SIDE = "#b7ac91";
// A line of pixel lettering, `pixel` modules per font pixel, from (x, top)
function printLine(text: string, x: number, top: number, pixel: number) {
  let d = "";
  [...text].forEach((c, i) => {
    const rows = PIXEL_FONT[c] ?? PIXEL_FONT["?"];
    rows.forEach((row, y) => {
      // Runs of lit pixels, one rectangle each
      for (let px = 0; px < PIXEL_WIDTH;) {
        const lit = (at: number) => at < PIXEL_WIDTH && row & (1 << (PIXEL_WIDTH - 1 - at));
        if (!lit(px)) {
          px++;
          continue;
        }
        let run = 1;
        while (lit(px + run)) run++;
        d += `M${round(x + (i * PIXEL_WIDTH + px) * pixel)} ${round(top + y * pixel)}h${round(run * pixel)}v${round(pixel)}h-${round(run * pixel)}z`;
        px += run;
      }
    });
  });
  return d;
}
export function terminal(modules: BitMatrix, size: number, lines: Lines) {
  const n = modules.size,
    q = n + 8,
    pad = 1.5,
    line = 2,
    aboveRows = lines.above ? line + 1 : 0,
    belowRows = lines.below ? line + 1 : 0,
    screenWidth = q + 2 * pad,
    screenHeight = q + 2 * pad + aboveRows + belowRows,
    bezel = 1.2,
    // The hood: how far the case's opening sits out from the bezel
    hood = 2.4,
    side = 1.6,
    top = 2,
    chin = 4,
    caseWidth = screenWidth + 2 * (bezel + hood + side),
    caseHeight = top + hood + bezel + screenHeight + bezel + hood + chin,
    keyboard = 6.5,
    keyGap = 0.8,
    width = caseWidth,
    height = caseHeight + keyGap + keyboard,
    span = Math.max(width, height) + 1,
    k = fit("terminal", span, size),
    left = Math.round((size - width * k) / 2),
    topPx = Math.round((size - height * k) / 2),
    // The opening in the case's front, the bezel inside it and the screen
    ox = side,
    oy = top,
    ow = screenWidth + 2 * (bezel + hood),
    oh = screenHeight + 2 * (bezel + hood),
    bx = ox + hood,
    by = oy + hood,
    sx = bx + bezel,
    sy = by + bezel,
    codeX = sx + pad,
    codeY = sy + pad + aboveRows;
  const longest = Math.max(0, ...[lines.above, lines.below].map((l) => (l ? [...l].length : 0)));
  // The font's size: its 8-pixel cells about a module wide, smaller when a
  // long line has to fit
  const pixel = Math.min(
    line / PIXEL_HEIGHT,
    (screenWidth - 2 * pad) / (longest * PIXEL_WIDTH || 1),
  );
  let print = "";
  if (lines.above) print += printLine(lines.above, codeX, sy + pad, pixel);
  if (lines.below) print += printLine(lines.below, codeX, codeY + q + 1, pixel);
  // The code: lit cells on its light modules and margin
  let lit = "";
  for (let y = 0; y < q; y++)
    for (let x = 0; x < q; x++) {
      const mx = x - 4,
        my = y - 4,
        dark = mx >= 0 && my >= 0 && mx < n && my < n && !!modules.get(my, mx);
      if (!dark) lit += `M${codeX + x} ${codeY + y}h1v1h-1z`;
    }
  const code =
    // The glow, then the glass over the code's block again, so it reaches
    // out past the code but not into its dark modules
    glowBox(codeX, codeY, q, q, PHOSPHOR, 0.7) +
    `<rect x="${codeX}" y="${codeY}" width="${q}" height="${q}" fill="${GLASS}"/>` +
    `<path d="${lit}" fill="${PHOSPHOR}" shape-rendering="crispEdges"/>`;
  // Faint scanlines across the screen, four to a module
  let scan = "";
  for (let y = sy; y < sy + screenHeight; y += 0.25)
    scan += `M${sx} ${round(y + 0.2)}h${screenWidth}v.05h-${screenWidth}z`;
  const text = print
    ? `<path d="${print}" fill="none" stroke="${PHOSPHOR}" stroke-width="${round(pixel * 2.4)}" stroke-linejoin="round" opacity=".18"/><path d="${print}" fill="${PHOSPHOR}" stroke="${PHOSPHOR}" stroke-width="${round(pixel * 0.9)}" stroke-linejoin="round" opacity=".55"/><path d="${print}" fill="${PHOSPHOR_CORE}"/>`
    : "";
  // The case: its front, a lighter band along the top, the hood's inner
  // walls (the top in shadow, the bottom catching light), the bezel, and
  // the chin with a blank plate and vents
  const r = 1.2,
    caseFront =
      `<rect width="${width}" height="${caseHeight}" rx="${r}" fill="${CASE}"/>` +
      `<rect width="${width}" height="${top * 0.55}" rx="${r}" fill="${CASE_LIGHT}"/>` +
      `<rect y="${round(caseHeight - 0.7)}" width="${width}" height=".7" rx=".35" fill="${CASE_SHADE}"/>`,
    walls =
      `<rect x="${ox}" y="${oy}" width="${round(ow)}" height="${round(oh)}" rx="${r}" fill="${CASE_SHADE}"/>` +
      `<path d="M${ox} ${oy + r}q0-${r} ${r}-${r}h${round(ow - 2 * r)}q${r} 0 ${r} ${r}L${round(bx + screenWidth + 2 * bezel)} ${by}H${bx}z" fill="${CASE_DEEP}"/>` +
      `<path d="M${ox} ${round(oy + oh - r)}q0 ${r} ${r} ${r}h${round(ow - 2 * r)}q${r} 0 ${r}-${r}L${round(bx + screenWidth + 2 * bezel)} ${round(by + screenHeight + 2 * bezel)}H${bx}z" fill="${CASE_LIGHT}"/>`,
    bezelBox = `<rect x="${bx}" y="${by}" width="${round(screenWidth + 2 * bezel)}" height="${round(screenHeight + 2 * bezel)}" rx="1" fill="${BEZEL}"/>`,
    chinY = oy + oh,
    plate = `<rect x="${round(ox + 0.6)}" y="${round(chinY + 1.2)}" width="${round(ow * 0.22)}" height="1.4" rx=".2" fill="${CASE_SHADE}"/>`,
    vents = Array.from(
      { length: 7 },
      (_, i) =>
        `<rect x="${round(ox + ow - 0.9 - i * 0.65)}" y="${round(chinY + 1.1)}" width=".28" height="1.6" rx=".14" fill="${CASE_SHADE}"/>`,
    ).join("");
  // The keyboard, seen from above at an angle: a slab narrower at the back,
  // with rows of light keys and a few dark ones at the ends
  const ky = caseHeight + keyGap,
    inset = 1.4,
    rows = 4;
  let keys = `<path d="M${inset} ${ky}H${round(width - inset)}L${width} ${round(ky + keyboard)}H0z" fill="${CASE}"/><path d="M0 ${round(ky + keyboard)}H${width}v-.5H0z" fill="${CASE_SHADE}"/>`;
  for (let i = 0; i < rows; i++) {
    const t0 = (i + 0.6) / (rows + 0.6),
      y = ky + t0 * (keyboard - 0.9),
      h = (keyboard - 0.9) / (rows + 0.6) - 0.22,
      margin = inset * (1 - t0) + 0.9,
      span2 = width - 2 * margin,
      count = 14,
      pitch = span2 / count;
    for (let j = 0; j < count; j++) {
      const end = j === 0 || j === count - 1;
      keys += `<rect x="${round(margin + j * pitch + 0.08)}" y="${round(y)}" width="${round(pitch - 0.16)}" height="${round(h)}" rx=".12" fill="${end ? KEY_DARK : KEY}" stroke="${KEY_SIDE}" stroke-width=".06"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="white"/><defs><radialGradient id="qrnegie-curve" cx=".5" cy=".5" r=".72"><stop offset=".8" stop-color="black" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity=".7"/></radialGradient><radialGradient id="qrnegie-glass" cx=".3" cy=".2" r=".5"><stop offset="0" stop-color="white" stop-opacity=".07"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><clipPath id="qrnegie-screen"><rect x="${sx}" y="${sy}" width="${screenWidth}" height="${screenHeight}" rx="1.4"/></clipPath></defs><g transform="translate(${left} ${topPx}) scale(${k})">${caseFront}${walls}${bezelBox}<rect x="${sx}" y="${sy}" width="${screenWidth}" height="${screenHeight}" rx="1.4" fill="${GLASS}"/><g clip-path="url(#qrnegie-screen)">${code}${text}<path d="${scan}" fill="black" opacity=".05"/></g><rect x="${sx}" y="${sy}" width="${screenWidth}" height="${screenHeight}" rx="1.4" fill="url(#qrnegie-curve)"/><rect x="${sx}" y="${sy}" width="${screenWidth}" height="${screenHeight}" rx="1.4" fill="url(#qrnegie-glass)"/>${plate}${vents}${keys}</g></svg>`;
}
