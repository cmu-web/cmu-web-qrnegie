import { GLYPHS } from "./glyphs";

// Lines of text drawn as paths, in Open Sans unless a style passes its own
// glyphs, shared by the styles that letter above and below the code
type Glyphs = Record<string, [number, string]>;
// Open Sans's capital height, in ems
export const CAP = 0.714;
export const round = (v: number) => +v.toFixed(2);
// A line's width in ems, and the line drawn in a given em size, centered on
// x with its baseline on y
export const ems = (label: string, glyphs: Glyphs = GLYPHS) =>
  [...label].reduce((width, c) => width + (glyphs[c] ?? GLYPHS[c])[0], 0);
export function lettering(
  label: string,
  em: number,
  x: number,
  y: number,
  glyphs: Glyphs = GLYPHS,
) {
  let at = 0,
    paths = "";
  for (const c of label) {
    const [advance, d] = glyphs[c] ?? GLYPHS[c];
    if (d) paths += `<path transform="translate(${+at.toFixed(4)} 0)" d="${d}"/>`;
    at += advance;
  }
  return `<g transform="translate(${round(x - (at * em) / 2)} ${round(y)}) scale(${+em.toFixed(4)})">${paths}</g>`;
}
// One size for both lines: the widest fits across most of the width
export const emFor = (
  labels: { above?: string; below?: string },
  width: number,
  most: number,
  glyphs: Glyphs = GLYPHS,
) =>
  Math.min(
    most,
    (width * 0.88) / Math.max(...[labels.above, labels.below].map((l) => (l ? ems(l, glyphs) : 0))),
  );
