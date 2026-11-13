import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BitMatrix } from "qrcode";
import { DIGITS } from "./digits";

export const STYLES = [
  "plain",
  "scotty",
  "mosaic",
  "kraus-campo",
  "wean",
  "binary-heart",
  "tilted-square",
  "block-monogram",
  "icon",
] as const;
export type QrStyle = (typeof STYLES)[number];
export const STYLE_NAMES: Record<QrStyle, string> = {
  plain: "Basic Black",
  scotty: "Basic Scotty",
  mosaic: "Mosaic Scotty",
  "kraus-campo": "Kraus Campo",
  wean: "Wean Hall",
  "binary-heart": "Binary Heart",
  "tilted-square": "Tilted Square",
  "block-monogram": "Block Monogram",
  icon: "Center Icon",
};
export const MIN_MODULE: Record<QrStyle, number> = {
  plain: 3,
  scotty: 3,
  mosaic: 6,
  "kraus-campo": 6,
  wean: 5,
  "binary-heart": 6,
  "tilted-square": 3,
  "block-monogram": 3,
  icon: 3,
};
// Mosaic Scotty's portrait: UCM's Scotty in his red scarf, as in Basic Scotty
const bust = readFileSync(join(__dirname, "..", "assets", "scotty-head.svg"), "utf8").replace(
  /^<svg[^>]*>|<\/svg>\s*$/g,
  "",
);

const numerals = Object.values(DIGITS);
// Binary Heart's digits, drawn for a unit tile: a monospace 1 whose stem runs
// through the tile's center, where scanners sample a module, and a 0 whose
// hole is there. The 1s are dark modules, the 0s light ones.
const binaryOne = "M.38 .1h.24v.72h.13v.1h-.5v-.1h.13v-.5l-.12 .08v-.12z";
const binaryZero =
  "M.5 .1c.2 0 .29 .17 .29 .4s-.09 .4-.29 .4s-.29-.17-.29-.4s.09-.4.29-.4zm0 .12c-.1 0-.15 .1-.15 .28s.05 .28 .15 .28s.15-.1 .15-.28s-.05-.28-.15-.28z";

const random = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

// Sample the original mascot once per QR version, never an external image.
const samples = new Map<number, Promise<Buffer>>();
function mascot(n: number): Promise<Buffer> {
  let result = samples.get(n);
  if (!result) {
    const image = `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}"><rect width="100%" height="100%" fill="white"/><svg x="${n * 0.13}" y="${n * 0.13}" width="${n * 0.74}" height="${n * 0.74}" viewBox="0 0 330.17 443.51">${bust}</svg></svg>`;
    result = sharp(Buffer.from(image))
      .flatten({ background: "white" })
      .removeAlpha()
      .raw()
      .toBuffer();
    samples.set(n, result);
  }
  return result;
}

