// Carnival Tent (the scc collection): the Spring Carnival Committee's tent
// (assets/carnival-tent.svg, traced from the committee's own artwork) in the
// middle of a plain black code, as Basic Scotty and Basic Dragon
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The one file to replace with newer artwork: an SVG with a viewBox
const source = readFileSync(join(__dirname, "..", "assets", "carnival-tent.svg"), "utf8").trim();
const box = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(source);
if (!box) throw new Error("assets/carnival-tent.svg needs a viewBox");
// The drawing's box, and its contents for drawing inside a code
export const TENT_WIDTH = Number(box[1]),
  TENT_HEIGHT = Number(box[2]);
export const tent = source.replace(/^(<\?xml[^>]*>\s*)?<svg[^>]*>|<\/svg>\s*$/g, "");
