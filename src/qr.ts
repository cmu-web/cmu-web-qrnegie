import QRCode from "qrcode";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BORDER, MIN_MODULE, frame, styledCells, type QrStyle } from "./styles";

export class GenerateError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
// Binary Heart's mark: the CMU heart, traced from the university's image
const cmuHeart = readFileSync(join(__dirname, "..", "assets", "cmu-heart.svg"), "utf8").replace(
  /^<svg[^>]*>|<\/svg>\s*$/g,
  "",
);
// Scotty (Simple)'s mark: UCM's Scotty portrait with his red scarf
const scotty = readFileSync(join(__dirname, "..", "assets", "scotty-head.svg"), "utf8").replace(
  /^<svg[^>]*>|<\/svg>\s*$/g,
  "",
);

// The clear spot nearest the center (or `down` of the way down) for a
// width-by-height mark, ending no higher than row `lowest`: away from the
// finder patterns and covering no function module, including alignment
// patterns in dense codes
function clearSpot(
  modules: QRCode.BitMatrix,
  width: number,
  height: number,
  down = 0.5,
  lowest = 0,
) {
  const n = modules.size;
  let best: { x: number; y: number; distance: number } | undefined;
  // Right of the bottom-left finder, a mark may run to the bottom edge
  for (let y = Math.max(9, lowest - height); y + height <= n; y++)
    for (let x = 9; x + width <= n - 8; x++) {
      let clear = true;
      for (let dy = 0; dy < height && clear; dy++)
        for (let dx = 0; dx < width; dx++)
          if (modules.isReserved(y + dy, x + dx)) {
            clear = false;
            break;
          }
      const distance = (x + width / 2 - n / 2) ** 2 + (y + height / 2 - n * down) ** 2;
      if (clear && (!best || distance < best.distance)) best = { x, y, distance };
    }
  return best;
}

// Wean Hall's "turtle head," straight on: the tall block of concrete form
// panels (joints staggered row to row) over the dark entrance, with Clark
// Winter's sculpture, the Love of Two Oranges or "the Cheeto," small at the
// bottom of the entrance on its blue base. Drawn in a 90 by 100 box.
//
// The sculpture: four identical orange rectangles standing on their bottom
// corners, long sides up at 45 degrees. The left pair leans in at the
// bottom, a V; the right pair leans in at the top, touching high. The middle
// two both lean right, so the third crosses in front of the second.
function cheetoBlocks() {
  const long = 8,
    short = 5,
    k = Math.SQRT1_2,
    outline = 0.3,
    // The pairs move toward each other a hair; only the middle two overlap
    hair = 0.75;
  // [bottom corner x, lean: -1 left or 1 right], in the rectangles' units
  const blocks: [number, number][] = [
    [hair, -1],
    [2 * k * short + hair, 1],
    [2 * k * short + 7 - hair, 1],
    [2 * k * short + 7 + 2 * k * long - hair, -1],
  ];
  // Size and place from the blocks before the pairs move in
  const left = -k * long,
    right = blocks[3][0] + hair + k * short,
    scale = 30 / (right - left),
    // The outline is centered on each edge; lift by half of it so the bottom
    // corners touch the base without dipping into it
    base = 95.5 - outline / 2;
  return blocks
    .map(([x, lean]) => {
      const along = [lean * k * long, -k * long],
        across = [-lean * k * short, -k * short];
      const corners = [[0, 0], along, [along[0] + across[0], along[1] + across[1]], across].map(
        ([dx, dy]) =>
          `${+(30 + (x + dx - left) * scale).toFixed(2)} ${+(base + dy * scale).toFixed(2)}`,
      );
      return `<path d="M${corners.join("L")}Z" fill="#ec7a2f" stroke="#a8501c" stroke-width="${outline}" stroke-linejoin="round"/>`;
    })
    .join("");
}
const headPanels = [15, 30, 45, 60]
  .map((y) => `<path d="M0 ${y}h90" stroke="#bea78f" stroke-width=".8"/>`)
  .concat(
    [0, 1, 2, 3, 4].flatMap((row) =>
      (row % 2 ? [18, 36, 54, 72] : [9, 27, 45, 63, 81]).map(
        (x) => `<path d="M${x} ${row * 15}v15" stroke="#bea78f" stroke-width=".8"/>`,
      ),
    ),
  )
  .join("");
