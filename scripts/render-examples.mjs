// Run after npm run build; examples are real codes, not decorative patterns
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { qrImage, qrSvg } = require("../dist/qr.js");
const { STYLES } = require("../dist/styles.js");
const images = new URL("../docs/images/", import.meta.url);
await mkdir(images, { recursive: true });
for (const style of STYLES) {
  await writeFile(
    new URL(`${style}.png`, images),
    await qrImage("https://www.cmu.edu/", style, 1024, "png"),
  );
}
await writeFile(
  new URL("hero.svg", images),
  await qrSvg("https://qrnegie.andrew.cmu.edu/", "mosaic", 1536),
);
console.log(`Rendered ${STYLES.length} styles and the QRnegie hero in ${fileURLToPath(images)}`);
