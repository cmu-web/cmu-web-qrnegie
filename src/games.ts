// Go Board (the scc collection). Like the merichar boards, it keeps the code
// dark on light, lays out in module units with whole pixels per module and
// letters its own lines inside its design, so the image stays square.
import type { BitMatrix } from "qrcode";
import { CAP, emFor, lettering, round } from "./lettering";
import { darkAt, svgOpen, unit } from "./boards";
import { fit, type Lines } from "./screens";

// Go Board: a pale wooden board with a darker rim, its grid lines running
// through every module's center, as stones sit on the crossings. The code's
// dark modules are black stones with a soft highlight; a few of its light
// modules hold white stones. Under the finder, timing and alignment
// patterns, the stones join into solid square groups, so scanners find those
// shapes whole. Text above and below is burned into the rim in dark brown.
const WOOD = "#e9c88f",
  RIM = "#c99a5b",
  GRAIN = "#dfba7c",
  // The lines only a little darker than the wood, since they cross every
  // light module's center, where scanners sample; any darker and jsQR loses
  // the code at 1024 pixels and up
  LINE = "#cfa86e",
  STONE = "#141414",
  SHINE = "#4a4a4a",
  WHITE_STONE = "#fbf8f1",
  WHITE_EDGE = "#d8c7a4",
  BURN = "#4a2f14",
  // The black stone's radius, in modules: nearly touching, as on a board
  RADIUS = 0.47;
export function goBoard(
  modules: BitMatrix,
  size: number,
  lines: Lines,
  // About one light module in eleven inside the code holds a white stone
  whiteRate = 0.09,
) {
  // The board: the code's block, its margin included, inside a band of grid
  // and a rim with a row for each line of text. Square, centered on white.
  const n = modules.size,
    q = n + 8,
    band = 1,
    rim = 1.5,
    row = 4,
    above = lines.above ? row : 0,
    below = lines.below ? row : 0,
    grid = q + 2 * band,
    width = grid + 2 * rim,
    height = grid + 2 * rim + above + below,
    side = Math.max(width, height),
    k = fit("go-board", side, size),
    left = Math.round((size - width * k) / 2),
    top = Math.round((size - height * k) / 2),
    gx = rim,
    gy = rim + above,
    ox = gx + band + 4,
    oy = gy + band + 4,
    dark = darkAt(modules),
    reserved = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < n && y < n && !!modules.isReserved(y, x),
    // The finder and alignment patterns, whose stones join into groups; the
    // timing, format and version modules around them stay single stones
    joined = (x: number, y: number) => {
      if (!reserved(x, y)) return false;
      if ((x < 7 || x >= n - 7) && y < 7) return true;
      if (x < 7 && y >= n - 7) return true;
      const timing = x === 6 || y === 6,
        format = (y === 8 && (x < 9 || x >= n - 8)) || (x === 8 && (y < 9 || y >= n - 8)),
        version =
          n >= 45 && ((x < 6 && y >= n - 11 && y < n - 8) || (y < 6 && x >= n - 11 && x < n - 8));
      return !timing && !format && !version;
    };
  // Wood grain: long, faint, slightly uneven bands across the board
  let grain = "";
  for (let y = 0.6; y < height; y += 0.9 + unit(0, Math.round(y * 10), 61) * 1.4)
    grain += `M0 ${round(y)}h${width}`;
  // The grid: a line through each module's center, the outermost ones
  // heavier, as a board's edge
  let fine = "";
  const first = 0.5,
    last = grid - 0.5;
  for (let i = 1; i < grid - 1; i++)
    fine += `M${gx + i + 0.5} ${gy + first}V${gy + last}M${gx + first} ${gy + i + 0.5}H${gx + last}`;
  const edge = `<rect x="${gx + first}" y="${gy + first}" width="${last - first}" height="${last - first}" fill="none" stroke="${LINE}" stroke-width=".09"/>`;
  let black = "",
    groups = "",
    shine = "",
    white = "";
  const r = RADIUS;
  const circle = (cx: number, cy: number, radius: number) =>
    `M${round(cx)} ${round(cy - radius)}a${radius} ${radius} 0 1 1 0 ${round(2 * radius)}a${radius} ${radius} 0 1 1 0-${round(2 * radius)}z`;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const X = ox + x,
        Y = oy + y;
      if (dark(x, y)) {
        if (joined(x, y)) {
          // A joined group: whole squares, so the pattern stays solid.
          // Rounded corners here lose the code at large sizes.
          groups += `M${X} ${Y}h1v1h-1z`;
          continue;
        }
        black += circle(X + 0.5, Y + 0.5, r);
        // The highlight, up and to the left, small enough to leave the
        // stone's center dark
        shine += circle(X + 0.5 - r * 0.42, Y + 0.5 - r * 0.42, r * 0.16);
        continue;
      }
      // White stones only on light data modules, away from the patterns
      // scanners look for first
      if (reserved(x, y) || unit(x, y, 71) > whiteRate) continue;
      white += circle(X + 0.5, Y + 0.5, r);
    }
  let text = "";
  if (lines.above || lines.below) {
    const em = emFor(lines, grid, (row * 0.34) / CAP);
    if (lines.above) text += lettering(lines.above, em, width / 2, rim + (row + CAP * em) / 2);
    if (lines.below)
      text += lettering(lines.below, em, width / 2, gy + grid + (row + CAP * em) / 2 - 0.2);
  }
  return `${svgOpen(size, "white")}<g transform="translate(${left} ${top}) scale(${k})"><rect width="${width}" height="${height}" rx=".8" fill="${RIM}"/><rect x="${gx}" y="${gy}" width="${grid}" height="${grid}" fill="${WOOD}"/><path d="${grain}" stroke="${GRAIN}" stroke-width=".35" opacity=".55"/><rect x="${gx}" y="${gy}" width="${grid}" height="${grid}" fill="none" stroke="#b88a4e" stroke-width=".12"/><path d="${fine}" stroke="${LINE}" stroke-width=".05"/>${edge}<path d="${white}" fill="${WHITE_STONE}" stroke="${WHITE_EDGE}" stroke-width=".05"/><path d="${groups}" fill="${STONE}" shape-rendering="crispEdges"/><path d="${black}" fill="${STONE}"/><path d="${shine}" fill="${SHINE}"/>${text ? `<g fill="${BURN}">${text}</g>` : ""}</g></svg>`;
}
