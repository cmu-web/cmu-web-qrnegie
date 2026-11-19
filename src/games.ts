// Go Board and Sea Battle (the scc collection). Like the merichar boards, each
// keeps the code
// dark on light, lays out in module units with whole pixels per module and
// letters its own lines inside its design, so the image stays square.
import type { BitMatrix } from "qrcode";
import { CAP, ems, emFor, lettering, round } from "./lettering";
import { darkAt, hash, svgOpen, unit } from "./boards";
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
// run of the code's dark modules, across or down, is an army-green warship
// seen from above, its bow pointed one way or the other, with a deckhouse,
// gun turrets and fittings by length: afloat in a light green, or sunk in a
// dark one with a hit peg in every hole and marks all around. A lone dark
// module is a black hit peg, and a few light modules hold black miss rings. Under the finder and alignment patterns, solid squares,
// so scanners find those shapes whole. Text above and below is lettered in
// pale blue on the case.
const SEA = "#dde9f3",
  SEA_LINE = "#c5d6e5",
  CASE = "#1d3a5c",
  CASE_LABEL = "#c9dcec",
  // Ships still afloat in a light army green and sunk ones in a dark one,
  // each with darker greens for deck fittings and outline. Even the light
  // green is dark next to the sea, so a ship reads as dark wherever
  // scanners sample it.
  AFLOAT = { hull: "#6b8040", fitting: "#4e5e2c", edge: "#3c4822", gleam: "#879b55" },
  SUNK = { hull: "#3d4720", fitting: "#2a3115", edge: "#1c210d", gleam: "#4f5a2c" },
  // About one ship in three is sunk
  SUNK_RATE = 0.35,
  // The finder and alignment patterns' squares, the dark green
  PATTERN = "#2a3115",
  // Pegs, all black as in the game: a hit fills a module; a miss is a ring
  // with the sea showing through, since scanners sample a light module's
  // middle; and the marks around a sunk ship sit on the grid's corners,
  // between modules, for the same reason
  PEG = "#141414",
  PEG_SHINE = "#3d3d3d",
  // A hull's height across, in modules: a little short of the row, so ships
  // in neighboring rows read as separate
  BEAM = 0.82;
