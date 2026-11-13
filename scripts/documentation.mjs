// Keep the Builder and reference pages aligned with the renderer's style facts
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import * as prettier from "prettier";

const require = createRequire(import.meta.url);
const {
  STYLES,
  STYLE_NAMES,
  MIN_MODULE,
  ERROR_CORRECTION,
  STYLE_GROUPS,
  STYLE_DETAILS,
} = require("../dist/style-info.js");
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const ordered = Object.entries(STYLE_GROUPS).flatMap(([group, styles]) =>
  styles.map((id) => ({ group, id })),
);
if (
  ordered.length !== STYLES.length ||
  new Set(ordered.map(({ id }) => id)).size !== STYLES.length ||
  ordered.some(({ id }) => !STYLES.includes(id))
) {
  throw new Error("Each supported style must appear exactly once in STYLE_GROUPS");
}
const gallery = ordered
  .map(
    ({ group, id }) => `<div id="style-${id}">
<img src="images/${id}.png" alt="A ${esc(STYLE_NAMES[id])} QR code." width="1024" height="1024" loading="lazy" />
<p class="cmu-label">${esc(group)}</p><h3>${esc(STYLE_NAMES[id])}</h3>
<p>${esc(STYLE_DETAILS[id].description)}</p>
<p><a class="cta" href="builder.html?style=${id}">Build With ${esc(STYLE_NAMES[id])}</a></p></div>`,
  )
  .join("\n");
const reference = `<table class="alternate cmu-full"><thead><tr><th scope="col">Style</th><th scope="col">Value</th><th scope="col">Error Correction</th><th scope="col">Minimum Pixels per Module</th></tr></thead><tbody>
${ordered.map(({ id }) => `<tr><th scope="row"><a href="styles.html#style-${id}">${esc(STYLE_NAMES[id])}</a></th><td><code>${id}</code></td><td>${ERROR_CORRECTION[id] === "H" ? "High" : "Medium"}</td><td>${MIN_MODULE[id]}</td></tr>`).join("\n")}
</tbody></table>`;
const builder = Object.entries(STYLE_GROUPS)
  .map(
    ([group, styles]) =>
      `<optgroup label="${esc(group)}">${styles.map((id) => `<option value="${id}"${id === "mosaic" ? " selected" : ""} data-text="${esc(STYLE_DETAILS[id].example)}">${esc(STYLE_NAMES[id])}</option>`).join("")}</optgroup>`,
  )
  .join("\n");
let stale = false;
for (const [file, marker, body] of [
  ["docs/styles.html", "styles", gallery],
  ["docs/reference.html", "reference", reference],
  ["docs/builder.html", "builder-styles", builder],
]) {
  const text = readFileSync(file, "utf8");
  const pattern = new RegExp(`<!-- ${marker}:start -->[\\s\\S]*?<!-- ${marker}:end -->`);
  if (!pattern.test(text)) throw new Error(`${file} is missing its ${marker} markers`);
  const next = await prettier.format(
    text.replace(pattern, `<!-- ${marker}:start -->\n${body}\n<!-- ${marker}:end -->`),
    { ...(await prettier.resolveConfig(file)), filepath: file },
  );
  if (next === text) continue;
  if (process.argv.includes("--check")) {
    console.error(`${file}: run npm run docs`);
    stale = true;
  } else writeFileSync(file, next);
}
if (stale) process.exitCode = 1;
else console.log(`ok: Builder and reference pages match all ${STYLES.length} styles`);