const turtleHead =
  `<rect width="90" height="100" fill="#e6d9c9"/>` +
  `<rect width="90" height="75" fill="#d8c5b0"/>` +
  headPanels +
  `<path d="M0 75h90l-6 4h-78z" fill="#b9a48c"/>` +
  `<rect x="6" y="79" width="78" height="21" fill="#2b2724"/>` +
  `<rect x="28" y="95.5" width="34" height="2.2" fill="#2f7fc1"/>` +
  cheetoBlocks();

// Tilted Square: the code centered in a red square outline, the same space
// on every side, both turned 15 degrees. Laid out in module units, then
// scaled to fit the image.
async function tiltedSquare(modules: QRCode.BitMatrix, size: number) {
  const n = modules.size,
    quiet = n + 8,
    side = quiet * 1.2,
    inset = (side - quiet) / 2,
    stroke = side * 0.012,
    angle = -15,
    center = side / 2,
    radians = (angle * Math.PI) / 180;
  // The turned square's width and height, with its outline and a little room
  const extent =
      (side + stroke) * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians))) * 1.04,
    minimum = Math.ceil(extent * MIN_MODULE["tilted-square"]);
  if (!Number.isInteger(size) || size < minimum || size > 2048)
    throw new GenerateError(`Choose a size from ${minimum} to 2048 pixels for this code.`);
  const k = size / extent,
    shift = (extent - side) / 2;
  // Every dark module in one shape: turned, separate squares would show
  // stair-steps (crisp edges) or hairline seams (antialiased edges)
  let dark = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (modules.get(y, x)) dark += `M${x} ${y}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="white"/><g transform="scale(${k}) translate(${shift} ${shift}) rotate(${angle} ${center} ${center})"><rect width="${side}" height="${side}" fill="none" stroke="#c41230" stroke-width="${stroke}"/><path transform="translate(${inset + 4} ${inset + 4})" d="${dark}"/></g></svg>`;
}