export async function styledCells(modules: BitMatrix, style: QrStyle): Promise<string> {
  const n = modules.size,
    pixels = style === "mosaic" ? await mascot(n) : null;
  let out = "";
  // Kraus Campo: a grid of white tiles with thin joints
  if (style === "kraus-campo")
    for (let i = 0; i <= n; i++)
      out += `<path d="M${i} 0V${n}M0 ${i}H${n}" stroke="#ececec" stroke-width=".04"/>`;
  // Wean Hall: the code is a tan concrete facade with a floor band along
  // the top of every row; windows are drawn into it below
  if (style === "wean") {
    out += `<rect width="${n}" height="${n}" fill="#e6d9c9"/>`;
    for (let y = 0; y < n; y++) out += `<rect y="${y}" width="${n}" height=".1" fill="#ccb9a3"/>`;
    // A pier every four bays, as the facade's columns
    for (let x = 4; x < n; x += 4)
      out += `<rect x="${x - 0.07}" width=".14" height="${n}" fill="#d6c6b2"/>`;
  }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dark = !!modules.get(y, x),
        reserved = !!modules.isReserved(y, x),
        seed = random(x, y);
      if (reserved) {
        if (dark) out += `<path d="M${x} ${y}h1v1h-1z" shape-rendering="crispEdges"/>`;
        continue;
      }
      if (style === "kraus-campo") {
        // A numeral on every tile, turned any of four ways: black where the
        // module is dark, pale gray where it's light. A turn keeps the tile's
        // center inked, where scanners sample.
        out += `<path transform="${tile(x, y, scatter(x + 7919, y + 104729))}" d="${numerals[seed % numerals.length]}"${dark ? "" : ` fill="${paleNumeral}"`}/>`;
      } else if (style === "mosaic") {
        const i = (y * n + x) * 3,
          r = pixels![i],
          g = pixels![i + 1],
          b = pixels![i + 2];
        const ink = (r + g + b) / 3 < 160,
          red = r > g * 1.4 && r > b * 1.3 && r < 245;
        // Artwork fills the space around each bit. A contrasting central dot
        // carries the encoded bit: white holes inside Scotty, dark dots outside.
        // This makes the portrait continuous instead of a weak change in dot size.
        if (ink) {
          out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${red ? "#b20f2c" : "#221f1f"}"/>`;
          if (!dark) out += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r=".38" fill="white"/>`;
        } else if (dark) out += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r=".38" fill="#303030"/>`;
      } else if (style === "binary-heart") {
        // A black 1 on each dark module, a pale gray 0 on each light one
        out += dark
          ? `<path transform="translate(${x} ${y})" d="${binaryOne}" fill="#151515"/>`
          : `<path transform="translate(${x} ${y})" d="${binaryZero}" fill="#e6e6e6" fill-rule="evenodd"/>`;
      } else if (style === "wean") {
        // A dark window punched into the concrete, as on Wean Hall's facade
        if (dark)
          out += `<rect x="${x + 0.1}" y="${y + 0.16}" width=".8" height=".78" fill="#1c1d20"/>`;
      } else if (dark) out += `<path d="M${x} ${y}h1v1h-1z" shape-rendering="crispEdges"/>`;
    }
  return out;
}

// Kraus Campo's tiles go on past the code into the white margin, with pale
// gray numerals, since scanners look for a clear light border there. Around
// the margin, a band of the garden's orange path. In module units over the
// whole image; the code is drawn over its middle.
export const BORDER: Partial<Record<QrStyle, number>> = { "kraus-campo": 6 };
const paleNumeral = "#f3f3f3";
// A well-mixed hash for the margin's tiles, where a simple one shows stripes
function scatter(x: number, y: number) {
  let h = Math.imul(x, 0x9e3779b1) ^ Math.imul(y + 0x6b43a9b5, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}
// A tile's place, with its numeral turned one of four ways about its center
function tile(x: number, y: number, seed: number) {
  const turn = (seed % 4) * 90;
  return turn ? `translate(${x} ${y}) rotate(${turn} .5 .5)` : `translate(${x} ${y})`;
}
export function frame(style: QrStyle, total: number): string {
  if (style !== "kraus-campo") return "";
  const band = BORDER[style] ?? 0,
    code = [band + 4, total - band - 4];
  const inner = total - band * 2;
  let out = `<rect width="${total}" height="${total}" fill="#ed6c22"/><rect x="${band}" y="${band}" width="${inner}" height="${inner}" fill="white"/>`;
  for (let i = band; i <= total - band; i++)
    out += `<path d="M${i} ${band}V${total - band}M${band} ${i}H${total - band}" stroke="#ececec" stroke-width=".04"/>`;
  for (let y = band; y < total - band; y++)
    for (let x = band; x < total - band; x++) {
      if (x >= code[0] && x < code[1] && y >= code[0] && y < code[1]) continue;
      const seed = scatter(x, y);
      out += `<path transform="${tile(x, y, seed >>> 16)}" d="${numerals[(seed >>> 8) % numerals.length]}" fill="${paleNumeral}"/>`;
    }
  return out;
}