// A warship seen from above, along +x from 0 to `length`, a module high:
// a squared stern, straight sides and a bow tapering to a point in the last
// module, where its middle is still covered. Ships of two carry a small
// cabin and mast; longer ones a deckhouse with a bridge, a turret toward
// the bow and, from five, another toward the stern, each with its barrel
// laid toward the nearer end.
function vessel(length: number, seed: number, c: typeof AFLOAT) {
  const half = BEAM / 2,
    top = 0.5 - half,
    bottom = 0.5 + half,
    stern = 0.06,
    tip = length - 0.03,
    taper = length - Math.min(0.95, length * 0.42),
    hull =
      `M${stern + 0.1} ${round(top)}H${round(taper)}` +
      `C${round(taper + 0.45)} ${round(top)} ${round(tip - 0.12)} ${round(0.5 - half * 0.35)} ${round(tip)} .5` +
      `C${round(tip - 0.12)} ${round(0.5 + half * 0.35)} ${round(taper + 0.45)} ${round(bottom)} ${round(taper)} ${round(bottom)}` +
      `H${stern + 0.1}Q${stern} ${round(bottom)} ${stern} ${round(bottom - 0.1)}V${round(top + 0.1)}Q${stern} ${round(top)} ${stern + 0.1} ${round(top)}z`;
  let parts =
    `<path d="${hull}" fill="${c.hull}" stroke="${c.edge}" stroke-width=".05"/>` +
    // Light along the upper side and a deck seam down the middle
    `<path d="M${stern + 0.2} ${round(top + 0.09)}H${round(taper)}" stroke="${c.gleam}" stroke-width=".05"/>` +
    `<path d="M${stern + 0.25} .5H${round(taper + 0.25)}" stroke="${c.edge}" stroke-width=".03" opacity=".7"/>` +
    // The bow's anchor fittings and the stern's rails
    `<circle cx="${round(tip - 0.42)}" cy="${round(0.5 - half * 0.45)}" r=".045" fill="${c.edge}"/><circle cx="${round(tip - 0.42)}" cy="${round(0.5 + half * 0.45)}" r=".045" fill="${c.edge}"/>` +
    `<path d="M${stern + 0.12} ${round(top + 0.16)}v${round(BEAM - 0.32)}" stroke="${c.edge}" stroke-width=".05"/>`;
  const turret = (cx: number, toward: number) =>
    `<rect x="${round(toward > 0 ? cx : cx - 0.46)}" y=".47" width=".46" height=".06" rx=".02" fill="${c.edge}"/>` +
    `<circle cx="${round(cx)}" cy=".5" r=".17" fill="${c.fitting}" stroke="${c.edge}" stroke-width=".04"/>`;
  if (length === 2) {
    // A patrol boat: a cabin with its windscreen, and a mast behind it
    parts +=
      `<rect x=".42" y=".3" width=".62" height=".4" rx=".07" fill="${c.fitting}" stroke="${c.edge}" stroke-width=".03"/>` +
      `<path d="M.98 .36v.28" stroke="${c.gleam}" stroke-width=".05"/>` +
      `<circle cx=".28" cy=".5" r=".06" fill="${c.edge}"/>`;
    return parts;
  }
  // The deckhouse amidships, a little aft, with the bridge at its front
  const house = Math.max(0.9, Math.min(length * 0.3, 2.4)),
    from = round(length * 0.45 - house / 2),
    to = round(from + house);
  parts +=
    `<rect x="${from}" y=".29" width="${round(house)}" height=".42" rx=".08" fill="${c.fitting}" stroke="${c.edge}" stroke-width=".03"/>` +
    `<rect x="${round(to - 0.32)}" y=".34" width=".22" height=".32" rx=".04" fill="${c.hull}"/>` +
    `<path d="M${round(to - 0.14)} .37v.26" stroke="${c.gleam}" stroke-width=".04"/>` +
    // A funnel, or two on the longest
    `<circle cx="${round(from + 0.32)}" cy=".5" r=".09" fill="${c.edge}"/>` +
    (house > 1.6 ? `<circle cx="${round(from + 0.62)}" cy=".5" r=".09" fill="${c.edge}"/>` : "");
  parts += turret(Math.min(to + 0.55, taper + 0.1), 1);
  if (length >= 5) parts += turret(Math.max(from - 0.55, 0.7), -1);
  // Life rafts along the sides on the longer hulls, placed by the ship's seed
  if (length >= 4)
    for (const side of [top + 0.14, bottom - 0.2])
      parts += `<rect x="${round(from + 0.15 + ((seed >>> 3) % 3) * 0.1)}" y="${round(side)}" width=".3" height=".06" rx=".03" fill="${c.edge}"/>`;
  return parts;
}
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
    hits = "",
    squares = "",
    misses = "",
    pegs = "";
  const corners = new Set<string>();
  const ship = (x: number, y: number, length: number, across: boolean) => {
    // Drawn along +x in a box `length` long and a module high, then turned
    // into place, bow first one way or the other
    const X = ox + x,
      Y = oy + y,
      forward = hash(x, y, 85) % 2 === 0,
      place = across
        ? forward
          ? `translate(${X} ${Y})`
          : `translate(${X + length} ${Y}) scale(-1 1)`
        : forward
          ? `translate(${X + 1} ${Y}) rotate(90)`
          : `translate(${X + 1} ${Y + length}) rotate(90) scale(-1 1)`;
    const sunk = unit(x, y, 87) < SUNK_RATE;
    hulls += `<g transform="${place}">${vessel(length, hash(x, y, 86), sunk ? SUNK : AFLOAT)}</g>`;
    if (!sunk) return;
    // A sunk ship: a hit peg in each of its holes, and marks on the grid's
    // corners all around it
    for (let i = 0; i < length; i++) {
      const [hx, hy] = across ? [X + i, Y] : [X, Y + i];
      pegs += `<circle cx="${hx + 0.5}" cy="${hy + 0.5}" r=".15"/>`;
    }
    for (let i = 0; i <= length; i++)
      for (const side of [0, 1]) {
        const [cx, cy] = across ? [X + i, Y + side] : [X + side, Y + i];
        corners.add(`${cx} ${cy}`);
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
      else
        hits +=
          `<circle cx="${ox + x + 0.5}" cy="${oy + y + 0.5}" r=".41" fill="${PEG}"/>` +
          `<circle cx="${round(ox + x + 0.37)}" cy="${round(oy + y + 0.37)}" r=".09" fill="${PEG_SHINE}"/>`;
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (joined(x, y)) {
        if (dark(x, y)) squares += `M${ox + x} ${oy + y}h1v1h-1z`;
        continue;
      }
      if (dark(x, y) || modules.isReserved(y, x) || unit(x, y, 84) > missRate) continue;
      misses += `<circle cx="${ox + x + 0.5}" cy="${oy + y + 0.5}" r=".25"/>`;
    }
  let text = "";
  if (lines.above || lines.below) {
    const em = emFor(lines, q, (row * 0.32) / CAP);
    if (lines.above) text += lettering(lines.above, em, sx + q / 2, rim + (row + CAP * em) / 2);
    if (lines.below)
      text += lettering(lines.below, em, sx + q / 2, sy + q + (row + CAP * em) / 2 - 0.2);
  }
  return `${svgOpen(size, "white")}<g transform="translate(${left} ${top}) scale(${k})"><rect width="${width}" height="${height}" rx=".8" fill="${CASE}"/><rect x="${sx}" y="${sy}" width="${q}" height="${q}" fill="${SEA}"/><path d="${grid}" stroke="${SEA_LINE}" stroke-width=".05"/><g fill="${CASE_LABEL}">${labels}${text}</g><g fill="none" stroke="${PEG}" stroke-width=".07">${misses}</g><path d="${squares}" fill="${PATTERN}" shape-rendering="crispEdges"/>${hulls}${hits}<g fill="${PEG}">${pegs}${[
    ...corners,
  ]
    .map((p) => {
      const [cx, cy] = p.split(" ");
      return `<circle cx="${cx}" cy="${cy}" r=".09"/>`;
    })
    .join("")}</g></g></svg>`;
}
