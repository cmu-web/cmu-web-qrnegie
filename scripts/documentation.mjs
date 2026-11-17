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
  COLLECTIONS,
} = require("../dist/style-info.js");
// The live site, for links people send
const SITE = "https://qrnegie.andrew.cmu.edu";
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const listed = Object.entries(STYLE_GROUPS).flatMap(([group, styles]) =>
  styles.map((id) => ({ group, id })),
);
// Unlisted collections: each one's styles, in a template the page shows only
// in a browser that opened ?collection=<key> (js/collections.js)
const unlisted = Object.entries(COLLECTIONS).flatMap(([key, { styles }]) =>
  styles.map((id) => ({ group: key, id, key })),
);
const ordered = [...listed, ...unlisted];
if (
  ordered.length !== STYLES.length ||
  new Set(ordered.map(({ id }) => id)).size !== STYLES.length ||
  ordered.some(({ id }) => !STYLES.includes(id))
) {
  throw new Error("Each supported style must appear exactly once in STYLE_GROUPS or COLLECTIONS");
}
const card = ({ group, id }) => `<div id="style-${id}">
<img src="images/${id}.png" alt="A ${esc(STYLE_NAMES[id])} QR code." width="1024" height="1024" loading="lazy" />
${group ? `<p class="cmu-label">${esc(group)}</p>` : ""}<h3>${esc(STYLE_NAMES[id])}</h3>
<p>${esc(STYLE_DETAILS[id].description)}</p>
<p><a class="cta" href="builder.html?style=${id}">Build With ${esc(STYLE_NAMES[id])}</a></p></div>`;
const row = ({ id }) =>
  `<tr><th scope="row"><a href="styles.html#style-${id}">${esc(STYLE_NAMES[id])}</a></th><td><code>${id}</code></td><td>${ERROR_CORRECTION[id] === "H" ? "High" : "Medium"}</td><td>${MIN_MODULE[id]}</td></tr>`;
const option = (id) =>
  `<option value="${id}"${id === "mosaic" ? " selected" : ""} data-text="${esc(STYLE_DETAILS[id].example)}">${esc(STYLE_NAMES[id])}</option>`;
// One template per collection, holding what each page adds for it
const templates = (body) =>
  Object.entries(COLLECTIONS)
    .map(
      ([key, { styles, description }]) =>
        `<template data-collection="${esc(key)}">${body(key, styles, description)}</template>`,
    )
    .join("\n");
// Styles: the unlisted cards get their own heading, shown with any collection
const gallery = listed.map(card).join("\n");
// After the listed styles' grid: a heading, then each collection as the Web
// Kilt's full-width closable section over a grid of its own cards, the cards
// with no group label since the heading names it. A white gap separates one
// collection from the next. Closing the section closes the collection
// (js/collections.js).
const unlistedGallery = [
  `<template data-collections><div class="content wide"><div><h2 id="unlisted" class="rule-top">Or Choose an Unlisted Style</h2><p>These styles are made for one group. They're unlisted, not private: anyone with a collection's link can use them.</p></div></div></template>`,
  templates(
    (key, styles, description) =>
      `<div class="content wide" data-qr-gap><div></div></div>\n` +
      `<div class="content wide darkgrey invert cmu-closable" data-qr-collection="${esc(key)}"><div><div class="cmu-closable-text"><h3>${esc(key)}</h3><p>${esc(description)}</p></div><button type="button" class="cmu-close" aria-label="Close Collection ${esc(key)}" title="Close Collection ${esc(key)}"></button></div></div>\n` +
      `<div class="content wide darkgrey invert"><div><p>Anyone with this link can use these styles:</p><div class="cmu-copy-row"><pre class="cmu-snippet" id="qr-share-${esc(key)}"><code>${SITE}/styles.html?collection=${esc(key)}#unlisted</code></pre><button class="btn ghost" type="button" data-cmu-copy="#qr-share-${esc(key)}">Copy Link</button></div></div></div>\n` +
      `<div class="grid column3 darkgrey boxes">${styles.map((id) => card({ id })).join("\n")}</div>`,
  ),
].join("\n");
const reference = `<table class="alternate cmu-full"><thead><tr><th scope="col">Style</th><th scope="col">Value</th><th scope="col">Error Correction</th><th scope="col">Minimum Pixels per Module</th></tr></thead><tbody>
${listed.map(row).join("\n")}
${templates((_, styles) => styles.map((id) => row({ id })).join(""))}
</tbody></table>`;
const builder = [
  ...Object.entries(STYLE_GROUPS).map(
    ([group, styles]) =>
      `<optgroup label="${esc(group)}">${styles.map(option).join("")}</optgroup>`,
  ),
  templates(
    (key, styles) =>
      `<optgroup label="Unlisted: ${esc(key)}">${styles.map(option).join("")}</optgroup>`,
  ),
].join("\n");
// The collections' keys, for js/collections.js
const names = `const COLLECTIONS = ${JSON.stringify(Object.keys(COLLECTIONS))};`;
let stale = false;
for (const [file, marker, body] of [
  ["docs/styles.html", "styles", gallery],
  ["docs/styles.html", "unlisted", unlistedGallery],
  ["docs/reference.html", "reference", reference],
  ["docs/builder.html", "builder-styles", builder],
  ["docs/js/collections.js", "collections", names],
]) {
  const text = readFileSync(file, "utf8");
  const [open, close] = file.endsWith(".js") ? ["/* ", " */"] : ["<!-- ", " -->"];
  const pattern = new RegExp(
    `${open.replace("*", "\\*")}${marker}:start${close.replace("*", "\\*")}[\\s\\S]*?${open.replace("*", "\\*")}${marker}:end${close.replace("*", "\\*")}`,
  );
  if (!pattern.test(text)) throw new Error(`${file} is missing its ${marker} markers`);
  const next = await prettier.format(
    text.replace(pattern, `${open}${marker}:start${close}\n${body}\n${open}${marker}:end${close}`),
    { ...(await prettier.resolveConfig(file)), filepath: file },
  );
  if (next === text) continue;
  if (process.argv.includes("--check")) {
    console.error(`${file}: run npm run docs`);
    stale = true;
  } else writeFileSync(file, next);
}
if (stale) process.exitCode = 1;
else
  console.log(
    `ok: Builder and reference pages match all ${STYLES.length} styles (${unlisted.length} unlisted)`,
  );
