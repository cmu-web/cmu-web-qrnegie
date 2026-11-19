// Go Board and Sea Battle (the scc collection). Like the merichar boards, each
// keeps the code
// dark on light, lays out in module units with whole pixels per module and
// letters its own lines inside its design, so the image stays square.
import type { BitMatrix } from "qrcode";
import { CAP, ems, emFor, lettering, round } from "./lettering";
import { darkAt, svgOpen, unit } from "./boards";
import { fit, type Lines } from "./screens";

// Whether a module is in a finder or alignment pattern, drawn as solid
// squares; the timing, format and version modules around them are not.
// Rounded shapes there lose the code in jsQR at large sizes.
export function solidPattern(modules: BitMatrix) {
  const n = modules.size;
  return (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= n || y >= n || !modules.isReserved(y, x)) return false;
    if ((x < 7 || x >= n - 7) && y < 7) return true;
    if (x < 7 && y >= n - 7) return true;
    const timing = x === 6 || y === 6,
      format = (y === 8 && (x < 9 || x >= n - 8)) || (x === 8 && (y < 9 || y >= n - 8)),
      version =
        n >= 45 && ((x < 6 && y >= n - 11 && y < n - 8) || (y < 6 && x >= n - 11 && x < n - 8));
    return !timing && !format && !version;
  };
}

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
    joined = solidPattern(modules);
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

// Sea Battle: a plotting grid from the classic naval guessing game, in a navy
// plastic case with numbers across the top and letters down the side. Each
// run of the code's dark modules, across or down, is a ship's gray hull with
// a deckhouse; a lone dark module is a red hit peg. A few light modules hold
// white miss pegs. Under the finder and alignment patterns, solid squares,
// so scanners find those shapes whole. Text above and below is lettered in
// pale blue on the case.
const SEA = "#dde9f3",
  SEA_LINE = "#c5d6e5",
  CASE = "#1d3a5c",
  CASE_LABEL = "#c9dcec",
  HULL = "#26323c",
  DECK = "#3a4955",
  HIT = "#8c1515",
  MISS = "#ffffff",
  MISS_EDGE = "#b4c6d6",
  // A hull's height across, in modules: a little short of the row, so ships
  // in neighboring rows read as separate
  BEAM = 0.82;
// A row's letters: A to Z, then AA to AZ, BA and on
const rowName = (i: number) =>
  (i < 26 ? "" : String.fromCharCode(64 + Math.floor(i / 26))) + String.fromCharCode(65 + (i % 26));
