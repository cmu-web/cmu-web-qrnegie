// Engineering Paper and Minefield (the merichar collection). Each keeps the
// code dark on light, lays out in module units with whole pixels per module
// and letters its own lines inside its design, so the image stays square.
import type { BitMatrix } from "qrcode";
import { CAP, emFor, lettering, round } from "./lettering";
import { HANDWRITING } from "./handwriting";
import { PIXEL_FONT, PIXEL_WIDTH } from "./pixelfont";
import { fit, type Lines } from "./screens";
import type { QrStyle } from "./style-info";

// A well-mixed hash, the same for the same module every time
export function hash(x: number, y: number, salt = 0) {
  let h = Math.imul(x + 0x9e37 * salt, 0x9e3779b1) ^ Math.imul(y + 0x6b43a9b5, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}
// A hash as a number from 0 to 1
export const unit = (x: number, y: number, salt = 0) => hash(x, y, salt) / 4294967296;
export const svgOpen = (size: number, background: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="${background}"/>`;
// Whether a module is dark, false outside the code
export const darkAt = (modules: BitMatrix) => (x: number, y: number) =>
  x >= 0 && y >= 0 && x < modules.size && y < modules.size && !!modules.get(y, x);

// A square layout: the code's block (q across, margin included) with
// `border` around it and a 4-module row for each line of text, centered so
// the block lands on whole modules
export function layout(
  style: QrStyle,
  modules: BitMatrix,
  size: number,
  lines: Lines,
  border: number,
  extraTop = 0,
  extraLeft = 0,
  // Space between each line of text and the code's block
  gap = 0,
) {
  const q = modules.size + 8,
    row = 4,
    rows = (lines.above ? 1 : 0) + (lines.below ? 1 : 0),
    side = q + 2 * border + (row + gap) * rows + extraTop,
    k = fit(style, side, size),
    offset = Math.round((size - side * k) / 2),
    x = (side - q + extraLeft) / 2,
    y = border + extraTop + (lines.above ? row + gap : 0);
  // Centered across, the block can sit on a half module; keep whole ones
  return { q, row, side, k, offset, x: Math.floor(x), y, gap };
}
// The lines' lettering: above in the row over the block, below under it
export function labelText(
  lines: Lines,
  l: ReturnType<typeof layout>,
  border: number,
  extraTop = 0,
  glyphs?: Record<string, [number, string]>,
  scale = 0.32,
) {
  if (!lines.above && !lines.below) return "";
  const em = emFor(lines, l.q, (l.row * scale) / CAP, glyphs);
  let text = "";
  if (lines.above)
    text += lettering(
      lines.above,
      em,
      l.x + l.q / 2,
      border + extraTop + (l.row + CAP * em) / 2,
      glyphs,
    );
  if (lines.below)
    text += lettering(
      lines.below,
      em,
      l.x + l.q / 2,
      l.y + l.q + l.gap + (l.row + CAP * em) / 2,
      glyphs,
    );
  return text;
}

// Engineering Paper: cream pad paper with rounded corners, a very faint
// green grid, stronger every five squares, dark green margin lines and a
// header band split into boxes. The code is colored in with a fat black
// marker, as if idly: the pen runs along each row's run of dark squares in
// one wobbly stroke with round ends, and sometimes lifts and starts again,
// where the two strokes overlap darker. Rows touch, since the marker is a
// little wider than a square. Text above and below is handwritten in
// ballpoint blue.
const CREAM = "#fffff0",
  FINE = "#e4ecd6",
  HEAVY = "#cfddbd",
  RULE = "#2f8a32",
  PEN = "#24389a";
// The marker: a little wider than a square, so neighboring strokes touch,
// and a slight wobble, in modules
// The squares of grid between the margin lines and the code's block
export const PAPER = { gap: 1, handGap: 9 };
const MARKER = "#161616",
  MARKER_WIDTH = 1.06,
  WOBBLE = 0.03;
export function engineeringPaper(modules: BitMatrix, size: number, lines: Lines) {
  // The page, in squares: a margin outside each dark green line, the same
  // on both sides, the header band, and a square of grid between the
  // lines and the code's block on every side. The code is centered between
  // the margin lines; with text, the paper runs longer, and the handwriting
  // sits nine squares out from the code's margin (closer, jsQR takes its
  // letters for the code's corner squares at large sizes).
  const n = modules.size,
    q = n + 8,
    header = 3,
    marginLeft = 3,
    marginRight = 3,
    gap = PAPER.gap,
    row = 4,
    handGap = PAPER.handGap,
    above = lines.above ? row + handGap : 0,
    below = lines.below ? row + handGap : 0,
    width = marginLeft + gap + q + gap + marginRight,
    height = header + gap + above + q + below + gap,
    side = Math.max(width, height),
    k = fit("engineering-paper", side, size),
    offsetX = Math.round((size - width * k) / 2),
    offsetY = Math.round((size - height * k) / 2),
    bx = marginLeft + gap,
    by = header + gap + above,
    dark = darkAt(modules),
    ox = bx + 4,
    oy = by + 4,
    right = width - marginRight;
  // The grid, between the margin lines and under the header, on whole
  // squares so it lines up with the code; stronger every five
  let fine = "",
    heavy = "";
  for (let i = marginLeft; i <= right; i++)
    if ((i - bx) % 5 === 0) heavy += `M${i} ${header}V${height}`;
    else fine += `M${i} ${header}V${height}`;
  for (let i = header; i <= height; i++)
    if ((i - by) % 5 === 0) heavy += `M${marginLeft} ${i}H${right}`;
    else fine += `M${marginLeft} ${i}H${right}`;
  // The margin lines, and the header band's rule and box dividers
  const boxes = [
      marginLeft,
      round(marginLeft + (right - marginLeft) * 0.38),
      round(marginLeft + (right - marginLeft) * 0.7),
      right,
    ],
    rules = `M${marginLeft} 0V${height}M${right} 0V${height}M0 ${header}H${width}${boxes.map((x) => `M${x} 0V${header}`).join("")}`;
  // The marker: pen paths through the dark squares, side to side and up and
  // down, going straight when they can and turning when they must; the pen
  // lifts where a path runs out of uncolored squares next to it, and starts
  // again elsewhere. Under the finder, timing and alignment patterns, plain
  // squares keep their shapes whole for scanners; the strokes cover them.
  const wob = (x: number, y: number, i: number) => (unit(x, y, 80 + i) - 0.5) * 2 * WOBBLE;
  const seen = new Set<number>(),
    free = (x: number, y: number) => dark(x, y) && !seen.has(y * n + x);
  const grow = (path: [number, number][], dx: number, dy: number) => {
    for (;;) {
      const [x, y] = path[path.length - 1],
        turns: [number, number][] = [
          [dx, dy],
          [dy, -dx],
          [-dy, dx],
        ];
      if (hash(x, y, 92) % 2) [turns[1], turns[2]] = [turns[2], turns[1]];
      const next = turns.find(([tx, ty]) => free(x + tx, y + ty));
      if (!next) return;
      [dx, dy] = next;
      path.push([x + dx, y + dy]);
      seen.add((y + dy) * n + x + dx);
    }
  };
  const strokes: string[] = [];
  let squares = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (dark(x, y) && modules.isReserved(y, x)) squares += `M${ox + x} ${oy + y}h1v1h-1z`;
      if (!free(x, y)) continue;
      const path: [number, number][] = [[x, y]];
      seen.add(y * n + x);
      grow(path, 1, 0);
      path.reverse();
      const [ax, ay] = path[path.length - 1],
        [bx, by] = path.length > 1 ? path[path.length - 2] : [ax, ay - 1];
      grow(path, ax - bx, ay - by);
      // Through each square's middle, a little off; the corners kept, the
      // straight stretches as single lines
      const keep = path.filter((p, i) => {
        if (i === 0 || i === path.length - 1) return true;
        const [q0, q1] = [path[i - 1], path[i + 1]];
        return p[0] - q0[0] !== q1[0] - p[0] || p[1] - q0[1] !== q1[1] - p[1] || i % 3 === 0;
      });
      strokes.push(
        keep
          .map(
            ([px, py], i) =>
              `${i ? "L" : "M"}${round(ox + px + 0.5 + wob(px, py, 0))} ${round(oy + py + 0.5 + wob(px, py, 1))}`,
          )
          .join("") + (keep.length === 1 ? "h.001" : ""),
      );
    }
  const ink = strokes
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${MARKER}" stroke-width="${MARKER_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
  let text = "";
  if (lines.above || lines.below) {
    const em = emFor(lines, q, (row * 0.4) / CAP, HANDWRITING);
    if (lines.above)
      text += lettering(
        lines.above,
        em,
        bx + q / 2,
        header + gap + (row + CAP * em) / 2,
        HANDWRITING,
      );
    if (lines.below)
      text += lettering(
        lines.below,
        em,
        bx + q / 2,
        by + q + handGap + (row + CAP * em) / 2,
        HANDWRITING,
      );
  }
  return `${svgOpen(size, "white")}<g transform="translate(${offsetX} ${offsetY}) scale(${k})"><rect width="${width}" height="${height}" rx="1.2" fill="${CREAM}"/><path d="${fine}" stroke="${FINE}" stroke-width=".04"/><path d="${heavy}" stroke="${HEAVY}" stroke-width=".07"/><path d="${rules}" stroke="${RULE}" stroke-width=".1"/>${squares ? `<path d="${squares}" fill="${MARKER}" shape-rendering="crispEdges"/>` : ""}${ink}${text ? `<g fill="${PEN}">${text}</g>` : ""}</g></svg>`;
}

// Minefield: a tile board as in the classic desktop game. A raised gray
// frame, as wide as the board; a sunken top panel with a red seven-segment
// counter of the mines at the left, a face button in the middle and a timer
// at the right; and a sunken board. The code's dark modules are black mines
// with spikes and a white glint. Its light modules and margin are revealed
// tiles, lighter than the frame and flat with thin lines, some showing how
// many mines touch them in the classic colors, inside a ring of raised,
// unrevealed tiles.
const TILE = "#c0c0c0",
  TILE_LIGHT = "#ffffff",
  TILE_DARK = "#808080",
  NUMBER_COLORS = [
    "",
    "#0000ff",
    "#008000",
    "#ff0000",
    "#000080",
    "#800000",
    "#008080",
    "#000000",
    "#808080",
  ];
// The revealed tiles and their lines, lighter than the frame, so plain
// black mines stand out on them
const FIELD = "#dedede",
  FIELD_LINE = "#c4c4c4",
  // The mine's body radius and its spikes' width, in modules
  BODY = 0.38,
  SPIKE = 0.16,
  // Under the finder, timing and alignment patterns' mines, a dark tile, and
  // the mine a shade lighter. Scanners compare each small patch with its own
  // average: a mine much lighter than its tile would read as light.
  BACKING = "#1b1b1b",
  BACKED_MINE = "#2c2c2c";
// A raised (or, with `sunken`, a sunken) bevel around a box
function bevel(x: number, y: number, w: number, h: number, t: number, sunken = false) {
  const [a, b] = sunken ? [TILE_DARK, TILE_LIGHT] : [TILE_LIGHT, TILE_DARK];
  return `<path d="M${round(x)} ${round(y)}h${round(w)}l-${t} ${t}h-${round(w - 2 * t)}v${round(h - 2 * t)}l-${t} ${t}z" fill="${a}"/><path d="M${round(x + w)} ${round(y + h)}h-${round(w)}l${t}-${t}h${round(w - 2 * t)}v-${round(h - 2 * t)}l${t}-${t}z" fill="${b}"/>`;
}
// Seven-segment digits, red on black with the unlit segments dim, in a box
// `height` tall from (x, y)
const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};
function sevenSegment(text: string, x: number, y: number, height: number) {
  const pad = height * 0.12,
    h = height - 2 * pad,
    w = h * 0.5,
    t = h * 0.11,
    gap = w * 0.35,
    width = text.length * (w + gap) - gap + 2 * pad;
  // Each segment a bar with pointed ends
  const bar = (x0: number, y0: number, length: number, across: boolean) =>
    across
      ? `M${round(x0)} ${round(y0)}l${round(t / 2)}-${round(t / 2)}h${round(length - t)}l${round(t / 2)} ${round(t / 2)}l-${round(t / 2)} ${round(t / 2)}h-${round(length - t)}z`
      : `M${round(x0)} ${round(y0)}l${round(t / 2)} ${round(t / 2)}v${round(length - t)}l-${round(t / 2)} ${round(t / 2)}l-${round(t / 2)}-${round(t / 2)}v-${round(length - t)}z`;
  let lit = "",
    dim = "";
  [...text].forEach((c, i) => {
    const X = x + pad + i * (w + gap),
      Y = y + pad,
      half = h / 2,
      parts: Record<string, string> = {
        a: bar(X, Y, w, true),
        b: bar(X + w, Y, half, false),
        c: bar(X + w, Y + half, half, false),
        d: bar(X, Y + h, w, true),
        e: bar(X, Y + half, half, false),
        f: bar(X, Y, half, false),
        g: bar(X, Y + half, w, true),
      };
    for (const [name, d] of Object.entries(parts))
      if (SEGMENTS[c].includes(name)) lit += d;
      else dim += d;
  });
  return {
    width,
    svg: `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${height}" fill="#100000"/><path d="${dim}" fill="#3a0000"/><path d="${lit}" fill="#ff1a0a"/>`,
  };
}
// A bold digit in the pixel font, centered on (cx, cy), `height` tall
function pixelDigit(c: string, cx: number, cy: number, height: number) {
  const p = height / 10,
    rows = PIXEL_FONT[c].slice(2, 12);
  let d = "";
  rows.forEach((row, y) => {
    for (let bit = PIXEL_WIDTH - 1; bit >= 0; bit--)
      if (row & (1 << bit))
        d += `M${round(cx - (PIXEL_WIDTH / 2) * p + (PIXEL_WIDTH - 1 - bit) * p)} ${round(cy - height / 2 + y * p)}h${round(p)}v${round(p)}h-${round(p)}z`;
  });
  return d;
}
export function minefield(
  modules: BitMatrix,
  size: number,
  lines: Lines,
  // About one revealed tile in sixteen inside the code shows its number,
  // since more cost scans, and most of the margin tiles touching it do
  numberRate = 0.06,
  marginRate = 0.6,
) {
  // The board: the code's block, its margin included, inside a ring of
  // raised tiles; the frame a module wider than it on each side, with the
  // top panel above it and a row for each line of text. The frame is a
  // rectangle, centered on white.
  const n = modules.size,
    q = n + 8,
    ring = 2,
    gap = 1,
    panel = 5,
    row = 4,
    board = q + 2 * ring,
    frameWidth = board + 2 * gap,
    boardY = panel + (lines.above ? row : 0),
    frameHeight = boardY + board + (lines.below ? row : gap),
    span = Math.max(frameWidth, frameHeight),
    k = fit("minefield", span, size),
    left = Math.round((size - frameWidth * k) / 2),
    top = Math.round((size - frameHeight * k) / 2),
    boardX = gap,
    bx = boardX + ring,
    by = boardY + ring,
    dark = darkAt(modules),
    ox = bx + 4,
    oy = by + 4;
  let mines = 0,
    raised = "",
    revealedLines = "",
    numbers = "",
    bombs = "",
    backBombs = "",
    backing = "",
    glints = "";
  // The ring: raised, unrevealed tiles, outside the code's margin. In the
  // margin their bevels would read as dark lines and hide the code's edges.
  for (let y = 0; y < board; y++)
    for (let x = 0; x < board; x++)
      if (x < ring || y < ring || x >= board - ring || y >= board - ring)
        raised += bevel(boardX + x, boardY + y, 1, 1, 0.12);
  // Revealed tiles: lines only a little darker than the tiles, since
  // scanners compare each small patch with its own average
  for (let i = 0; i <= q; i++) revealedLines += `M${bx + i} ${by}v${q}M${bx} ${by + i}h${q}`;
  const r = BODY,
    s2 = SPIKE / 2;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const X = ox + x,
        Y = oy + y;
      if (dark(x, y)) {
        mines++;
        // The finder, timing and alignment patterns' mines lie on dark
        // tiles, so scanners find those shapes whole
        const backed = !!modules.isReserved(y, x);
        if (backed) backing += `M${X} ${Y}h1v1h-1z`;
        // The mine: a round body, spikes across and on the diagonals, and a
        // white glint
        const mine =
          `M${X + 0.5} ${round(Y + 0.5 - r)}a${r} ${r} 0 1 1 0 ${round(2 * r)}a${r} ${r} 0 1 1 0-${round(2 * r)}z` +
          `M${round(X + 0.5 - s2)} ${Y + 0.04}h${SPIKE}v.92h-${SPIKE}zM${X + 0.04} ${round(Y + 0.5 - s2)}h.92v${SPIKE}h-.92z` +
          `M${X + 0.5} ${Y + 0.5}m-.36 -.27l.09-.09l.63 .63l-.09 .09zM${X + 0.5} ${Y + 0.5}m.27 -.36l.09 .09l-.63 .63l-.09-.09z`;
        if (backed) backBombs += mine;
        else bombs += mine;
        // No glint on the finder, timing and alignment patterns: white specks
        // there break up the shapes scanners look for first
        if (!backed)
          glints += `M${round(X + 0.5 - r * 0.45)} ${round(Y + 0.5 - r * 0.45)}h.11v.11h-.11z`;
        continue;
      }
      if (modules.isReserved(y, x) || unit(x, y, 41) > numberRate) continue;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && dark(x + dx, y + dy)) count++;
      if (count)
        numbers += `<path d="${pixelDigit(String(count), X + 0.5, Y + 0.52, 0.72)}" fill="${NUMBER_COLORS[count]}"/>`;
    }
  // Numbers in the margin too, on the tiles touching the code: they're
  // outside the data, so they cost no scans there. None beside the finder
  // patterns, where scanners look for clean light space.
  for (let y = -1; y <= n; y++)
    for (let x = -1; x <= n; x++) {
      if (x >= 0 && y >= 0 && x < n && y < n) continue;
      const nearFinder = (x < 9 && y < 9) || (x >= n - 9 && y < 9) || (x < 9 && y >= n - 9);
      if (nearFinder || unit(x + 50, y + 50, 42) > marginRate) continue;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if (dark(x + dx, y + dy)) count++;
      if (count)
        numbers += `<path d="${pixelDigit(String(count), ox + x + 0.5, oy + y + 0.52, 0.72)}" fill="${NUMBER_COLORS[count]}"/>`;
    }
  // The top panel: the mine counter at the left, the face in the middle and
  // the timer at the right
  const counter = sevenSegment(
      String(Math.min(mines, 999)).padStart(3, "0"),
      boardX + 0.4,
      1.3,
      2.4,
    ),
    timerWidth = sevenSegment("042", 0, 0, 2.4).width,
    timer = sevenSegment("042", boardX + board - 0.4 - timerWidth, 1.3, 2.4),
    fx = frameWidth / 2,
    face =
      `<rect x="${fx - 1.3}" y="1.2" width="2.6" height="2.6" fill="${TILE}"/>` +
      bevel(fx - 1.3, 1.2, 2.6, 2.6, 0.2) +
      `<circle cx="${fx}" cy="2.5" r=".9" fill="#ffe600" stroke="#111" stroke-width=".07"/>` +
      // Crossed-out eyes, as when a mine goes off
      `<path d="M${fx - 0.42} 2.12l.24 .24m0-.24l-.24 .24M${fx + 0.18} 2.12l.24 .24m0-.24l-.24 .24" stroke="#111" stroke-width=".08"/><path d="M${fx - 0.34} 2.98q.34-.3 .68 0" fill="none" stroke="#111" stroke-width=".08"/>`;
  const frame =
    `<rect width="${frameWidth}" height="${frameHeight}" fill="${TILE}"/>` +
    bevel(0, 0, frameWidth, frameHeight, 0.3) +
    bevel(boardX - 0.3, 0.8, board + 0.6, panel - 1.6, 0.18, true) +
    bevel(boardX - 0.3, boardY - 0.3, board + 0.6, board + 0.6, 0.3, true);
  let text = "";
  if (lines.above || lines.below) {
    const em = emFor(lines, board, (row * 0.32) / CAP);
    if (lines.above)
      text += lettering(lines.above, em, frameWidth / 2, panel + (row + CAP * em) / 2);
    if (lines.below)
      text += lettering(
        lines.below,
        em,
        frameWidth / 2,
        boardY + board + (row + CAP * em) / 2 - 0.3,
      );
  }
  return `${svgOpen(size, "white")}<g transform="translate(${left} ${top}) scale(${k})">${frame}${counter.svg}${timer.svg}${face}${raised}<rect x="${bx}" y="${by}" width="${q}" height="${q}" fill="${FIELD}" shape-rendering="crispEdges"/><path d="${revealedLines}" fill="none" stroke="${FIELD_LINE}" stroke-width=".05"/>${numbers}<path d="${backing}" fill="${BACKING}" shape-rendering="crispEdges"/><path d="${backBombs}" fill="${BACKED_MINE}"/><path d="${bombs}" fill="#000"/><path d="${glints}" fill="#fff"/>${text ? `<g fill="#000">${text}</g>` : ""}</g></svg>`;
}
