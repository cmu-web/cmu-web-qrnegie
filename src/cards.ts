// Punch Card (the mjs collection) and Scantron (merichar). Both keep the
// code dark on light, lay out in module units with whole pixels per module
// and letter their own lines inside their designs, so the image stays
// square.
import type { BitMatrix } from "qrcode";
import { CAP, emFor, ems, lettering, round } from "./lettering";
import { PIXEL_FONT, PIXEL_HEIGHT, PIXEL_WIDTH } from "./pixelfont";
import { fit, type Lines } from "./screens";
import { darkAt, svgOpen, unit } from "./boards";

// Characters in the pixel font, `pixel` modules per font pixel, the line's
// left end at x and its top at y; only the rows `from` to `to` of each cell
function pixelText(text: string, x: number, y: number, pixel: number, from = 0, to = PIXEL_HEIGHT) {
  let d = "";
  [...text].forEach((c, i) => {
    const rows = PIXEL_FONT[c] ?? PIXEL_FONT["?"];
    for (let r = from; r < to; r++)
      for (let px = 0; px < PIXEL_WIDTH;) {
        const lit = (at: number) => at < PIXEL_WIDTH && rows[r] & (1 << (PIXEL_WIDTH - 1 - at));
        if (!lit(px)) {
          px++;
          continue;
        }
        let run = 1;
        while (lit(px + run)) run++;
        d += `M${round(x + (i * PIXEL_WIDTH + px) * pixel)} ${round(y + (r - from) * pixel)}h${round(run * pixel)}v${round(pixel)}h-${round(run * pixel)}z`;
        px += run;
      }
  });
  return d;
}

// Tiny printed digits, 3 by 5, a row of bits per line, for a card's and a
// form's small print
const DIGITS: Record<string, number[]> = {
  "0": [7, 5, 5, 5, 7],
  "1": [2, 6, 2, 2, 7],
  "2": [7, 1, 7, 4, 7],
  "3": [7, 1, 3, 1, 7],
  "4": [5, 5, 7, 1, 1],
  "5": [7, 4, 7, 1, 7],
  "6": [7, 4, 7, 5, 7],
  "7": [7, 1, 1, 2, 2],
  "8": [7, 5, 7, 5, 7],
  "9": [7, 5, 7, 1, 7],
};
// A number in tiny digits, `dot` modules per dot, centered on (cx, cy)
function tiny(text: string, cx: number, cy: number, dot: number) {
  const width = text.length * 4 * dot - dot;
  let d = "";
  [...text].forEach((c, i) =>
    DIGITS[c].forEach((row, y) => {
      for (let b = 0; b < 3; b++)
        if (row & (4 >> b))
          d += `M${round(cx - width / 2 + (i * 4 + b) * dot)} ${round(cy - 2.5 * dot + y * dot)}h${round(dot)}v${round(dot)}h-${round(dot)}z`;
    }),
  );
  return d;
}

// Punch Card: an 80-column card in cream stock, stood on end, its corner
// clipped. The card's columns run down it, a code row to a column, and its
// twelve punch rows run across it as lanes, the 0 to 9 lanes printed with
// their digits all the way down. The code is punched through the card: each
// dark module is a punched slot, wider than tall as a card's holes are when
// the card stands on end, showing the dark table behind. Under the code,
// more columns carry punches for other data, and the column numbers run
// down the card's left edge. Text above prints along the card's top edge,
// as a keypunch prints what it punched, and text below along its bottom.
const STOCK = "#f2e7c9",
  STOCK_EDGE = "#d6c79f",
  PRINT = "#b9a77a",
  TYPE = "#3a3226",
  HOLE = "#1d1a16";
