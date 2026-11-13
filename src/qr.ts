import QRCode from "qrcode";
import { ERROR_CORRECTION } from "./style-info";
import sharp from "sharp";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BORDER, MIN_MODULE, frame, styledCells, type QrStyle } from "./styles";
import { GLYPHS } from "./glyphs";

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
// Optional lines of text above and below the code, drawn in each style's
// look: its own dark color, in Kraus Campo's orange band, turned with Tilted
// Square
export interface Labels {
  above?: string;
  below?: string;
  // Center Icon's icon: a Bootstrap Icons name
  icon?: string;
}
export const LABEL_LIMIT = 40;
export function checkLabels(labels: Labels) {
  for (const label of [labels.above, labels.below])
    if (
      label !== undefined &&
      ([...label].length > LABEL_LIMIT || [...label].some((c) => !(c in GLYPHS)))
    )
      throw new GenerateError(
        `Keep text above or below the code to ${LABEL_LIMIT} characters: letters, numbers, spaces and common punctuation.`,
      );
}
const INK: Record<QrStyle, string> = {
  plain: "black",
  scotty: "black",
  mosaic: "#221f1f",
  "kraus-campo": "white",
  wean: "#2b2724",
  "binary-heart": "#c41230",
  "tilted-square": "#c41230",
  "block-monogram": "#941120",
  icon: "black",
};
// Open Sans's capital height, in ems
const CAP = 0.714;
const round = (v: number) => +v.toFixed(2);
// A line's width in ems, and the line drawn in a given em size, centered on
// x with its baseline on y
const ems = (label: string) => [...label].reduce((width, c) => width + GLYPHS[c][0], 0);
function lettering(label: string, em: number, x: number, y: number) {
  let at = 0,
    paths = "";
  for (const c of label) {
    const [advance, d] = GLYPHS[c];
    if (d) paths += `<path transform="translate(${+at.toFixed(4)} 0)" d="${d}"/>`;
    at += advance;
  }
  return `<g transform="translate(${round(x - (at * em) / 2)} ${round(y)}) scale(${+em.toFixed(4)})">${paths}</g>`;
}
// One size for both lines: the widest fits across most of the width
const emFor = (labels: Labels, width: number, most: number) =>
  Math.min(
    most,
    (width * 0.88) / Math.max(...[labels.above, labels.below].map((l) => (l ? ems(l) : 0))),
  );
// The image grows taller, with a band for each line outside the code's own
// margin
function withLabels(svg: string, size: number, style: QrStyle, labels: Labels) {
  if (!labels.above && !labels.below) return svg;
  const em = emFor(labels, size, size * 0.065),
    margin = Math.round(size * 0.03),
    // Block Monogram's red runs almost to the image's edge, with no white
    // margin of its own, so its lines sit a little farther out
    band = Math.round(em * (style === "block-monogram" ? 1.8 : 1.3)),
    top = labels.above ? margin + band : 0,
    height = size + top + (labels.below ? band + margin : 0),
    body = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  let text = "";
  if (labels.above) text += lettering(labels.above, em, size / 2, margin + (band + CAP * em) / 2);
  if (labels.below)
    text += lettering(labels.below, em, size / 2, top + size + (band + CAP * em) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}"><rect width="100%" height="100%" fill="white"/><g transform="translate(0 ${top})">${body}</g><g fill="${INK[style]}">${text}</g></svg>`;
}

// Center Icon's icons: Bootstrap Icons (MIT License), read once each
const iconFolder = join(require.resolve("bootstrap-icons/package.json"), "..", "icons"),
  icons = new Map<string, string>();
export const DEFAULT_ICON = "link-45deg";
export function iconNames() {
  return readdirSync(iconFolder)
    .filter((file) => file.endsWith(".svg"))
    .map((file) => file.slice(0, -4))
    .sort();
}
function icon(name: string) {
  let drawing = icons.get(name);
  if (drawing === undefined) {
    const file = join(iconFolder, `${name}.svg`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || !existsSync(file))
      throw new GenerateError(
        "Choose an icon by its Bootstrap Icons name, like wifi or calendar-event.",
      );
    drawing = readFileSync(file, "utf8").replace(/^<svg[^>]*>|<\/svg>\s*$/g, "");
    icons.set(name, drawing);
  }
  return drawing;
}

