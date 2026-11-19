// Go Board, Sea Battle and Tic-Tac-Toe (the scc collection). Like the
// merichar boards, each
// keeps the code
// dark on light, lays out in module units with whole pixels per module and
// letters its own lines inside its design, so the image stays square.
import type { BitMatrix } from "qrcode";
import { CAP, ems, emFor, lettering, round } from "./lettering";
import { darkAt, hash, svgOpen, unit } from "./boards";
import { fit, type Lines } from "./screens";
import { HANDWRITING } from "./handwriting";

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
// dark one with a black hit peg in every hole. A lone dark module is a black
// hit peg, and a few light modules hold black miss rings. Under the finder and alignment patterns, solid squares,
// so scanners find those shapes whole. Text above and below is lettered in
// pale blue on the case.
const SEA = "#c4dbef",
  SEA_LINE = "#abc8e3",
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
  // Black pegs: in a sunk ship's holes, and misses as rings with the sea
  // showing through, since scanners sample a light module's middle
  PEG = "#141414",
  // A lone hit: a smaller plain black peg
  HIT = "#141414",
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
    // A sunk ship: a hit peg in each of its holes
    for (let i = 0; i < length; i++) {
      const [hx, hy] = across ? [X + i, Y] : [X, Y + i];
      pegs += `<circle cx="${hx + 0.5}" cy="${hy + 0.5}" r=".15"/>`;
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
      else hits += `<circle cx="${ox + x + 0.5}" cy="${oy + y + 0.5}" r=".32" fill="${HIT}"/>`;
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
  return `${svgOpen(size, "white")}<g transform="translate(${left} ${top}) scale(${k})"><rect width="${width}" height="${height}" rx=".8" fill="${CASE}"/><rect x="${sx}" y="${sy}" width="${q}" height="${q}" fill="${SEA}"/><path d="${grid}" stroke="${SEA_LINE}" stroke-width=".05"/><g fill="${CASE_LABEL}">${labels}${text}</g><g fill="none" stroke="${PEG}" stroke-width=".07">${misses}</g><path d="${squares}" fill="${PATTERN}" shape-rendering="crispEdges"/>${hulls}${hits}<g fill="${PEG}">${pegs}</g></g></svg>`;
}

// Tic-Tac-Toe: a game played out on a sheet of notebook paper. Faint blue
// rules, a red margin line, and the game's big # drawn in pencil across the
// code, its strokes on the modules' edges. The code's dark modules are X's
// in a dark marker, each stroke its own length, angle, bow and width, as
// drawn quickly by hand, both crossing the module's middle, where scanners
// sample; a few light modules hold red O's, uneven loops that overshoot or
// stop short, with the paper showing through their middles. Under the finder and alignment patterns,
// marker-filled squares, so scanners find those shapes whole. Text above and
// below is handwritten in pencil.
const NOTEBOOK = "#fdfcf6",
  NOTEBOOK_RULE = "#d3e1f0",
  MARGIN_RULE = "#e8a3a0",
  PENCIL = "#8d939b",
  MARKER_X = "#1d2433",
  MARKER_O = "#c8423a",
  // An X's strokes: their width, from thinnest to thickest, and how far
  // their ends stop short of the module's corners, in modules
  X_STROKE = [0.15, 0.22],
  X_INSET = 0.14;