// The printing under the code, faint enough that scanners still see the
// code's light modules as light
const UNDER = "#ddcfa6";
// The slots' shape, in modules: a module is `stretch` wide and 1 tall, and
// each slot leaves `gapX` and `gapY` of card between it and the next. With
// `solid` set to "reserved", the finder, timing and alignment patterns are
// punched whole; set to "finders", only the three corner squares.
// `rows` is the card's length in columns, as a share of its width.
export const PUNCH: {
  stretch: number;
  gapX: number;
  gapY: number;
  solid: "reserved" | "finders" | "none";
  length: number;
} = { stretch: 1.3, gapX: 0.16, gapY: 0.2, solid: "finders", length: 1.1 };
// Whether a module is in one of the three corner squares (with its ring)
const inFinder = (n: number, x: number, y: number) =>
  (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
export function punchCard(modules: BitMatrix, size: number, lines: Lines) {
  const { stretch: s, gapX, gapY, solid, length } = PUNCH,
    n = modules.size,
    q = n + 8,
    pad = 1.4,
    typeRow = 2.6,
    top = lines.above ? typeRow : 1.4,
    cardWidth = round(q * s + 2 * pad),
    cardHeight = Math.max(
      Math.round(cardWidth * length),
      Math.ceil(top + q + 6 + (lines.below ? typeRow : 1.4)),
    ),
    span = cardHeight + 1,
    k = fit("punch-card", span, size),
    left = round((size - cardWidth * k) / 2),
    topPx = Math.round((size - cardHeight * k) / 2),
    dark = darkAt(modules),
    ox = pad + 4 * s,
    oy = top + 4,
    clip = 2.6;
  // The card, its top right corner cut
  const card = `<path d="M.4 0H${round(cardWidth - clip)}L${cardWidth} ${clip}V${round(cardHeight - 0.4)}q0 .4-.4 .4H.4q-.4 0-.4-.4V.4q0-.4 .4-.4z" fill="${STOCK}" stroke="${STOCK_EDGE}" stroke-width=".08"/>`;
  // A slot over a module's cell, or the cell whole
  const slot = (x: number, y: number, whole = false) => {
    const gx = whole ? 0 : gapX / 2,
      gy = whole ? 0 : gapY / 2;
    return `M${round(x + gx)} ${round(y + gy)}h${round(s - 2 * gx)}v${round(1 - 2 * gy)}h-${round(s - 2 * gx)}z`;
  };
  let holes = "",
    whole = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (dark(x, y)) {
        if (
          (solid === "reserved" && modules.isReserved(y, x)) ||
          (solid === "finders" && inFinder(n, x, y))
        )
          whole += slot(ox + x * s, oy + y, true);
        else holes += slot(ox + x * s, oy + y);
      }
  // The data's punches vary with the code, the same for the same text:
  // seeded from the code's modules
  let seed = 2166136261;
  for (let i = 0; i < modules.data.length; i++) seed = Math.imul(seed ^ modules.data[i], 16777619);
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // One column's punches, as lanes (0 is row 12, 1 row 11, 2 to 11 the
  // digits 0 to 9): blank, a digit, a letter (a zone and a digit) or a
  // special character (a zone, a digit and an 8)
  const keypunch = (): number[] => {
    const roll = random();
    if (roll < 0.2) return [];
    const digit = Math.floor(random() * 10) + 2;
    if (roll < 0.55) return [digit];
    const zone = [0, 1, 2][Math.floor(random() * 3)],
      letter = zone === digit ? [digit] : [zone, digit];
    if (roll < 0.9) return letter;
    return [...new Set([...letter, 10])];
  };
  // The twelve lanes across the card, the 0 to 9 lanes printed with their
  // digits in every column, a code row to a column
  const laneLeft = pad,
    lane = (cardWidth - 2 * pad) / 12,
    firstRow = top,
    columns = Math.floor(cardHeight - firstRow - (lines.below ? typeRow : 1.4)),
    dot = Math.min(lane * 0.07, 0.11);
  let print = "",
    under = "";
  for (let c = 0; c < columns; c++) {
    const cy = firstRow + c + 0.5,
      inCode = c < q;
    for (let r = 2; r < 12; r++) {
      const digit = tiny(String(r - 2), laneLeft + (r + 0.5) * lane, cy, dot);
      if (inCode) under += digit;
      else print += digit;
    }
    // Data below the quiet zone, as a keypunch codes it: each column a
    // character, a digit punch (0 to 9) with or without a zone punch (12, 11
    // or 0), now and then a third punch in row 8, and some columns blank.
    // Only the lanes within the code's left and right edges are punched.
    if (!inCode)
      for (const r of keypunch()) {
        const x = laneLeft + (r + 0.5) * lane - s / 2;
        if (x >= ox && x + s <= ox + n * s) holes += slot(x, firstRow + c);
      }
    // Column numbers down the left edge
    print += tiny(String(c + 1), pad * 0.5, cy, dot * 0.55);
  }
  // The keypunch's printing: characters along the top and bottom edges
  let type = "";
  const typeLine = (text: string, y: number) => {
    const pixel = Math.min(
      1.5 / PIXEL_HEIGHT,
      (cardWidth - clip - 2) / ([...text].length * PIXEL_WIDTH),
    );
    type += pixelText(text, 1, y, pixel, 1, 13);
  };
  if (lines.above) typeLine(lines.above, 0.6);
  if (lines.below) typeLine(lines.below, cardHeight - typeRow + 0.7);
  return `${svgOpen(size, "white")}<g transform="translate(${left} ${topPx}) scale(${k})">${card}<path d="${under}" fill="${UNDER}"/><path d="${print}" fill="${PRINT}"/><path d="${holes}" fill="${HOLE}"/>${whole ? `<path d="${whole}" fill="${HOLE}" shape-rendering="crispEdges"/>` : ""}${type ? `<path d="${type}" fill="${TYPE}"/>` : ""}</g></svg>`;
}

// Scantron: a machine-scored quiz strip, white with green printing: a
// green header box, rows of bracketed answer bubbles lettered A to E, bold
// row numbers, black timing marks down the left edge and boxes for a name,
// a subject and a date down the right. The code is made of answers: each
// dark module is a bubble filled in solid black. Text above prints white in
// the header box and text below in green under the rows.
const SHEET = "#ffffff",
  GREEN = "#009a6e",
  MARK = "#111111";
// The bubbles inside the code: their color, pale so scanners still see the
// code's light modules as light (in full green, the brackets and letters
// read as dark), and the filled ovals' half width and half height, in
// modules. `solid` is what's filled whole instead of as answers: "anchors"
// the three corner squares and the alignment square, which jsQR needs
// whole; "finders" the corner squares only; "reserved" the timing rows too;
// "none" nothing (no reader decodes that). `timing` puts a timing mark by
// every row, or every few.
export const SHEET_STYLE: {
  bubble: string;
  rx: number;
  ry: number;
  solid: "reserved" | "anchors" | "finders" | "none";
  timing: number;
} = { bubble: "#dcf1e8", rx: 0.47, ry: 0.4, solid: "anchors", timing: 1 };
// A bubble's brackets, around a letter: a left one and a right one, each a
// short upright with feet, as on the printed form
function brackets(cx: number, cy: number) {
  const h = 0.24,
    x0 = cx - 0.42,
    x1 = cx + 0.42,
    foot = 0.07,
    t = 0.045;
  return (
    `M${round(x0)} ${round(cy - h)}h${foot}v${t}h-${round(foot - t)}v${round(2 * h - 2 * t)}h${round(foot - t)}v${t}h-${foot}z` +
    `M${round(x1)} ${round(cy - h)}h-${foot}v${t}h${round(foot - t)}v${round(2 * h - 2 * t)}h-${round(foot - t)}v${t}h${foot}z`
  );
}
export function scantron(modules: BitMatrix, size: number, lines: Lines) {
  const { bubble, rx, ry, solid, timing: every } = SHEET_STYLE,
    n = modules.size,
    q = n + 8,
    edge = 0.8,
    markCol = 2.4,
    numberCol = 2.2,
    sideCol = 3.2,
    head = lines.above ? 4 : 1.6,
    foot = lines.below ? 3.6 : 1,
    width = edge + markCol + numberCol + q + sideCol + edge,
    height = edge + head + q + foot + edge,
    span = Math.max(width, height),
    k = fit("scantron", span, size),
    left = Math.round((size - width * k) / 2),
    top = Math.round((size - height * k) / 2),
    dark = darkAt(modules),
    bx = edge + markCol + numberCol,
    by = edge + head,
    ox = bx + 4,
    oy = by + 4;
  const oval = (cx: number, cy: number, a: number, b: number) =>
    `M${round(cx - a)} ${round(cy)}a${a} ${b} 0 1 0 ${round(2 * a)} 0a${a} ${b} 0 1 0-${round(2 * a)} 0z`;
  let marks = "",
    letters = "",
    filled = "",
    whole = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const cx = ox + x + 0.5,
        cy = oy + y + 0.5;
      if (dark(x, y)) {
        const finder = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7),
          corner = (x < 9 && y < 9) || (x >= n - 8 && y < 9) || (x < 9 && y >= n - 8),
          version = (x < 6 && y >= n - 11) || (y < 6 && x >= n - 11),
          alignment = modules.isReserved(y, x) && !corner && !version && x !== 6 && y !== 6;
        if (
          (solid === "reserved" && modules.isReserved(y, x)) ||
          ((solid === "finders" || solid === "anchors") && finder) ||
          (solid === "anchors" && alignment)
        )
          whole += `M${ox + x} ${oy + y}h1v1h-1z`;
        // A filled answer: black over the brackets, a hair past them
        else filled += oval(cx, cy, rx + (unit(x, y, 140) - 0.5) * 0.02, ry);
        continue;
      }
      marks += brackets(cx, cy);
      letters += lettering("ABCDE"[x % 5], 0.3, cx, cy + 0.11);
    }
  // Bold row numbers beside the block, and black timing marks down the left
  // edge, one for each row of answers
  let numbers = "",
    timing = "";
  for (let y = 0; y < n; y++) {
    numbers += lettering(String(y + 1), 0.62, bx - numberCol / 2 + 0.2, oy + y + 0.73);
    if (every && y % every === 0) timing += `M${edge + 0.3} ${round(oy + y + 0.3)}h1.6v.4h-1.6z`;
  }
  // Column letters over the block, in the header's last row
  let columns = "";
  for (let x = 0; x < n; x++) columns += lettering("ABCDE"[x % 5], 0.5, ox + x + 0.5, by - 0.25);
  // The boxes down the right: name, subject and date, their labels turned
  const sx = bx + q + 0.5,
    sw = sideCol - 0.3,
    boxH = (q - 1) / 3;
  let side = "",
    sideText = "";
  ["NAME", "SUBJECT", "DATE"].forEach((label, i) => {
    const y = by + 0.5 + i * boxH;
    side += `<rect x="${round(sx)}" y="${round(y)}" width="${round(sw)}" height="${round(boxH - 0.3)}" rx=".25" fill="none" stroke="${GREEN}" stroke-width=".09"/><rect x="${round(sx + sw - 1)}" y="${round(y)}" width="1" height="${round(boxH - 0.3)}" fill="${GREEN}"/>`;
    // Turned to read downward, white in the green bar
    sideText += `<g transform="translate(${round(sx + sw - 0.68)} ${round(y + 0.5)}) rotate(90)">${lettering(label, 0.5, (ems(label) * 0.5) / 2, 0)}</g>`;
  });
  let header = "",
    text = "";
  if (lines.above) {
    header = `<rect x="${round(bx)}" y="${edge}" width="${q}" height="${round(head - 1.4)}" rx=".5" fill="${GREEN}"/>`;
    const em = emFor({ above: lines.above }, q - 2, ((head - 1.4) * 0.5) / CAP);
    text += `<g fill="${SHEET}">${lettering(lines.above, em, bx + q / 2, edge + (head - 1.4 + CAP * em) / 2)}</g>`;
  }
  if (lines.below) {
    const em = emFor({ below: lines.below }, q - 2, (foot * 0.45) / CAP);
    text += `<g fill="${GREEN}">${lettering(lines.below, em, bx + q / 2, by + q + (foot + CAP * em) / 2)}</g>`;
  }
  return `${svgOpen(size, "white")}<g transform="translate(${left} ${top}) scale(${k})"><rect width="${round(width)}" height="${round(height)}" rx=".3" fill="${SHEET}" stroke="#d8d8d8" stroke-width=".08"/>${header}<path d="${marks}" fill="${bubble}"/><g fill="${bubble}">${letters}</g><g fill="${GREEN}">${columns}${numbers}</g>${side}<g fill="${SHEET}">${sideText}</g><path d="${timing}" fill="${MARK}"/>${whole ? `<path d="${whole}" fill="${MARK}" shape-rendering="crispEdges"/>` : ""}<path d="${filled}" fill="${MARK}"/>${text}</g></svg>`;
}