export async function qrSvg(text: string, style: QrStyle = "scotty", size = 512): Promise<string> {
  if (!text.trim() || Buffer.byteLength(text) > 1024)
    throw new GenerateError("Enter text or a URL of up to 1024 UTF-8 bytes.");
  // No artwork covers Basic Black's or Tilted Square's modules: medium error
  // correction keeps their codes less dense
  const plainModules = style === "plain" || style === "tilted-square";
  const options = { errorCorrectionLevel: plainModules ? ("M" as const) : ("H" as const) };
  let code = QRCode.create(text, options);
  // Larger exports have enough room for a more detailed portrait. Keep compact
  // mosaic addresses working with the smaller matrix used by earlier exports.
  const mosaicVersion = size >= (17 + 4 * 16 + 8) * MIN_MODULE.mosaic ? 16 : 9;
  const minimumVersion = style === "mosaic" ? mosaicVersion : plainModules ? 1 : 3;
  if (code.version < minimumVersion)
    code = QRCode.create(text, { ...options, version: minimumVersion });
  const { modules } = code;
  if (style === "tilted-square") return tiltedSquare(modules, size);
  const n = modules.size,
    border = BORDER[style] ?? 0,
    total = n + 8 + border * 2,
    minimum = total * MIN_MODULE[style];
  if (!Number.isInteger(size) || size < minimum || size > 2048)
    throw new GenerateError(`Choose a size from ${minimum} to 2048 pixels for this code.`);
  // Integer pixels per module, with the remainder outside the quiet zone
  const scale = Math.floor(size / total),
    offset = Math.floor((size - total * scale) / 2) + (4 + border) * scale;
  const cells = await styledCells(modules, style);
  let mark = "";
  if (style === "scotty") {
    // The headshot, about a fifth of the code's width, on a white patch with
    // a module of space around him; smaller when a dense code leaves no room.
    // The patch has crisp edges, so modules under it don't show as hairlines
    // when the image is scaled.
    let spot: { x: number; y: number } | undefined,
      width = Math.max(5, Math.floor(n * 0.19)),
      height = 0;
    for (; width >= 4; width--) {
      height = Math.round((width * 443.51) / 330.17);
      if ((spot = clearSpot(modules, width + 2, height + 2))) break;
    }
    if (!spot)
      throw new GenerateError(
        "This content leaves no room for Scotty. Choose Basic Black or a shorter URL.",
      );
    mark = `<rect x="${spot.x}" y="${spot.y}" width="${width + 2}" height="${height + 2}" fill="white" shape-rendering="crispEdges"/><svg x="${spot.x + 1}" y="${spot.y + 1}" width="${width}" height="${height}" viewBox="0 0 330.17 443.51">${scotty}</svg>`;
  }
  if (style === "binary-heart") {
    // The CMU heart on a white patch of its own shape, about a quarter of the
    // code's width; smaller when alignment patterns in a dense code leave no
    // room
    let spot: { x: number; y: number } | undefined,
      width = Math.max(7, Math.floor(n * 0.25)),
      height = 0;
    for (; width >= 5; width--) {
      height = Math.round(width * 0.875);
      if ((spot = clearSpot(modules, width, height))) break;
    }
    if (!spot)
      throw new GenerateError(
        "This content leaves no room for the heart. Choose Basic Black or a shorter URL.",
      );
    mark = `<rect x="${spot.x}" y="${spot.y}" width="${width}" height="${height}" fill="white" shape-rendering="crispEdges"/><svg x="${spot.x}" y="${spot.y}" width="${width}" height="${height}" viewBox="0 0 200 175">${cmuHeart}</svg>`;
  }
  if (style === "wean") {
    // Wean Hall's "turtle head": the panelled concrete overhang over the dark
    // entrance, with the Love of Two Oranges, "the Cheeto," in front of it.
    // Near the bottom first: the largest width, up to 36% of the code's,
    // whose spot ends in the bottom tenth; failing that, the largest that
    // fits anywhere. Alignment patterns in the way make it smaller.
    let spot: { x: number; y: number } | undefined,
      width = 0;
    for (const lowest of [Math.ceil(n * 0.9), 0]) {
      for (let w = Math.max(9, Math.floor(n * 0.36)); w >= 6 && !spot; w--) {
        spot = clearSpot(modules, w, Math.round(w * 1.1), 0.85, lowest);
        width = w;
      }
      if (spot) break;
    }
    if (!spot)
      throw new GenerateError(
        "This content leaves no room for the sculpture. Choose Basic Black or a shorter URL.",
      );
    const height = Math.round(width * 1.1);
    mark = `<rect x="${spot.x}" y="${spot.y}" width="${width}" height="${height}" fill="#e6d9c9" shape-rendering="crispEdges"/><svg x="${spot.x}" y="${spot.y}" width="${width}" height="${height}" viewBox="0 0 90 100" preserveAspectRatio="xMidYMax meet">${turtleHead}</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="white"/>${border ? `<g transform="translate(${Math.floor((size - total * scale) / 2)} ${Math.floor((size - total * scale) / 2)}) scale(${scale})">${frame(style, total)}</g>` : ""}<g transform="translate(${offset} ${offset}) scale(${scale})" fill="black">${cells}${mark}</g></svg>`;
}

export async function qrImage(text: string, style: QrStyle, size: number, format: "svg" | "png") {
  const svg = Buffer.from(await qrSvg(text, style, size));
  return format === "svg" ? svg : sharp(svg).png().toBuffer();
}