export function seaBattle(
  modules: BitMatrix,
  size: number,
  lines: Lines,
  // About one light module in fourteen inside the code holds a miss peg
  missRate = 0.07,
) {
  // The case: the sea, the code's block with its margin, with a band of
  // numbers above it and of letters to its left, a row for each line of
  // text, and a rim. A rectangle, centered on white.
  const n = modules.size,
    q = n + 8,
    rim = 1,
    numbers = 1.6,
    letters = 2.2,
    row = 4,
    above = lines.above ? row : 0,
    width = rim + letters + q + rim + 0.6,
    height = rim + above + numbers + q + (lines.below ? row : rim + 0.6),
    k = fit("sea-battle", Math.max(width, height), size),
    left = Math.round((size - width * k) / 2),
    top = Math.round((size - height * k) / 2),
    sx = rim + letters,
    sy = rim + above + numbers,
    ox = sx + 4,
    oy = sy + 4,
    dark = darkAt(modules),
    joined = solidPattern(modules);
  // The sea's grid, on the modules' edges
  let grid = "";
  for (let i = 0; i <= q; i++) grid += `M${sx + i} ${sy}v${q}M${sx} ${sy + i}h${q}`;
  // The bands' numbers and letters, one for every column and row of the sea
  const labelEm = 0.42 / CAP;
  let labels = "";
  for (let i = 0; i < q; i++) {
    const name = String(i + 1),
      em = Math.min(labelEm, 0.9 / ems(name));
    labels += lettering(name, em, sx + i + 0.5, sy - (numbers - CAP * em) / 2);
    const letter = rowName(i),
      lem = Math.min(labelEm, (letters - 0.6) / ems(letter));
    labels += lettering(letter, lem, rim + letters / 2, sy + i + 0.5 + (CAP * lem) / 2);
  }
  // The fleet: runs across first, then runs down among what's left; a
  // module alone is a hit
  const taken = new Set<number>(),
    free = (x: number, y: number) => dark(x, y) && !joined(x, y) && !taken.has(y * n + x);
  let hulls = "",
    decks = "",
    hits = "",
    squares = "",
    misses = "";
  const ship = (x: number, y: number, length: number, across: boolean) => {
    const X = ox + x,
      Y = oy + y,
      inset = (1 - BEAM) / 2,
      [w, h] = across ? [length - 2 * inset, BEAM] : [BEAM, length - 2 * inset];
    hulls += `<rect x="${round(X + inset)}" y="${round(Y + inset)}" width="${round(w)}" height="${round(h)}" rx="${BEAM / 2}"/>`;
    // A deckhouse amidships on ships of three or more, and a gun turret
    // toward each end on the longest; all dark, so the hull still reads as
    // dark where scanners sample
    if (length >= 3) {
      const house = Math.max(1, Math.floor(length / 3)),
        start = Math.floor((length - house) / 2);
      decks += across
        ? `<rect x="${round(X + start + 0.15)}" y="${round(Y + 0.3)}" width="${round(house - 0.3)}" height=".4" rx=".08"/>`
        : `<rect x="${round(X + 0.3)}" y="${round(Y + start + 0.15)}" width=".4" height="${round(house - 0.3)}" rx=".08"/>`;
      if (length >= 5)
        for (const at of [0.9, length - 0.9])
          decks += across
            ? `<circle cx="${round(X + at)}" cy="${Y + 0.5}" r=".17"/>`
            : `<circle cx="${X + 0.5}" cy="${round(Y + at)}" r=".17"/>`;
    }
    // Now and then a red hit peg on a hull
    for (let i = 0; i < length; i++) {
      const [hx, hy] = across ? [x + i, y] : [x, y + i];
      if (unit(hx, hy, 83) < 0.12)
        hits += `<circle cx="${ox + hx + 0.5}" cy="${oy + hy + 0.5}" r=".2"/>`;
    }
  };
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (!free(x, y)) continue;
      let length = 0;
      while (free(x + length, y)) length++;
      if (length < 2) continue;
      for (let i = 0; i < length; i++) taken.add(y * n + x + i);
      ship(x, y, length, true);
    }
  for (let x = 0; x < n; x++)
    for (let y = 0; y < n; y++) {
      if (!free(x, y)) continue;
      let length = 0;
      while (free(x, y + length)) length++;
      for (let i = 0; i < length; i++) taken.add((y + i) * n + x);
      if (length >= 2) ship(x, y, length, false);
      else hits += `<circle cx="${ox + x + 0.5}" cy="${oy + y + 0.5}" r=".41"/>`;
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (joined(x, y)) {
        if (dark(x, y)) squares += `M${ox + x} ${oy + y}h1v1h-1z`;
        continue;
      }
      if (dark(x, y) || modules.isReserved(y, x) || unit(x, y, 84) > missRate) continue;
      misses += `<circle cx="${ox + x + 0.5}" cy="${oy + y + 0.5}" r=".28"/>`;
    }
  let text = "";
  if (lines.above || lines.below) {
    const em = emFor(lines, q, (row * 0.32) / CAP);
    if (lines.above) text += lettering(lines.above, em, sx + q / 2, rim + (row + CAP * em) / 2);
    if (lines.below)
      text += lettering(lines.below, em, sx + q / 2, sy + q + (row + CAP * em) / 2 - 0.2);
  }
  return `${svgOpen(size, "white")}<g transform="translate(${left} ${top}) scale(${k})"><rect width="${width}" height="${height}" rx=".8" fill="${CASE}"/><rect x="${sx}" y="${sy}" width="${q}" height="${q}" fill="${SEA}"/><path d="${grid}" stroke="${SEA_LINE}" stroke-width=".05"/><g fill="${CASE_LABEL}">${labels}${text}</g><g fill="${MISS}" stroke="${MISS_EDGE}" stroke-width=".05">${misses}</g><path d="${squares}" fill="${HULL}" shape-rendering="crispEdges"/><g fill="${HULL}">${hulls}</g><g fill="${DECK}">${decks}</g><g fill="${HIT}">${hits}</g></g></svg>`;
}
