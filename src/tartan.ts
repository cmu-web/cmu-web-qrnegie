// The Tartan collection: a center logo and an independent mosaic renderer
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BitMatrix } from "qrcode";

// The Tartan's center emblem, extracted from the university's seal artwork
const source = readFileSync(join(__dirname, "..", "assets", "tartan-logo.svg"), "utf8").trim();
const box = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(source);
if (!box) throw new Error("assets/tartan-logo.svg needs a viewBox");
// The drawing's box, and its contents for drawing inside a code
export const TARTAN_WIDTH = Number(box[1]),
  TARTAN_HEIGHT = Number(box[2]);
export const tartan = source.replace(/^(<\?xml[^>]*>\s*)?<svg[^>]*>|<\/svg>\s*$/g, "");
const INK = "#231f20";

// Which modules the tartan covers, once per code size: the drawing fills 86%
// of the code, centered
const masks = new Map<number, Promise<{ size: number; inside: Uint8Array }>>();
function mask(n: number) {
  let result = masks.get(n);
  if (!result) {
    const size = Math.round(n * 0.86);
    result = sharp(Buffer.from(source))
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer()
      .then((rgba) => {
        // Inside where the drawing is opaque and not near-white, so a file
        // with a white background still works
        const inside = new Uint8Array(size * size);
        for (let i = 0; i < inside.length; i++) {
          const [r, g, b, a] = rgba.subarray(i * 4, i * 4 + 4);
          inside[i] = a > 127 && (r + g + b) / 3 < 200 ? 1 : 0;
        }
        return { size, inside };
      });
    masks.set(n, result);
  }
  return result;
}

// Mosaic Tartan: inside the emblem, every module is a dark square; a light
// module gets a white center, where scanners sample. Outside, dark modules
// are small dark squares on white. Finder, timing and alignment patterns stay
// solid black
export async function mosaicTartanCells(modules: BitMatrix): Promise<string> {
  const n = modules.size,
    { size, inside } = await mask(n),
    offset = Math.floor((n - size) / 2);
  const inTartan = (x: number, y: number) => {
    const mx = x - offset,
      my = y - offset;
    return mx >= 0 && my >= 0 && mx < size && my < size && inside[my * size + mx] === 1;
  };
  let out = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dark = !!modules.get(y, x);
      if (modules.isReserved(y, x)) {
        if (dark) out += `<path d="M${x} ${y}h1v1h-1z" shape-rendering="crispEdges"/>`;
      } else if (inTartan(x, y)) {
        out += `<rect x="${x + 0.06}" y="${y + 0.06}" width=".88" height=".88" fill="${INK}"/>`;
        if (!dark)
          out += `<rect x="${x + 0.3}" y="${y + 0.3}" width=".4" height=".4" fill="white"/>`;
      } else if (dark)
        out += `<rect x="${x + 0.18}" y="${y + 0.18}" width=".64" height=".64" fill="#221f1f"/>`;
    }
  return out;
}
