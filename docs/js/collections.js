// Unlisted styles: the Builder's options, Styles' cards and Reference's rows
// for each collection this browser has opened (js/collection-link.js), from
// the page's <template data-collection> blocks, and the Web Kilt's site bar
// on every page, which says they're showing and closes each collection. Load it
// at the end of the page, before js/qr.js.
(function () {
  "use strict";
  /* collections:start */
  const COLLECTIONS = ["merichar", "mjs", "scc", "thetartan"];
  /* collections:end */
  var COOKIE = "qrnegie-collections",
    list = [],
    all = [];
  try {
    var saved = new RegExp("(?:^|; )" + COOKIE + "=([^;]*)").exec(document.cookie);
    list = saved ? decodeURIComponent(saved[1]).split(",") : [];
    all = list;
  } catch {
    return;
  }
  list = COLLECTIONS.filter(function (key) {
    return list.indexOf(key) >= 0;
  });
  var templates = Array.from(document.querySelectorAll("template[data-collection]"));
  // Every page gets the section, so the reminder goes wherever people do
  if (!list.length) return;
  templates.forEach(function (template) {
    if (list.indexOf(template.dataset.collection) >= 0)
      template.replaceWith(template.content.cloneNode(true));
  });
  document.querySelectorAll("template[data-collections]").forEach(function (template) {
    template.replaceWith(template.content.cloneNode(true));
  });
  // A white gap between collections; the first follows the heading's section
  var gap = document.querySelector("[data-qr-gap]");
  if (gap) gap.remove();
  // The section after the last collection's dark cards gets no rule over its
  // heading, as after any colored section
  var grids = document.querySelectorAll("[data-qr-collection] ~ .grid.darkgrey");
  var after = grids.length && grids[grids.length - 1].nextElementSibling;
  var heading = after && after.querySelector(":scope > div > h2.rule-top:first-child");
  if (heading) heading.classList.remove("rule-top");

  function close(key) {
    // From the whole cookie, so collections this page doesn't know stay;
    // no key closes them all
    var rest =
      key === null
        ? []
        : all.filter(function (k) {
            return k !== key;
          });
    document.cookie =
      COOKIE +
      "=" +
      (rest.length ? encodeURIComponent(rest.join(",")) + "; max-age=31536000" : "; max-age=0") +
      "; path=/; SameSite=Lax" +
      (location.protocol === "https:" ? "; Secure" : "");
    location.reload();
  }

  // Styles: closing a collection's closable section (the Web Kilt's
  // cmu-close event) closes the collection
  document.addEventListener("cmu-close", function (e) {
    var key = e.target.dataset && e.target.dataset.qrCollection;
    if (key) close(key);
  });

  // The Web Kilt's site bar, first in the header: with one collection, a
  // button to close it; with more, Close All and a cta to Styles to choose
  var bar = document.createElement("div"),
    words = document.createElement("p"),
    what = document.createElement("strong"),
    actions = document.createElement("p"),
    button = document.createElement("button");
  bar.className = "cmu-site-bar";
  bar.id = "qr-unlisted";
  what.textContent = "Showing unlisted styles: " + list.join(", ") + ".";
  words.append(what, " They're unlisted, not private: anyone with the link can use them.");
  button.type = "button";
  if (list.length === 1) {
    button.textContent = "Close " + list[0];
    button.addEventListener("click", function () {
      close(list[0]);
    });
    actions.append(button);
  } else {
    var choose = document.createElement("a");
    button.textContent = "Close All";
    button.className = "ghost";
    button.addEventListener("click", function () {
      close(null);
    });
    choose.className = "cta";
    choose.href = "styles.html#unlisted";
    choose.textContent = "Choose Which to Show";
    actions.append(button, choose);
  }
  bar.append(words, actions);
  var header = document.querySelector("#container > header");
  if (header) header.prepend(bar);
})();