// Binary Heart's mark: the CMU heart, traced from the university's image
const cmuHeart = readFileSync(join(__dirname, "..", "assets", "cmu-heart.svg"), "utf8").replace(
  /^<svg[^>]*>|<\/svg>\s*$/g,
  "",
);
// Basic Scotty's mark: UCM's Scotty portrait with his red scarf
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
async function tiltedSquare(modules: QRCode.BitMatrix, size: number, labels: Labels = {}) {
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
    labelled = !!(labels.above || labels.below),
    // Lines of text sit just above and below the square, turned with it
    em = labelled ? emFor(labels, side, side * 0.065) : 0,
    band = em * 1.3,
    above = labels.above ? band + stroke : 0,
    below = labels.below ? band + stroke : 0,
    // The turned box of square and text: its size and its center
    corners = [
      [0, -above],
      [side, -above],
      [side, side + below],
      [0, side + below],
    ].map(([x, y]) => [
      center + (x - center) * Math.cos(radians) - (y - center) * Math.sin(radians),
      center + (x - center) * Math.sin(radians) + (y - center) * Math.cos(radians),
    ]),
    xs = corners.map((c) => c[0]),
    ys = corners.map((c) => c[1]),
    wide = labelled ? (Math.max(...xs) - Math.min(...xs) + stroke * 1.3) * 1.04 : extent,
    tall = labelled ? (Math.max(...ys) - Math.min(...ys) + stroke * 1.3) * 1.04 : extent,
    minimum = Math.ceil(wide * MIN_MODULE["tilted-square"]);
  if (!Number.isInteger(size) || size < minimum || size > 2048)
    throw new GenerateError(`Choose a width from ${minimum} to 2048 pixels for this code.`);
  const k = size / wide,
    height = labelled ? Math.round(tall * k) : size,
    shiftX = labelled ? wide / 2 - (Math.max(...xs) + Math.min(...xs)) / 2 : (extent - side) / 2,
    shiftY = labelled ? tall / 2 - (Math.max(...ys) + Math.min(...ys)) / 2 : (extent - side) / 2;
  let text = "";
  if (labels.above) text += lettering(labels.above, em, center, -stroke - (band - CAP * em) / 2);
  if (labels.below)
    text += lettering(labels.below, em, center, side + stroke + (band + CAP * em) / 2);
  // Every dark module in one shape: turned, separate squares would show
  // stair-steps (crisp edges) or hairline seams (antialiased edges)
  let dark = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (modules.get(y, x)) dark += `M${x} ${y}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}"><rect width="100%" height="100%" fill="white"/><g transform="scale(${k}) translate(${shiftX} ${shiftY}) rotate(${angle} ${center} ${center})"><rect width="${side}" height="${side}" fill="none" stroke="#c41230" stroke-width="${stroke}"/><path transform="translate(${inset + 4} ${inset + 4})" d="${dark}"/>${text ? `<g fill="#c41230">${text}</g>` : ""}</g></svg>`;
}