// A hand-drawn stroke from (x1, y1) to (x2, y2), bowed a little to one side
function handStroke(x1: number, y1: number, x2: number, y2: number, bow: number) {
  const mx = (x1 + x2) / 2,
    my = (y1 + y2) / 2,
    dx = x2 - x1,
    dy = y2 - y1,
    length = Math.hypot(dx, dy);
  return `M${round(x1)} ${round(y1)}Q${round(mx - (dy / length) * bow)} ${round(my + (dx / length) * bow)} ${round(x2)} ${round(y2)}`;
}
// A hand-drawn O around (cx, cy): a loop of uneven radius, started at a
// random angle and carried a little past where it began, or stopped a
// little short
function handLoop(cx: number, cy: number, r: number, squash: number, turn: number, seed: number) {
  const steps = 10,
    start = unit(seed, 1, 96) * Math.PI * 2,
    sweep = Math.PI * 2 * (0.94 + unit(seed, 2, 96) * 0.16),
    point = (i: number) => {
      const a = start + (sweep * i) / steps,
        wobble = 1 + (unit(seed, i + 3, 97) - 0.5) * 0.14,
        x = Math.cos(a) * r * wobble,
        y = Math.sin(a) * r * squash * wobble;
      return [
        cx + x * Math.cos(turn) - y * Math.sin(turn),
        cy + x * Math.sin(turn) + y * Math.cos(turn),
      ];
    };
  // Smoothed through the midpoints between the points
  const pts = Array.from({ length: steps + 1 }, (_, i) => point(i));
  let d = `M${round(pts[0][0])} ${round(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i],
      [nx, ny] = pts[i + 1];
    d += `Q${round(px)} ${round(py)} ${round((px + nx) / 2)} ${round((py + ny) / 2)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return d + `L${round(lx)} ${round(ly)}`;
}
export function ticTacToe(
  modules: BitMatrix,
  size: number,
  lines: Lines,
  // About one light module in eight inside the code holds an O
  oRate = 0.12,
) {
  // The sheet: the code's block with its margin, a band of paper around it
  // with the margin line at the left, and a row for each line of text
  const n = modules.size,
    q = n + 8,
    pad = 2,
    margin = 3,
    row = 4,
    above = lines.above ? row : 0,
    width = margin + q + pad,
    height = pad + above + q + (lines.below ? row : 0) + pad,
    k = fit("tic-tac-toe", Math.max(width, height), size),
    left = Math.round((size - width * k) / 2),
    top = Math.round((size - height * k) / 2),
    bx = margin,
    by = pad + above,
    ox = bx + 4,
    oy = by + 4,
    dark = darkAt(modules),
    joined = solidPattern(modules);
  // Ruled lines on every other module edge, down the whole sheet, and the
  // margin line
  let rules = "";
  for (let y = by % 2; y <= height; y += 2) rules += `M0 ${y}H${width}`;
  // The game's #: two strokes each way at the code's thirds, on module edges,
  // a little uneven, as drawn by hand
  const third = (i: number) => Math.round((n * i) / 3);
  let hashMark = "";
  for (const i of [1, 2]) {
    const at = third(i),
      w = (j: number) => round((unit(i, j, 91) - 0.5) * 0.12);
    hashMark += `M${ox + at + w(1)} ${oy - 1.2}L${ox + at + w(2)} ${oy + n + 1.2}`;
    hashMark += `M${ox - 1.2} ${oy + at + w(3)}L${ox + n + 1.2} ${oy + at + w(4)}`;
  }
  // The marks: an X on each dark module, its strokes a little off true, and
  // marker-filled squares under the patterns scanners look for first
  let xs = "",
    os = "",
    squares = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const X = ox + x,
        Y = oy + y;
      if (dark(x, y)) {
        if (joined(x, y)) {
          squares += `M${X} ${Y}h1v1h-1z`;
          continue;
        }
        // Two strokes, each its own length, angle, bow and width, as drawn
        // quickly by hand; both cross the module's middle
        const j = (salt: number) => (unit(x, y, salt) - 0.5) * 0.16,
          a = X_INSET,
          b = 1 - X_INSET,
          width = (salt: number) =>
            round(X_STROKE[0] + unit(x, y, salt) * (X_STROKE[1] - X_STROKE[0])),
          bow = (salt: number) => round((unit(x, y, salt) - 0.5) * 0.14);
        xs += `<path d="${handStroke(X + a + j(1), Y + a + j(2), X + b + j(3), Y + b + j(4), bow(9))}" stroke-width="${width(11)}"/>`;
        xs += `<path d="${handStroke(X + b + j(5), Y + a + j(6), X + a + j(7), Y + b + j(8), bow(10))}" stroke-width="${width(12)}"/>`;
        continue;
      }
      if (modules.isReserved(y, x) || unit(x, y, 92) > oRate) continue;
      // An O: its size, roundness, tilt and line all its own, open in the
      // middle
      const r = 0.24 + unit(x, y, 93) * 0.11,
        squash = 0.78 + unit(x, y, 94) * 0.22,
        turn = (unit(x, y, 95) - 0.5) * 1.6,
        weight = round(0.06 + unit(x, y, 98) * 0.04);
      os += `<path d="${handLoop(X + 0.5, Y + 0.5, r, squash, turn, hash(x, y, 99) % 100000)}" stroke-width="${weight}"/>`;
    }
  let text = "";
  if (lines.above || lines.below) {
    const em = emFor(lines, q, (row * 0.4) / CAP, HANDWRITING);
    if (lines.above)
      text += lettering(lines.above, em, bx + q / 2, pad + (row + CAP * em) / 2, HANDWRITING);
    if (lines.below)
      text += lettering(lines.below, em, bx + q / 2, by + q + (row + CAP * em) / 2, HANDWRITING);
  }
  return `${svgOpen(size, "white")}<g transform="translate(${left} ${top}) scale(${k})"><rect width="${width}" height="${height}" rx=".6" fill="${NOTEBOOK}"/><path d="${rules}" stroke="${NOTEBOOK_RULE}" stroke-width=".06"/><path d="M${margin - 1} 0V${height}" stroke="${MARGIN_RULE}" stroke-width=".08"/><path d="${hashMark}" stroke="${PENCIL}" stroke-width=".12" stroke-linecap="round"/><g fill="none" stroke="${MARKER_O}" stroke-linecap="round" stroke-linejoin="round">${os}</g><path d="${squares}" fill="${MARKER_X}" shape-rendering="crispEdges"/><g fill="none" stroke="${MARKER_X}" stroke-linecap="round">${xs}</g>${text ? `<g fill="${PENCIL}">${text}</g>` : ""}</g></svg>`;
}