// Block Monogram: the Carnegie-Mellon block monogram in Skibo Red (darker
// than CMU red, like the vintage shirts; the only inverted code), with the code
// in place of the M. A C block with its slot sits above the code and a thick
// U wraps both, in the monogram's proportions. The M's block is square here,
// to fit the code, and holds the code's white margin, which also keeps the
// red C and U apart from it. Modules land on whole pixels.
function blockMonogram(modules: QRCode.BitMatrix, size: number) {
  const n = modules.size,
    quiet = n + 8,
    red = "#941120",
    // The U's thickness, the white gap between shapes and the C's height
    thick = quiet * 0.27,
    gap = quiet * 0.035,
    cHeight = quiet * 0.56,
    width = quiet + 2 * (gap + thick),
    // The C and the M sit closer to each other than to the U
    codeTop = cHeight + gap / 2,
    // The M's block runs below the code, for the M's two legs
    legRoom = Math.round(quiet * 0.25),
    blockHeight = quiet + legRoom,
    height = codeTop + blockHeight + gap + thick,
    // The U's arms reach a bit past halfway up the C
    uTop = cHeight * 0.4,
    side = gap + thick,
    span = Math.max(width, height) * 1.04,
    minimum = Math.ceil(span * MIN_MODULE["block-monogram"]);
  if (!Number.isInteger(size) || size < minimum || size > 2048)
    throw new GenerateError(`Choose a width from ${minimum} to 2048 pixels for this code.`);
  // Whole pixels per module, the monogram centered in the image
  const k = Math.floor(size / span),
    left = Math.round((size - width * k) / 2),
    top = Math.round((size - height * k) / 2),
    px = (v: number) => +(v * k).toFixed(2);
  const slot = quiet * 0.035;
  // Inverted, like the monogram's solid M: the code's block, margin included,
  // is red, and its dark modules are white
  let light = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (modules.get(y, x)) light += `M${x} ${y}h1v1h-1z`;
  // The U: one whole-pixel thickness for both arms and the bottom, its arm
  // tops and outside corners rounded, its inside corners square
  const T = Math.round(thick * k),
    W = Math.round(width * k),
    H = Math.round(height * k),
    U0 = Math.round(uTop * k),
    r = +(T * 0.12).toFixed(2),
    u = `M0 ${U0 + r}a${r} ${r} 0 0 1 ${r}-${r}H${T - r}a${r} ${r} 0 0 1 ${r} ${r}V${H - T}H${W - T}V${U0 + r}a${r} ${r} 0 0 1 ${r}-${r}H${W - r}a${r} ${r} 0 0 1 ${r} ${r}V${H - r}a${r} ${r} 0 0 1-${r} ${r}H${r}a${r} ${r} 0 0 1-${r}-${r}Z`;
  // The C: a block with its slot cut in from the right, the slot's inner end
  // rounded
  const half = +((slot * k) / 2).toFixed(2),
    c = `M${px(side)} 0H${px(side + quiet)}V${px(cHeight * 0.45 - slot / 2)}H${px(side + quiet * 0.26)}a${half} ${half} 0 0 0 0 ${2 * half}H${px(side + quiet)}V${px(cHeight)}H${px(side)}Z`;
  const blockX = left + Math.round(side * k),
    blockBottom = top + Math.round((codeTop + blockHeight) * k),
    // The M's two legs: slots up from the block's bottom, at the monogram's
    // places across it, stopping 3 modules short of the code
    legTop = top + Math.round((codeTop + quiet - 1) * k),
    legs = [0.26, 0.7]
      .map(
        (at) =>
          `<path fill="white" d="M${(left + (side + quiet * at - slot / 2) * k).toFixed(2)} ${blockBottom}V${(legTop + (slot * k) / 2).toFixed(2)}a${((slot * k) / 2).toFixed(2)} ${((slot * k) / 2).toFixed(2)} 0 0 1 ${(slot * k).toFixed(2)} 0V${blockBottom}Z"/>`,
      )
      .join(""),
    blockY = top + Math.round(codeTop * k),
    codeX = left + Math.round((side + 4) * k),
    codeY = top + Math.round((codeTop + 4) * k);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="white"/><g transform="translate(${left} ${top})" fill="${red}"><path d="${u}"/><path d="${c}"/></g><rect x="${blockX}" y="${blockY}" width="${quiet * k}" height="${blockHeight * k}" fill="${red}" shape-rendering="crispEdges"/>${legs}<path transform="translate(${codeX} ${codeY}) scale(${k})" fill="white" shape-rendering="crispEdges" d="${light}"/></svg>`;
}

export async function qrSvg(
  text: string,
  style: QrStyle = "scotty",
  size = 512,
  labels: Labels = {},
): Promise<string> {
  if (!text.trim() || Buffer.byteLength(text) > 1024)
    throw new GenerateError("Enter text or a URL of up to 1024 UTF-8 bytes.");
  checkLabels(labels);
  // Blank lines are left out
  labels = {
    ...(labels.above?.trim() && { above: labels.above.trim() }),
    ...(labels.below?.trim() && { below: labels.below.trim() }),
    ...(labels.icon?.trim() && { icon: labels.icon.trim() }),
  };
  // No artwork covers Basic Black's, Tilted Square's or Block Monogram's
  // modules: medium error correction keeps their codes less dense
  const plainModules = ERROR_CORRECTION[style] === "M";
  const options = { errorCorrectionLevel: ERROR_CORRECTION[style] };
  let code = QRCode.create(text, options);
  // Larger exports have enough room for a more detailed portrait. Keep compact
  // mosaic addresses working with the smaller matrix used by earlier exports.
  const mosaicVersion = size >= (17 + 4 * 16 + 8) * MIN_MODULE.mosaic ? 16 : 9;
  const minimumVersion = style === "mosaic" ? mosaicVersion : plainModules ? 1 : 3;
  if (code.version < minimumVersion)
    code = QRCode.create(text, { ...options, version: minimumVersion });
  const { modules } = code;
  if (style === "tilted-square") return tiltedSquare(modules, size, labels);
  if (style === "block-monogram")
    return withLabels(blockMonogram(modules, size), size, style, labels);
  const n = modules.size,
    border = BORDER[style] ?? 0,
    total = n + 8 + border * 2,
    minimum = total * MIN_MODULE[style];
  if (!Number.isInteger(size) || size < minimum || size > 2048)
    throw new GenerateError(`Choose a width from ${minimum} to 2048 pixels for this code.`);
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
  if (style === "icon") {
    // The icon in CMU red, about a fifth of the code's width, in a white
    // opening with a margin of about a fifth of the icon all around, so dense
    // codes' small modules stay clear of it; smaller when a dense code leaves
    // no room
    const drawing = icon(labels.icon || DEFAULT_ICON);
    let spot: { x: number; y: number } | undefined,
      width = Math.max(5, Math.floor(n * 0.2)),
      pad = 1;
    for (; width >= 4; width--) {
      pad = Math.max(1, Math.round(width * 0.2));
      if ((spot = clearSpot(modules, width + 2 * pad, width + 2 * pad))) break;
    }
    if (!spot)
      throw new GenerateError(
        "This content leaves no room for the icon. Choose Basic Black or a shorter URL.",
      );
    mark = `<rect x="${spot.x}" y="${spot.y}" width="${width + 2 * pad}" height="${width + 2 * pad}" fill="white" shape-rendering="crispEdges"/><svg x="${spot.x + pad}" y="${spot.y + pad}" width="${width}" height="${width}" viewBox="0 0 16 16" fill="#c41230">${drawing}</svg>`;
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
  // Kraus Campo's lines sit in its orange band, in white, and the image
  // keeps its size
  let bandText = "";
  if (border && (labels.above || labels.below)) {
    const edge = Math.floor((size - total * scale) / 2),
      band = border * scale,
      em = emFor(labels, total * scale - 2 * band, (band * 0.5) / CAP);
    if (labels.above)
      bandText += lettering(labels.above, em, size / 2, edge + (band + CAP * em) / 2);
    if (labels.below)
      bandText += lettering(
        labels.below,
        em,
        size / 2,
        edge + total * scale - band + (band + CAP * em) / 2,
      );
    bandText = `<g fill="${INK[style]}">${bandText}</g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="white"/>${border ? `<g transform="translate(${Math.floor((size - total * scale) / 2)} ${Math.floor((size - total * scale) / 2)}) scale(${scale})">${frame(style, total)}</g>` : ""}<g transform="translate(${offset} ${offset}) scale(${scale})" fill="black">${cells}${mark}</g>${bandText}</svg>`;
  return border ? svg : withLabels(svg, size, style, labels);
}

export async function qrImage(
  text: string,
  style: QrStyle,
  size: number,
  format: "svg" | "png",
  labels: Labels = {},
) {
  const svg = Buffer.from(await qrSvg(text, style, size, labels));
  return format === "svg" ? svg : sharp(svg).png().toBuffer();
}
